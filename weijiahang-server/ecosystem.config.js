/**
 * PM2 进程管理配置
 * 用法：
 *   pm2 start ecosystem.config.js
 *   pm2 restart weijiahang-server
 *   pm2 logs weijiahang-server
 *   pm2 monit
 */
module.exports = {
  apps: [
    {
      name: 'weijiahang-server',
      script: './dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3000,
      },
      kill_timeout: 10000,
      listen_timeout: 5000,
      shutdown_with_message: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
    },
  ],
};
