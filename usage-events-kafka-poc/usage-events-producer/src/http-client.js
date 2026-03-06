function formatFetchError(error) {
    if (!(error instanceof Error)) {
        return String(error);
    }

    const parts = [];
    const cause = error.cause;

    if (error.name === "AbortError") {
        parts.push("request timeout exceeded");
    }

    if (typeof cause === "object" && cause !== null) {
        const code = typeof cause.code === "string" ? cause.code : undefined;
        const address = typeof cause.address === "string" ? cause.address : undefined;
        const port = typeof cause.port === "number" ? cause.port : undefined;
        const message =
            typeof cause.message === "string" && cause.message.trim().length > 0
                ? cause.message.trim()
                : undefined;

        if (code) {
            parts.push(code);
        }

        if (address && port !== undefined) {
            parts.push(`${address}:${port}`);
        }

        if (message) {
            parts.push(message);
        }
    }

    const baseMessage = error.message?.trim() || "request failed";

    if (parts.length === 0) {
        return baseMessage;
    }

    return `${baseMessage} (${parts.join(" | ")})`;
}

async function buildHttpError(response) {
    const statusText = response.statusText?.trim();
    let details = "";

    try {
        details = (await response.text()).trim();
    } catch {
        details = "";
    }

    if (!details) {
        return statusText ? `HTTP ${response.status} ${statusText}` : `HTTP ${response.status}`;
    }

    const normalized = details.replace(/\s+/g, " ").slice(0, 300);
    return statusText
        ? `HTTP ${response.status} ${statusText} - ${normalized}`
        : `HTTP ${response.status} - ${normalized}`;
}

export async function postUsageEvent({ url, payload, timeoutMs }) {
    const startedAt = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        const endedAt = performance.now();

        return {
            ok: response.ok,
            status: response.status,
            durationMs: endedAt - startedAt,
            error: response.ok ? undefined : await buildHttpError(response),
        };
    } catch (error) {
        const endedAt = performance.now();

        return {
            ok: false,
            status: 0,
            durationMs: endedAt - startedAt,
            error: formatFetchError(error),
        };
    } finally {
        clearTimeout(timeout);
    }
}
