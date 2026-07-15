/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const APP_ROOT = fs.existsSync(path.join(__dirname, "package.json"))
  ? __dirname
  : path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(APP_ROOT, ".env");
  const envVars = {};

  if (!fs.existsSync(envPath)) {
    console.warn(`[ecosystem] .env não encontrado em ${envPath}`);
    return envVars;
  }

  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let val = (match[2] ?? "").trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }

  return envVars;
}

module.exports = {
  apps: [
    {
      name: "x09-studio",
      cwd: APP_ROOT,
      script: "node",
      args: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        ...loadEnv(),
        NODE_ENV: "production",
        PORT: 3001,
        HOSTNAME: "0.0.0.0",
      },
      error_file: "/var/log/x09-studio/error.log",
      out_file: "/var/log/x09-studio/out.log",
      merge_logs: true,
      max_memory_restart: "1G",
      time: true,
    },
  ],
};
