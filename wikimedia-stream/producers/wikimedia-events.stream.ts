import EventSource from "eventsource";

// Types for Wikimedia RecentChange event data
export interface WikimediaMeta {
  uri: string;
  request_id: string;
  id: string;
  domain: string;
  stream: string;
  dt: string;
  topic: string;
  partition: number;
  offset: number;
}

export interface WikimediaLength {
  old: number;
  new: number;
}

export interface WikimediaRevision {
  old: number;
  new: number;
}

export interface WikimediaEvent {
  $schema: string;
  meta: WikimediaMeta;
  id: number;
  type: string;
  namespace: number;
  title: string;
  title_url: string;
  comment: string;
  timestamp: number;
  user: string;
  bot: boolean;
  notify_url: string;
  server_url: string;
  server_name: string;
  server_script_path: string;
  wiki: string;
  parsedcomment: string;
  minor?: boolean;
  length?: WikimediaLength;
  revision?: WikimediaRevision;
}

import {
  connectProducer,
  disconnectProducer,
} from "./wikimedia-events.producer.js";
import { handleWikimediaEvent } from "../event-handlers/wikimedia-events.handler.js";

const STREAM_URL =
  process.env.WIKIMEDIA_STREAM_URL ??
  "https://stream.wikimedia.org/v2/stream/recentchange";
const TOPIC = process.env.WIKIMEDIA_TOPIC ?? "wikimedia-events";

export async function startWikimediaEventStream(): Promise<void> {
  await connectProducer();

  // Add custom User-Agent header to avoid 403 Forbidden
  const eventSource = new EventSource(STREAM_URL, {
    headers: {
      'User-Agent': 'wikimedia-stream-poc/1.0 (https://github.com/your-org/your-repo)',
      'Accept': 'text/event-stream',
    },
  });
  eventSource.onopen = () => {
    console.log("Connected to Wikimedia event stream");
  }
  eventSource.onmessage = (message: MessageEvent) => {
    if (!message?.data) {
      return;
    }
    try {
      const payload: WikimediaEvent = JSON.parse(message.data);
      // console.log(`Received event:`, payload);
      void handleWikimediaEvent(payload, TOPIC);
    } catch (error) {
      console.error("Failed to process event:", error);
    }
  };

  eventSource.onerror = (error) => {
    console.error("Event stream error:", error);
  };

  const shutdown = async () => {
    eventSource.close();
    await disconnectProducer();
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

if (process.argv[1]?.endsWith("wikimedia-events.stream.ts")) {
  startWikimediaEventStream().catch((error) => {
    console.error("Wikimedia stream producer failed:", error);
    process.exitCode = 1;
  });
}
