module.exports = {
  apps: [
    {
      name: 'affine-server',
      script: 'packages/backend/server/dist/main.js',
      cwd: '/Users/sliuqin/Projects/github/AFFiNE',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      autorestart: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
