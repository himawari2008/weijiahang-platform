import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WxLoginDto, RefreshTokenDto } from './dto/wx-login.dto';
import { MerchantLoginDto } from './dto/merchant-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CsrfMiddleware } from '../../common/middleware/csrf.middleware';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 获取 CSRF Token — 公开，用于后续 POST/PUT/DELETE 请求 */
  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: '获取CSRF令牌', description: '返回一个防跨站请求伪造的令牌，有效期24小时，后续写请求需在X-CSRF-Token头携带' })
  getCsrfToken() {
    return { token: CsrfMiddleware.generateToken() };
  }

  /** 微信小程序登录 — 公开 */
  @Public()
  @Post('wx-login')
  @ApiOperation({ summary: '微信小程序登录', description: '使用微信临时code登录，新用户自动注册' })
  async wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto.code, {
      avatarUrl: dto.avatarUrl,
      nickname: dto.nickname,
    });
  }

  /** 商户/管理员手机号密码登录 — 公开 */
  @Public()
  @Post('merchant-login')
  @ApiOperation({ summary: '商户登录/注册', description: '使用手机号+密码登录，首次登录自动注册为商户' })
  async merchantLogin(@Body() dto: MerchantLoginDto) {
    const { accessToken, user, isNew } = await this.authService.merchantLogin(
      dto.phone,
      dto.password,
    );
    return { token: accessToken, user: { id: user.id, phone: user.phone, nickname: user.nickname, role: user.role }, isNew };
  }

  /** 获取当前登录用户信息 — 需登录 */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户信息', description: '获取当前登录用户的完整信息' })
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.userId);
  }

  /** 刷新Token — 公开 */
  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新Token', description: '使用用户ID刷新JWT访问令牌' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.userId);
  }
}
