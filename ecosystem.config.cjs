// PM2 config. Start: pm2 start ecosystem.config.cjs && pm2 save
// Single instance on purpose: the in-memory IP limiter and after() background jobs live in this process.
module.exports = {
  apps: [
    {
      name: "rawone-audit",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" }, // Next.js loads .env itself
      max_memory_restart: "600M",
      kill_timeout: 120000, // let running audits finish on reload
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      time: true,
    },
  ],
};
