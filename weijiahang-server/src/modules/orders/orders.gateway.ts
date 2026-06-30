import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WsJwtAuthGuard } from '../../common/guards/ws-jwt-auth.guard';

/**
 * 订单实时通信网关
 * 三层映射: user/navigator sockets + 市场房间
 * 用户端：接收领航员位置 + 订单状态变更
 * 领航员端：上报位置 + 接收新订单通知 + 疲劳提醒
 * 商户端：接收新订单通知
 *
 * WebSocket 连接认证：
 *   连接时需附带 ?token=jwt_token，网关会验证 JWT 有效性
 */
@WebSocketGateway({
  namespace: '/orders',
  cors: { origin: '*', credentials: true },
  pingInterval: 25000,
  pingTimeout: 60000,
  connectTimeout: 10000,
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(OrdersGateway.name);

  // JWT 认证守卫
  private wsAuthGuard: WsJwtAuthGuard;

  // 三层映射
  private userSockets = new Map<string, string>();
  private navigatorSockets = new Map<string, string>();
  private socketToNav = new Map<string, string>();
  private marketRooms = new Map<string, Set<string>>();
  private orderNavMap = new Map<string, string>();
  private orderUserMap = new Map<string, string>();

  private authenticatedSockets = new Set<string>();

  /** 由 NestJS 注入 WsJwtAuthGuard（通过 module providers） */
  constructor(wsAuthGuard: WsJwtAuthGuard) {
    this.wsAuthGuard = wsAuthGuard;
  }

  handleConnection(client: Socket) {
    const { type, id, marketId, token } = client.handshake.query;

    // ===== JWT Token 验证 =====
    const tokenStr = token as string | undefined;
    if (tokenStr) {
      try {
        const payload = this.wsAuthGuard.validateToken(tokenStr);
        client.data.user = payload; // 存储解析后的用户信息
        this.authenticatedSockets.add(client.id);
        this.logger.log(`WS 认证成功: ${payload.sub}`);
      } catch (err: any) {
        this.logger.warn(`WS 认证失败: ${err.message}`);
        client.emit('error', { message: '认证失败：请先登录' });
        client.disconnect();
        return;
      }
    } else {
      // 允许未认证连接（向后兼容），但记录日志
      this.logger.debug(`WS 未认证连接: type=${type}, id=${id}`);
    }

    // ===== 注册映射 =====
    if (type === 'user' && id) {
      this.userSockets.set(id as string, client.id);
      this.logger.log(`用户上线: ${id}`);
    } else if (type === 'navigator' && id) {
      this.navigatorSockets.set(id as string, client.id);
      this.socketToNav.set(client.id, id as string);
      this.logger.log(`领航员上线: ${id}`);
      if (marketId) {
        this.joinMarketRoom(client, id as string, marketId as string);
      }
    } else if (type === 'shop' && id) {
      this.userSockets.set(`shop_${id}`, client.id);
      this.logger.log(`商户上线: ${id}`);
    }
  }

  handleDisconnect(client: Socket) {
    // 清理认证记录
    this.authenticatedSockets.delete(client.id);

    // 清理用户/商户映射
    this.userSockets.forEach((sid, uid) => {
      if (sid === client.id) this.userSockets.delete(uid);
    });
    // 清理领航员映射
    const navId = this.socketToNav.get(client.id);
    if (navId) {
      this.navigatorSockets.delete(navId);
      this.socketToNav.delete(client.id);
      this.marketRooms.forEach((navs, marketId) => {
        navs.delete(navId);
        if (navs.size === 0) this.marketRooms.delete(marketId);
      });
      this.logger.log(`领航员下线: ${navId}`);
    }
  }

  // ===== 客户端→服务器 事件 =====

  /**
   * 领航员加入市场房间
   */
  @SubscribeMessage('navigator:join_market')
  handleJoinMarket(client: Socket, data: { navigatorId: string; marketId: string }) {
    this.joinMarketRoom(client, data.navigatorId, data.marketId);
  }

  /**
   * 领航员离开市场房间
   */
  @SubscribeMessage('navigator:leave_market')
  handleLeaveMarket(client: Socket, data: { navigatorId: string; marketId: string }) {
    client.leave(`market:${data.marketId}`);
    const room = this.marketRooms.get(data.marketId);
    room?.delete(data.navigatorId);
    this.logger.log(`领航员 ${data.navigatorId} 离开市场 ${data.marketId}`);
  }

  /**
   * 领航员上报位置 → 推送给关联订单的用户
   */
  @SubscribeMessage('navigator:location')
  handleLocationUpdate(client: Socket, data: {
    orderId: string; navigatorId: string;
    latitude: number; longitude: number; speed?: number; accuracy?: number;
  }) {
    const userId = this.orderUserMap.get(data.orderId);
    if (userId) {
      const userSocket = this.userSockets.get(userId);
      if (userSocket) {
        this.server.to(userSocket).emit('order:location', {
          orderId: data.orderId,
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed || 0,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * 领航员心跳
   */
  @SubscribeMessage('navigator:heartbeat')
  handleHeartbeat(client: Socket, _data: { navigatorId: string; isOnline: boolean; onlineMinutes?: number }) {
    client.emit('server:heartbeat_ack', { timestamp: Date.now() });
  }

  /**
   * 绑定订单与用户的映射关系
   */
  @SubscribeMessage('order:bind_user')
  handleBindUser(client: Socket, data: { orderId: string; userId: string }) {
    this.orderUserMap.set(data.orderId, data.userId);
  }

  /**
   * 领航员绑定订单
   */
  @SubscribeMessage('navigator:bind_order')
  handleBindOrder(client: Socket, data: { orderId: string; navigatorId: string }) {
    this.orderNavMap.set(data.orderId, data.navigatorId);
  }

  // ===== 服务器→客户端 推送方法 =====

  /**
   * 新订单广播到市场内所有在线领航员（带15秒倒计时）
   */
  notifyNewOrder(order: any, marketId: string) {
    const expireAt = Date.now() + 15000; // 15秒抢单窗口
    this.server.to(`market:${marketId}`).emit('order:new', {
      id: order.id,
      orderNo: order.orderNo || order.orderNo,
      serviceType: order.serviceType,
      title: order.title,
      description: order.description,
      amount: order.amount,
      navigatorIncome: order.navigatorIncome,
      targetShops: order.targetShops,
      shops: order.targetShops?.length || 1,
      expireAt,
      createdAt: order.createdAt || new Date().toISOString(),
    });
    this.logger.log(`新订单 ${order.orderNo || order.id} 已广播到市场 ${marketId}`);
  }

  /**
   * 系统指派订单给特定领航员
   */
  assignOrder(navigatorId: string, order: any, score: number, reasons: string[]) {
    const socketId = this.navigatorSockets.get(navigatorId);
    if (socketId) {
      this.orderNavMap.set(order.id, navigatorId);
      this.server.to(socketId).emit('order:assigned', {
        id: order.id,
        orderNo: order.orderNo,
        serviceType: order.serviceType,
        title: order.title,
        description: order.description,
        amount: order.amount,
        navigatorIncome: order.navigatorIncome,
        score,
        reasons,
        expireAt: Date.now() + 30000, // 30秒确认
      });
    }
  }

  /**
   * 订单已被抢走通知
   */
  notifyOrderTaken(marketId: string, orderId: string) {
    this.server.to(`market:${marketId}`).emit('order:timeout', { orderId });
  }

  /**
   * 订单状态变更推送给用户
   */
  notifyOrderStatus(userId: string, orderId: string, status: string, extra?: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('order:status', { orderId, status, ...extra });
    }
  }

  /**
   * 顺路单推荐
   */
  notifyMergeCandidate(navigatorId: string, newOrder: any, activeOrder: any, matchScore: number) {
    const socketId = this.navigatorSockets.get(navigatorId);
    if (socketId) {
      this.server.to(socketId).emit('order:merge', {
        newOrder: {
          id: newOrder.id, orderNo: newOrder.orderNo,
          description: newOrder.description, amount: newOrder.amount,
        },
        activeOrder: {
          id: activeOrder.id, orderNo: activeOrder.orderNo,
          description: activeOrder.description,
        },
        matchScore,
        savings: '顺路可省5分钟',
      });
    }
  }

  /**
   * 系统公告
   */
  broadcastAnnouncement(message: string, marketId?: string) {
    if (marketId) {
      this.server.to(`market:${marketId}`).emit('system:announce', { message, timestamp: Date.now() });
    } else {
      this.server.emit('system:announce', { message, timestamp: Date.now() });
    }
  }

  /**
   * 疲劳提醒
   */
  notifyFatigueWarning(navigatorId: string, type: 'rest_reminder' | 'force_offline', message: string) {
    const socketId = this.navigatorSockets.get(navigatorId);
    if (socketId) {
      const event = type === 'rest_reminder' ? 'system:fatigue' : 'system:force_offline';
      this.server.to(socketId).emit(event, { message, timestamp: Date.now() });
    }
  }

  /**
   * 新订单通知商户端
   */
  notifyMerchantNewOrder(shopId: string, order: any) {
    const socketId = this.userSockets.get(`shop_${shopId}`);
    if (socketId) {
      this.server.to(socketId).emit('order:new', order);
    }
  }

  // ===== 公开查询方法 =====

  /** 获取市场在线领航员数量 */
  getOnlineCount(marketId: string): number {
    return this.marketRooms.get(marketId)?.size || 0;
  }

  /** 检查领航员是否在线 */
  isNavigatorOnline(navId: string): boolean {
    return this.navigatorSockets.has(navId);
  }

  /** 获取用户socketId */
  getUserSocket(userId: string): string | undefined {
    return this.userSockets.get(userId);
  }

  /** 获取领航员socketId */
  getNavigatorSocket(navId: string): string | undefined {
    return this.navigatorSockets.get(navId);
  }

  /** 获取订单关联的领航员 */
  getOrderNavigator(orderId: string): string | undefined {
    return this.orderNavMap.get(orderId);
  }

  /** 获取市场内所有在线领航员ID列表 */
  getMarketNavigators(marketId: string): string[] {
    const navs = this.marketRooms.get(marketId);
    return navs ? Array.from(navs) : [];
  }

  // ===== 私有方法 =====

  private joinMarketRoom(client: Socket, navId: string, marketId: string) {
    client.join(`market:${marketId}`);
    if (!this.marketRooms.has(marketId)) {
      this.marketRooms.set(marketId, new Set());
    }
    this.marketRooms.get(marketId)!.add(navId);
    this.logger.log(`领航员 ${navId} 加入市场 ${marketId}`);
  }
}
