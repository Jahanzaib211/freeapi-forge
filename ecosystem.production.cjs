module.exports = {
  apps: [
    {
      name: "forge-studio",
      script: "node",
      args: "dist/index.js",
      cwd: "/home/jahanzaib/forge-studio",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5051,
      },
      max_restarts: 50,
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,
      min_uptime: 5000,
      kill_timeout: 10000,
      listen_timeout: 15000,
      error_file: "/home/jahanzaib/.pm2/logs/forge-studio-error.log",
      out_file: "/home/jahanzaib/.pm2/logs/forge-studio-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
