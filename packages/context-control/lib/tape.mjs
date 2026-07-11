// Replay: parse a .ghost/.events NDJSON tape into a session timeline.
// The tape is ground truth — real agents' asks, pulls, and re-gathers.
// Malformed lines are skipped, same posture as ghost pulse.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function readTape(packageDir) {
  let raw;
  try {
    raw = await readFile(join(packageDir, ".events"), "utf-8");
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
  const events = [];
  for (const line of raw.split("\n")) {
    if (line.trim().length === 0) continue;
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed?.ts !== "string") continue;
      if (parsed.event === "gather" && Array.isArray(parsed.menu)) {
        events.push(parsed);
      } else if (parsed.event === "pull" && Array.isArray(parsed.ids)) {
        events.push(parsed);
      }
    } catch {
      // Skip malformed tape lines; replay should still be useful.
    }
  }
  return events;
}

/**
 * Group the flat tape into sessions: a gather opens a session, the pulls
 * that follow (until the next gather) belong to it. Leading orphan pulls
 * form a headless session so nothing on the tape is hidden.
 */
export function toSessions(events) {
  const sessions = [];
  let current = null;
  for (const event of events) {
    if (event.event === "gather") {
      current = { gather: event, pulls: [] };
      sessions.push(current);
    } else {
      if (!current) {
        current = { gather: null, pulls: [] };
        sessions.push(current);
      }
      current.pulls.push(event);
    }
  }
  return sessions;
}
