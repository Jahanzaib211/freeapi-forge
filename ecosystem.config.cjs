module.exports = {
  apps: [
    {
      name: "redis",
      script: "redis-server",
      args: "--port 6379 --daemonize no",
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 1000,
      env: {
        NODE_ENV: "development",
      },
    },
    {
      name: "forge-studio",
      script: "pnpm",
      args: "dev",
      cwd: "/home/jahanzaib/forge-studio",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: 5051,
        DATABASE_URL: "postgresql://litellm_user:litellm_password_123@localhost:5434/forge_studio",
        REDIS_URL: "redis://localhost:6379/1",
        LITELLM_URL: "http://localhost:5050",
        LITELLM_API_KEY: "sk-ai-lab-master-key",
        JWT_SECRET: "forge-studio-local-secret",
      },
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
