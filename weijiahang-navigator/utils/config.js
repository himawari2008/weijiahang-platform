// ============================================
// 为家航领航员 — 集中配置
// 所有环境相关配置集中管理，方便切换环境
// ============================================

// 环境切换：'dev' | 'prod'
var ENV = 'dev';

// 开发环境（局域网）
var DEV_CONFIG = {
  API_BASE: 'http://127.0.0.1:3001/api/v1',
  WS_BASE: 'ws://127.0.0.1:3001',
};

// 生产环境
var PROD_CONFIG = {
  API_BASE: 'https://api.weijiahang.com/api/v1',
  WS_BASE: 'wss://api.weijiahang.com',
};

var cfg = ENV === 'prod' ? PROD_CONFIG : DEV_CONFIG;

module.exports = {
  /** 当前环境 */
  ENV: ENV,

  /** API 基础地址 */
  API_BASE: cfg.API_BASE,

  /** WebSocket 地址 */
  WS_BASE: cfg.WS_BASE,

  /** 应用版本 */
  APP_VERSION: '1.0.0',

  /** 腾讯地图 Key */
  MAP_KEY: 'PPFBZ-QQTEC-YIX2I-ACDX3-BEQPZ-PXFIR',

  /** 请求超时时间（毫秒） */
  REQUEST_TIMEOUT: 10000,

  /** WebSocket 心跳间隔（毫秒） */
  WS_HEARTBEAT_INTERVAL: 25000,

  /** WebSocket 最大重连次数 */
  WS_MAX_RECONNECT: 10,
};
