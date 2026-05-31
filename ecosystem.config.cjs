module.exports = {
  apps: [
    {
      name: "forge-studio",
      script: "npx",
      args: "tsx --tsconfig tsconfig.json server/_core/index.ts",
      cwd: "/home/jahanzaib/forge-studio",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: 5051,
        DATABASE_URL: "postgresql://litellm_user:litellm_password_123@localhost:5434/forge_studio",
        REDIS_URL: "redis://localhost:6379/1",
        JWT_SECRET: "forge-studio-dev-secret-key-change-in-production",
        ALLOWED_ORIGINS: "http://localhost:5051,http://localhost:3000,http://localhost:8080",
      },
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
