import { sendJsonEvent } from "../producers/wikimedia-events.producer.js";

type WikimediaEvent = {
  meta?: {
    id?: string | number;
  };
};

export async function handleWikimediaEvent(
  payload: unknown,
  topic: string,
): Promise<void> {
  if (!payload || typeof payload !== "object") {
    console.warn("Skipping non-object event payload");
    return;
  }

  const event = payload as WikimediaEvent;
  const eventKey = event?.meta?.id?.toString() ?? `event-${Date.now()}`;

  await sendJsonEvent(topic, eventKey, payload as object);
}
