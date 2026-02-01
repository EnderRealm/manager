import pino from "pino";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const isProd = process.env.NODE_ENV === "production";

const logsDir = isProd
  ? path.join(os.homedir(), "Library", "Logs", "Manager")
  : path.join(process.cwd(), "logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, isProd ? "server.log" : "manager.log");

const streams: pino.StreamEntry[] = [
  { stream: fs.createWriteStream(logFile, { flags: "a" }) },
];

if (!isProd) {
  streams.unshift({ stream: process.stdout });
}

export const logger = pino(
  {
    level: "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream(streams)
);
