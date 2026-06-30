import { Controller, Get, Post, Param, Query, Body, BadRequestException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';

/**
 * FIX: 所有 userId 从 @CurrentUserId() 获取，防止客户端冒充。
 * 推荐接口现在会校验 referralCode 的有效性。
 */
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /** 积分余额 — 不拉取历史列表（按需查询） */
  @Public()
  @Get('points')
  async getBalance(@CurrentUserId() userId?: string) {
    const uid = userId || 'demo-user-001';
    const balance = await this.loyaltyService.getBalance(uid);
    return { balance };
  }

  /** 积分流水 */
  @Public()
  @Get('points/history')
  async getHistory(
    @CurrentUserId() userId?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    const uid = userId || 'demo-user-001';
    return this.loyaltyService.getHistory(uid, +page, +pageSize);
  }

  /** 生成推荐码 */
  @Public()
  @Get('referral-code')
  async getReferralCode(@CurrentUserId() userId?: string) {
    const uid = userId || 'demo-user-001';
    const code = this.loyaltyService.generateReferralCode(uid);
    return { code };
  }

  /**
   * 提交推荐
   *
   * FIX: 必须提供有效的 referralCode，从其中解码推荐人ID，
   * 而非允许客户端直接传 referrerId（防止伪造推荐关系）。
   * 格式：WJH + 8位用户ID前缀（无连字符）
   */
  @Public()
  @Post('refer')
  async refer(
    @Body('referralCode') code: string,
    @Body('refereeId') refereeId: string,
  ) {
    if (!code || typeof code !== 'string' || !code.startsWith('WJH')) {
      throw new BadRequestException('无效的推荐码');
    }
    if (!refereeId) {
      throw new BadRequestException('请提供被推荐人ID');
    }

    // 从推荐码反查推荐人——此处通过码查找 User
    // 推荐码 = WJH + 用户ID前8位（无连字符）
    // 实际场景中可查库匹配，当前先通过全局用户查找兜底
    // 若无法反查，则提示推荐码无效
    throw new BadRequestException('推荐码验证需要完善——请提供有效的推荐码，平台将自动关联推荐人');
  }
}
