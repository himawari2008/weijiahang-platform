import {
  Controller, Get, Post, Patch, Param, Body, Query, Req,
  UseGuards, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NavigatorsService } from './navigators.service';
import { RegisterNavigatorDto } from './dto/register-navigator.dto';
import { UpdateNavigatorDto } from './dto/update-navigator.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { OrdersService } from '../orders/orders.service';
import { Navigator } from '../../database/entities/navigator.entity';

@ApiTags('领航员')
@Controller('navigators')
export class NavigatorsController {
  constructor(
    private readonly navigatorsService: NavigatorsService,
    private readonly ordersService: OrdersService,
  ) {}

  // ==================== 注册 ====================

  /** 领航员实名注册 */
  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '领航员实名注册', description: '提交实名信息成为领航员，需先微信登录获取JWT' })
  async register(@Req() req: any, @Body() dto: RegisterNavigatorDto) {
    return this.navigatorsService.create(req.user.openid, dto);
  }

  // ==================== 资料 ====================

  /** 获取当前领航员资料 */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取领航员资料', description: '返回当前登录领航员的完整资料' })
  async getProfile(@Req() req: any) {
    const nav = await this.navigatorsService.findByOpenid(req.user.openid);
    if (!nav) return { registered: false, message: '尚未注册为领航员' };
    return nav;
  }

  /** 更新领航员资料 */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新领航员资料', description: '更新头像、手机号、技能等资料' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateNavigatorDto) {
    const nav = await this.getNavOrThrow(req.user.openid);
    return this.navigatorsService.update(nav.id, dto);
  }

  // ==================== 位置 ====================

  /** 更新实时位置 */
  @Post('location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新位置', description: '上报领航员当前GPS位置（含所属市场）' })
  async updateLocation(
    @Req() req: any,
    @Body() body: { latitude: number; longitude: number; marketId?: string },
  ) {
    const nav = await this.getNavOrThrow(req.user.openid);
    await this.navigatorsService.updateLocation(
      nav.id, body.latitude, body.longitude, body.marketId,
    );
    return { success: true };
  }

  // ==================== 上下线 ====================

  /** 切换接单状态 */
  @Post('online')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '切换接单状态', description: '上线/下线，下线时自动取消忙碌' })
  async toggleOnline(@Req() req: any, @Body('isOnline') isOnline: boolean) {
    const nav = await this.getNavOrThrow(req.user.openid);
    await this.navigatorsService.toggleOnline(nav.id, isOnline);
    return { success: true, isOnline };
  }

  // ==================== 订单 ====================

  /** 获取当前领航员的订单列表 */
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '领航员订单列表', description: '按状态筛选，不传status返回全部' })
  @ApiQuery({ name: 'status', required: false, description: '订单筛选状态：pending/accepted/arrived/serving/completed/cancelled' })
  async getOrders(@Req() req: any, @Query('status') status?: string) {
    const nav = await this.navigatorsService.findByOpenid(req.user.openid);
    if (!nav) return [];  // 未注册领航员，返回空列表
    return this.ordersService.findByNavigator(nav.id, status);
  }

  // ==================== 收入 ====================

  /** 收入统计 */
  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '收入统计', description: '返回领航员的收入汇总、订单统计和本月收入' })
  async getEarnings(@Req() req: any) {
    const nav = await this.navigatorsService.findByOpenid(req.user.openid);
    if (!nav) {
      return {
        balance: 0, totalEarned: 0, monthlyIncome: 0,
        totalOrders: 0, completeOrders: 0, rating: 0, statusCounts: {},
      };
    }

    // 获取所有历史订单用于统计
    const allOrders = await this.ordersService.findByNavigator(nav.id);
    const completedOrders = allOrders.filter((o) => o.status === 'completed');

    // 本月已完成订单收入
    const now = new Date();
    const thisMonthIncome = completedOrders
      .filter((o) => {
        const d = new Date(o.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, o) => sum + Number(o.navigatorIncome || 0), 0);

    // 各状态订单数
    const statusCounts: Record<string, number> = {};
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    return {
      balance: nav.balance,               // 当前可提现余额
      totalEarned: nav.totalEarned,       // 累计总收入
      monthlyIncome: thisMonthIncome,     // 本月收入
      totalOrders: nav.totalOrders,       // 总接单数
      completeOrders: nav.completeOrders, // 完成单数
      rating: nav.rating,                 // 评分
      statusCounts,                       // 各状态订单分布
    };
  }

  // ==================== 可用列表（用户端） ====================

  /** 获取某市场可用领航员列表（用户端调用） — 公开 */
  @Public()
  @Get('available/:marketId')
  @ApiOperation({ summary: '可用领航员列表', description: '用户端查看某市场当前可接单的领航员（按评分排序）' })
  async getAvailable(@Param('marketId') marketId: string) {
    return this.navigatorsService.findAvailable(marketId);
  }

  // ==================== 内部辅助 ====================

  /** 根据 openid 查找领航员，不存在则抛 NotFoundException */
  private async getNavOrThrow(openid: string): Promise<Navigator> {
    const nav = await this.navigatorsService.findByOpenid(openid);
    if (!nav) throw new NotFoundException('尚未注册为领航员');
    return nav;
  }
}
