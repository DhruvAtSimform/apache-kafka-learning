import { performance } from "node:perf_hooks";

import { loadConfig } from "./config.js";
import { LoadController } from "./load-controller.js";
import { MetricsTracker } from "./metrics.js";
import { PayloadFactory } from "./payload-factory.js";
import { sleep } from "./utils.js";
import { runWorkerAssignment } from "./worker.js";

function printConfig(config, url) {
    console.log("--- Usage Events Producer ---");
    console.log(`target=${url}`);
    console.log(`organizationId=${config.organizationId}`);
    console.log(`workers=${config.workers}`);
    console.log(`maxEvents=${config.maxEvents}`);
    console.log(`peakRps=${config.peakRps}`);
    console.log(`intervalMs=${config.intervalMs}`);
    console.log(`inflightPerWorker=${config.inflightPerWorker}`);
    console.log(`requestTimeoutMs=${config.requestTimeoutMs}`);
    console.log(`meterProfiles=${JSON.stringify(config.meterProfiles)}`);
    console.log(`customerIdsConfigured=${config.customerIds.length}`);
    console.log("");
}

async function main() {
    const config = loadConfig();
    const targetUrl = new URL(config.ingestPath, config.baseUrl).toString();

    printConfig(config, targetUrl);

    const loadController = new LoadController({
        maxEvents: config.maxEvents,
        peakRps: config.peakRps,
        intervalMs: config.intervalMs,
        workers: config.workers,
    });

    const payloadFactory = new PayloadFactory({
        organizationId: config.organizationId,
        source: config.source,
        customerIds: config.customerIds,
        meterProfiles: config.meterProfiles,
    });

    const startedAtMs = performance.now();
    const metrics = new MetricsTracker({
        startTimeMs: startedAtMs,
        logEveryIterations: config.logEveryIterations,
        verboseFailures: config.verboseFailures,
    });

    let stopRequested = false;

    process.on("SIGINT", () => {
        stopRequested = true;
        console.log("\nSIGINT received. Stopping after current iteration...");
    });

    let nextTickAt = performance.now();

    while (!stopRequested) {
        const plan = loadController.next();

        if (!plan) {
            break;
        }

        const iterationStartedAt = performance.now();
        const workerTasks = plan.assignments.map((assignment) =>
            runWorkerAssignment({
                assignment,
                makePayload: () => payloadFactory.next(),
                url: targetUrl,
                requestTimeoutMs: config.requestTimeoutMs,
                inflightPerWorker: config.inflightPerWorker,
            }),
        );

        const workerResults = await Promise.all(workerTasks);
        const iterationDurationMs = performance.now() - iterationStartedAt;

        metrics.recordIteration({
            iteration: plan.iteration,
            planned: plan.quota,
            workerResults,
            iterationDurationMs,
            totalPlanned: plan.totalPlanned,
        });

        nextTickAt += config.intervalMs;
        const driftAdjustedSleepMs = nextTickAt - performance.now();

        if (driftAdjustedSleepMs > 0) {
            await sleep(driftAdjustedSleepMs);
        }
    }

    metrics.printSummary();
}

main().catch((error) => {
    console.error("Producer failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
