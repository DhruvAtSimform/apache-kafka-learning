import { parseArgv, parseBoolean, parseCsv, parseInteger, parseNumber } from "./utils.js";

const seededDefaults = {
    organizationId: "cc0a49ab-e2aa-43b4-bc33-dd0f5366bd10",
    customerId: "4dde02cf-5585-40ac-9285-0f23d7cd8fd0",
};

const defaultMeterProfiles = [
    {
        lookupKey: "token_usage",
        propertyName: "tokens",
        minValue: 10,
        maxValue: 3000,
        decimals: 0,
    },
];

function parseMeterProfiles(rawValue) {
    if (!rawValue) {
        return defaultMeterProfiles;
    }

    try {
        const parsed = JSON.parse(rawValue);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            return defaultMeterProfiles;
        }

        return parsed
            .map((item) => ({
                lookupKey: String(item.lookupKey ?? "").trim(),
                propertyName: String(item.propertyName ?? "").trim(),
                minValue: Number.isFinite(Number(item.minValue)) ? Number(item.minValue) : 1,
                maxValue: Number.isFinite(Number(item.maxValue)) ? Number(item.maxValue) : 100,
                decimals: Number.isFinite(Number(item.decimals)) ? Math.max(0, Math.trunc(Number(item.decimals))) : 0,
            }))
            .filter((item) => item.lookupKey && item.propertyName)
            .map((item) => ({
                ...item,
                maxValue: item.maxValue < item.minValue ? item.minValue : item.maxValue,
            }));
    } catch {
        return defaultMeterProfiles;
    }
}

function ensurePositive(name, value) {
    if (value <= 0) {
        throw new Error(`${name} must be > 0`);
    }
}

export function loadConfig() {
    const argv = parseArgv(process.argv.slice(2));

    const config = {
        baseUrl: argv["base-url"] ?? process.env.BASE_URL ?? "http://localhost:3000",
        ingestPath:
            argv["ingest-path"] ??
            process.env.INGEST_PATH ??
            "/api/v1/usage-events/ingest",
        organizationId:
            argv["organization-id"] ??
            process.env.ORGANIZATION_ID ??
            seededDefaults.organizationId,
        source: argv.source ?? process.env.SOURCE ?? "usage-events-producer",
        workers: parseInteger(argv.workers ?? process.env.WORKERS, 10),
        maxEvents: parseInteger(argv["max-events"] ?? process.env.MAX_EVENTS, 5000),
        peakRps: parseNumber(argv["peak-rps"] ?? process.env.PEAK_RPS, 500),
        intervalMs: parseInteger(argv["interval-ms"] ?? process.env.INTERVAL_MS, 100),
        requestTimeoutMs: parseInteger(
            argv["request-timeout-ms"] ?? process.env.REQUEST_TIMEOUT_MS,
            5000,
        ),
        inflightPerWorker: parseInteger(
            argv["inflight-per-worker"] ?? process.env.INFLIGHT_PER_WORKER,
            10,
        ),
        logEveryIterations: parseInteger(
            argv["log-every-iterations"] ?? process.env.LOG_EVERY_ITERATIONS,
            1,
        ),
        verboseFailures: parseBoolean(
            argv["verbose-failures"] ?? process.env.VERBOSE_FAILURES,
            false,
        ),
        customerIds: parseCsv(
            argv["customer-ids"] ??
            process.env.CUSTOMER_IDS ??
            seededDefaults.customerId,
        ),
        meterProfiles: parseMeterProfiles(
            argv["meter-profiles-json"] ?? process.env.METER_PROFILES_JSON,
        ),
    };

    ensurePositive("workers", config.workers);
    ensurePositive("maxEvents", config.maxEvents);
    ensurePositive("peakRps", config.peakRps);
    ensurePositive("intervalMs", config.intervalMs);
    ensurePositive("requestTimeoutMs", config.requestTimeoutMs);
    ensurePositive("inflightPerWorker", config.inflightPerWorker);

    if (config.logEveryIterations < 1) {
        config.logEveryIterations = 1;
    }

    if (!config.meterProfiles.length) {
        throw new Error("meterProfiles must contain at least one valid profile");
    }

    return config;
}
