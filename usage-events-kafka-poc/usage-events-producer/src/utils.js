export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function percentile(values, p) {
    if (!values.length) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function parseBoolean(value, fallback = false) {
    if (value === undefined) {
        return fallback;
    }

    const normalized = String(value).trim().toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
    }

    return fallback;
}

export function parseNumber(value, fallback) {
    if (value === undefined) {
        return fallback;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

export function parseInteger(value, fallback) {
    const numeric = parseNumber(value, fallback);
    return Number.isInteger(numeric) ? numeric : Math.trunc(numeric);
}

export function parseCsv(value) {
    if (!value) {
        return [];
    }

    return String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export function parseArgv(argv) {
    const options = {};

    for (const entry of argv) {
        if (!entry.startsWith("--")) {
            continue;
        }

        const [key, ...rest] = entry.slice(2).split("=");
        const value = rest.length ? rest.join("=") : "true";
        options[key] = value;
    }

    return options;
}
