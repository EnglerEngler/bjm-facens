#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = process.cwd();
const nextDir = path.join(root, ".next");
const serverDir = path.join(nextDir, "server");
const chunksDir = path.join(serverDir, "chunks");

const syncChunks = () => {
  if (!fs.existsSync(serverDir) || !fs.existsSync(chunksDir)) return;

  const entries = fs.readdirSync(chunksDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const from = path.join(chunksDir, entry.name);
    const to = path.join(serverDir, entry.name);
    try {
      fs.copyFileSync(from, to);
    } catch {
      // ignore transient write race from Next.js build worker
    }
  }
};

fs.rmSync(nextDir, { recursive: true, force: true });

const child = spawn("npx", ["next", "dev", "--port", "3002", "--hostname", "127.0.0.1"], {
  stdio: "inherit",
  shell: true,
});

const timer = setInterval(syncChunks, 500);

const stop = (signal) => {
  clearInterval(timer);
  if (!child.killed) child.kill(signal);
};

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

child.on("exit", (code) => {
  clearInterval(timer);
  process.exit(code ?? 0);
});
