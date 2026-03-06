import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function parseArgv(argv) {
    const options = {};

    for (const entry of argv) {
        if (!entry.startsWith("--")) {
            continue;
        }

        const [key, ...rest] = entry.slice(2).split("=");
        const value = rest.length > 0 ? rest.join("=") : "true";
        options[key] = value;
    }

    return options;
}

function getArg(options, key, fallback) {
    return options[key] ?? fallback;
}

function buildProducerArgs(options) {
    const keys = [
        "organization-id",
        "base-url",
        "ingest-path",
        "source",
        "workers",
        "max-events",
        "peak-rps",
        "interval-ms",
        "request-timeout-ms",
        "inflight-per-worker",
        "log-every-iterations",
        "verbose-failures",
        "customer-ids",
        "meter-profiles-json",
    ];

    return keys
        .filter((key) => options[key] !== undefined)
        .map((key) => `--${key}=${options[key]}`);
}

function startProcess(name, cwd, command, args, envOverrides = {}) {
    const child = spawn(command, args, {
        cwd,
        stdio: "inherit",
        shell: false,
        detached: process.platform !== "win32",
        env: {
            ...process.env,
            ...envOverrides,
        },
    });

    child.on("error", (error) => {
        console.error(`[orchestrator] ${name} failed to start:`, error.message);
    });

    let exited = false;
    const exitPromise = new Promise((resolve) => {
        child.once("exit", (code, signal) => {
            exited = true;
            resolve({ code, signal });
        });
    });

    return {
        name,
        child,
        exitPromise,
        isExited: () => exited,
    };
}

function sendSignalToProcess(processInfo, signal) {
    if (processInfo.isExited()) {
        return;
    }

    const { child, name } = processInfo;

    try {
        if (child.pid === undefined) {
            return;
        }

        if (process.platform === "win32") {
            child.kill(signal);
            return;
        }

        process.kill(-child.pid, signal);
    } catch (error) {
        const code = error && typeof error === "object" ? error.code : undefined;
        if (code !== "ESRCH") {
            console.error(`[orchestrator] failed to send ${signal} to ${name}:`, error);
        }
    }
}

async function waitForApiHealth(baseUrl, timeoutMs, isShuttingDown = () => false) {
    const healthUrl = new URL("/api/v1/health", baseUrl).toString();
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (isShuttingDown()) {
            throw new Error("API health check interrupted by shutdown");
        }

        try {
            const response = await fetch(healthUrl);
            if (response.ok) {
                console.log(`[orchestrator] API is healthy at ${healthUrl}`);
                return;
            }
        } catch {
            // ignore while bootstrapping
        }

        await sleep(500);
    }

    throw new Error(`API health check timed out after ${timeoutMs}ms at ${healthUrl}`);
}

async function main() {
    const options = parseArgv(process.argv.slice(2));

    const baseUrl = getArg(options, "base-url", "http://localhost:8000");
    const producerOptions = {
        ...options,
        "base-url": baseUrl,
    };
    const apiHealthTimeoutMs = Number(getArg(options, "api-health-timeout-ms", "30000"));
    const producerDelayMs = Number(getArg(options, "producer-delay-ms", "0"));
    const shutdownTimeoutMs = Number(getArg(options, "shutdown-timeout-ms", "5000"));
    const forceShutdownTimeoutMs = Number(getArg(options, "force-shutdown-timeout-ms", "2000"));

    const apiDir = path.join(rootDir, "usage-event-api");
    const consumerDir = path.join(rootDir, "usage-events-consumer");
    const producerDir = path.join(rootDir, "usage-events-producer");

    const processes = [];
    let shuttingDown = false;
    let shutdownPromise = null;

    const shutdown = async (signal = "SIGTERM") => {
        if (shutdownPromise) {
            return shutdownPromise;
        }

        shuttingDown = true;
        console.log(`[orchestrator] shutting down all processes (${signal})`);

        shutdownPromise = (async () => {
            for (const processInfo of processes) {
                sendSignalToProcess(processInfo, signal);
            }

            const allExited = Promise.all(processes.map((processInfo) => processInfo.exitPromise));
            const gracefulResult = await Promise.race([
                allExited.then(() => "exited"),
                sleep(shutdownTimeoutMs).then(() => "timeout"),
            ]);

            if (gracefulResult === "timeout") {
                const aliveProcesses = processes.filter((processInfo) => !processInfo.isExited());
                if (aliveProcesses.length > 0) {
                    console.warn(
                        `[orchestrator] forcing shutdown for ${aliveProcesses.length} process(es) with SIGKILL`,
                    );
                    for (const processInfo of aliveProcesses) {
                        sendSignalToProcess(processInfo, "SIGKILL");
                    }

                    await Promise.race([
                        Promise.all(aliveProcesses.map((processInfo) => processInfo.exitPromise)),
                        sleep(forceShutdownTimeoutMs),
                    ]);
                }
            }
        })();

        return shutdownPromise;
    };

    process.on("SIGINT", () => {
        void shutdown("SIGINT");
    });
    process.on("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
    process.on("uncaughtException", (error) => {
        console.error("[orchestrator] uncaught exception:", error);
        process.exitCode = 1;
        void shutdown("SIGTERM");
    });
    process.on("unhandledRejection", (reason) => {
        console.error("[orchestrator] unhandled rejection:", reason);
        process.exitCode = 1;
        void shutdown("SIGTERM");
    });

    console.log("[orchestrator] starting API and consumer...");

    const api = startProcess("usage-event-api", apiDir, "npm", ["run", "dev"]);
    const consumer = startProcess(
        "usage-events-consumer",
        consumerDir,
        "npm",
        ["run", "dev"],
    );

    processes.push(api, consumer);

    let failedDependency = false;

    const onDependencyExit = (name, code, signal) => {
        if (shuttingDown) {
            return;
        }

        failedDependency = true;
        console.error(
            `[orchestrator] ${name} exited early (code=${code ?? "null"}, signal=${signal ?? "null"})`,
        );
        void shutdown("SIGTERM");
    };

    api.exitPromise.then(({ code, signal }) =>
        onDependencyExit("usage-event-api", code, signal),
    );
    consumer.exitPromise.then(({ code, signal }) =>
        onDependencyExit("usage-events-consumer", code, signal),
    );

    let producerExitCode = 1;

    try {
        await waitForApiHealth(baseUrl, apiHealthTimeoutMs, () => shuttingDown);

        if (producerDelayMs > 0) {
            console.log(`[orchestrator] waiting ${producerDelayMs}ms before starting producer...`);
            await sleep(producerDelayMs);
        }
        console.log("[orchestrator] starting producer...", options);
        const producerArgs = ["run", "start", "--", ...buildProducerArgs(producerOptions)];

        console.log(`[orchestrator] starting producer with args: ${producerArgs.slice(3).join(" ") || "(none)"}`);

        const producer = startProcess("usage-events-producer", producerDir, "npm", producerArgs);
        processes.push(producer);

        const producerResult = await producer.exitPromise;
        if (producerResult.signal) {
            console.error(`[orchestrator] producer terminated by signal=${producerResult.signal}`);
        }
        producerExitCode = producerResult.code ?? 1;
    } finally {
        await shutdown("SIGTERM");
    }

    if (failedDependency) {
        process.exitCode = 1;
        return;
    }

    process.exitCode = producerExitCode;
}

main().catch((error) => {
    console.error("[orchestrator] failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
