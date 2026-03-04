#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const serverDir = path.join(root, ".next", "server");
const chunksDir = path.join(serverDir, "chunks");

if (!fs.existsSync(serverDir) || !fs.existsSync(chunksDir)) {
  process.exit(0);
}

const entries = fs.readdirSync(chunksDir, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

  const from = path.join(chunksDir, entry.name);
  const to = path.join(serverDir, entry.name);
  fs.copyFileSync(from, to);
}

