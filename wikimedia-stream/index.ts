import { startWikimediaEventStream } from "./producers/wikimedia-events.stream.js";

startWikimediaEventStream().catch((error) => {
  console.error("Wikimedia stream producer failed:", error);
  process.exitCode = 1;
});