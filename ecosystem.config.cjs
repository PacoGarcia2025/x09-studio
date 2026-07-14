module.exports = {
  apps: [
    {
      name: "x09-studio",
      cwd: "/opt/x09-studio",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        HOSTNAME: "0.0.0.0",
      },
      error_file: "/var/log/x09-studio/error.log",
      out_file: "/var/log/x09-studio/out.log",
      merge_logs: true,
      max_memory_restart: "1G",
    },
  ],
};
