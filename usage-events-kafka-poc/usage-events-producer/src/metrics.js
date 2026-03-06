import { percentile } from "./utils.js";

function mapToObject(map) {
    return Object.fromEntries([...map.entries()].sort(([a], [b]) => Number(a) - Number(b)));
}

export class MetricsTracker {
    constructor({ startTimeMs, logEveryIterations, verboseFailures }) {
        this.startTimeMs = startTimeMs;
        this.logEveryIterations = logEveryIterations;
        this.verboseFailures = verboseFailures;

        this.totalAttempted = 0;
        this.totalSucceeded = 0;
        this.totalFailed = 0;
        this.latencies = [];
        this.statusCounts = new Map();
        this.errorCounts = new Map();
    }

    recordIteration({ iteration, planned, workerResults, iterationDurationMs, totalPlanned }) {
        const attempted = workerResults.reduce((acc, item) => acc + item.attempted, 0);
        const succeeded = workerResults.reduce((acc, item) => acc + item.succeeded, 0);
        const failed = workerResults.reduce((acc, item) => acc + item.failed, 0);

        const iterationLatencies = [];
        const iterationStatuses = new Map();

        for (const result of workerResults) {
            iterationLatencies.push(...result.latencies);

            for (const [status, count] of result.statusCounts.entries()) {
                iterationStatuses.set(status, (iterationStatuses.get(status) ?? 0) + count);
                this.statusCounts.set(status, (this.statusCounts.get(status) ?? 0) + count);
            }

            for (const [message, count] of result.errorCounts.entries()) {
                this.errorCounts.set(message, (this.errorCounts.get(message) ?? 0) + count);
            }
        }

        this.totalAttempted += attempted;
        this.totalSucceeded += succeeded;
        this.totalFailed += failed;
        this.latencies.push(...iterationLatencies);

        const shouldLog = iteration % this.logEveryIterations === 0 || this.totalAttempted === totalPlanned;

        if (shouldLog) {
            const intervalRps = attempted / Math.max(iterationDurationMs / 1000, 0.001);
            const p95 = percentile(iterationLatencies, 95).toFixed(2);
            const line =
                `[iter=${iteration}] planned=${planned} attempted=${attempted} ` +
                `ok=${succeeded} failed=${failed} intervalRps=${intervalRps.toFixed(2)} ` +
                `p95=${p95}ms totalAttempted=${this.totalAttempted}`;

            console.log(line);

            if (this.verboseFailures && failed > 0) {
                console.log(`[iter=${iteration}] statusCounts=${JSON.stringify(mapToObject(iterationStatuses))}`);
            }
        }
    }

    printSummary() {
        const elapsedMs = performance.now() - this.startTimeMs;
        const elapsedSec = Math.max(elapsedMs / 1000, 0.001);
        const throughput = this.totalAttempted / elapsedSec;
        const successRate = (this.totalSucceeded / Math.max(this.totalAttempted, 1)) * 100;

        console.log("\n--- Producer Summary ---");
        console.log(`attempted=${this.totalAttempted}`);
        console.log(`succeeded=${this.totalSucceeded}`);
        console.log(`failed=${this.totalFailed}`);
        console.log(`successRate=${successRate.toFixed(2)}%`);
        console.log(`elapsedSec=${elapsedSec.toFixed(2)}`);
        console.log(`throughputRps=${throughput.toFixed(2)}`);
        console.log(`latencyAvgMs=${(this.latencies.reduce((a, b) => a + b, 0) / Math.max(this.latencies.length, 1)).toFixed(2)}`);
        console.log(`latencyP95Ms=${percentile(this.latencies, 95).toFixed(2)}`);
        console.log(`latencyP99Ms=${percentile(this.latencies, 99).toFixed(2)}`);
        console.log(`statusCounts=${JSON.stringify(mapToObject(this.statusCounts))}`);

        if (this.totalFailed > 0) {
            const topErrors = [...this.errorCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            console.log(`topErrors=${JSON.stringify(topErrors)}`);
        }
    }
}
