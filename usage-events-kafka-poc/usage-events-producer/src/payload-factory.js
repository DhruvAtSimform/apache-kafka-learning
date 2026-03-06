import { randomUUID } from "node:crypto";

export class PayloadFactory {
    constructor({ organizationId, source, customerIds, meterProfiles }) {
        this.organizationId = organizationId;
        this.source = source;
        this.customerIds = customerIds;
        this.meterProfiles = meterProfiles;

        this.customerCursor = 0;
        this.meterCursor = 0;
    }

    next() {
        const meterProfile = this.meterProfiles[this.meterCursor % this.meterProfiles.length];
        this.meterCursor += 1;

        const rawValue =
            Math.random() * (meterProfile.maxValue - meterProfile.minValue) +
            meterProfile.minValue;

        const value = Number(rawValue.toFixed(meterProfile.decimals));

        const payload = {
            organizationId: this.organizationId,
            metricLookupKey: meterProfile.lookupKey,
            idempotencyKey: randomUUID(),
            source: this.source,
            timestamp: new Date().toISOString(),
            properties: {
                [meterProfile.propertyName]: value,
            },
        };

        if (this.customerIds.length > 0) {
            payload.customerId = this.customerIds[this.customerCursor % this.customerIds.length];
            this.customerCursor += 1;
        }

        return payload;
    }
}
