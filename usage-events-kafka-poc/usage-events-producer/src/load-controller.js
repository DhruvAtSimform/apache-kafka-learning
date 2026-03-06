export class LoadController {
    constructor({ maxEvents, peakRps, intervalMs, workers }) {
        this.maxEvents = maxEvents;
        this.peakRps = peakRps;
        this.intervalMs = intervalMs;
        this.workers = workers;

        this.remainder = 0;
        this.totalPlanned = 0;
        this.iteration = 0;
    }

    next() {
        if (this.totalPlanned >= this.maxEvents) {
            return null;
        }

        const rawQuota = (this.peakRps * this.intervalMs) / 1000 + this.remainder;
        let quota = Math.floor(rawQuota);
        this.remainder = rawQuota - quota;

        if (quota <= 0) {
            quota = 1;
            this.remainder = 0;
        }

        quota = Math.min(quota, this.maxEvents - this.totalPlanned);

        const baseShare = Math.floor(quota / this.workers);
        const extra = quota % this.workers;
        const assignments = Array.from({ length: this.workers }, (_, index) =>
            baseShare + (index < extra ? 1 : 0),
        );

        this.totalPlanned += quota;
        this.iteration += 1;

        return {
            iteration: this.iteration,
            quota,
            assignments,
            totalPlanned: this.totalPlanned,
        };
    }
}
