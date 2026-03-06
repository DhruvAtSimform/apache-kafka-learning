import { postUsageEvent } from "./http-client.js";

function makeEmptyWorkerResult() {
    return {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        latencies: [],
        statusCounts: new Map(),
        errorCounts: new Map(),
    };
}

function mergeCount(map, key) {
    const current = map.get(key) ?? 0;
    map.set(key, current + 1);
}

function mergeWorkerResult(target, source) {
    target.attempted += source.attempted;
    target.succeeded += source.succeeded;
    target.failed += source.failed;
    target.latencies.push(...source.latencies);

    for (const [status, count] of source.statusCounts.entries()) {
        target.statusCounts.set(status, (target.statusCounts.get(status) ?? 0) + count);
    }

    for (const [message, count] of source.errorCounts.entries()) {
        target.errorCounts.set(message, (target.errorCounts.get(message) ?? 0) + count);
    }

    return target;
}

async function runChunk({ count, makePayload, url, requestTimeoutMs }) {
    const result = makeEmptyWorkerResult();

    const tasks = Array.from({ length: count }, () => {
        const payload = makePayload();
        return postUsageEvent({
            url,
            payload,
            timeoutMs: requestTimeoutMs,
        });
    });

    const settled = await Promise.allSettled(tasks);

    for (const item of settled) {
        result.attempted += 1;

        if (item.status === "fulfilled") {
            const value = item.value;
            result.latencies.push(value.durationMs);

            if (value.ok) {
                result.succeeded += 1;
            } else {
                result.failed += 1;
                mergeCount(result.errorCounts, value.error ?? "request_failed");
            }

            mergeCount(result.statusCounts, value.status);
            continue;
        }

        result.failed += 1;
        mergeCount(result.statusCounts, 0);
        mergeCount(
            result.errorCounts,
            item.reason instanceof Error ? item.reason.message : String(item.reason),
        );
    }

    return result;
}

export async function runWorkerAssignment({
    assignment,
    makePayload,
    url,
    requestTimeoutMs,
    inflightPerWorker,
}) {
    if (assignment <= 0) {
        return makeEmptyWorkerResult();
    }

    const aggregate = makeEmptyWorkerResult();

    for (let offset = 0; offset < assignment; offset += inflightPerWorker) {
        const size = Math.min(inflightPerWorker, assignment - offset);
        const chunkResult = await runChunk({
            count: size,
            makePayload,
            url,
            requestTimeoutMs,
        });

        mergeWorkerResult(aggregate, chunkResult);
    }

    return aggregate;
}
