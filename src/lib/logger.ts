import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const LOG_DIR = join(homedir(), ".bare-bones");
const LOG_FILE = join(LOG_DIR, "bare.log");

export async function log(message: string): Promise<void> {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const timestamp = new Date().toISOString();
    await appendFile(LOG_FILE, `[${timestamp}] ${message}\n`);
  } catch (error) {
    // Silently fail - don't break operations if logging fails
    console.error("Failed to write to log:", error);
  }
}

export function getLogPath(): string {
  return LOG_FILE;
}
