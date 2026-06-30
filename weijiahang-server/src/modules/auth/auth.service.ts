import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';
import { User } from '../../database/entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 微信小程序登录
   * 1. 调用微信API换取openid
   * 2. 查找或创建用户
   * 3. 签发JWT
   */
  async wxLogin(
    code: string,
    extra?: { avatarUrl?: string; nickname?: string },
  ): Promise<{ accessToken: string; user: User; isNew: boolean }> {
    // 调用微信 code2Session 接口
    const { openid, unionid } = await this.code2Session(code);

    // 查找或创建用户
    let user = await this.userRepo.findOne({ where: { openid } });
    let isNew = false;

    if (!user) {
      user = this.userRepo.create({
        openid,
        unionid,
        nickname: extra?.nickname || `用户${Date.now().toString(36)}`,
        avatarUrl: extra?.avatarUrl || undefined,
      });
      await this.userRepo.save(user);
      isNew = true;
    } else {
      // 更新登录信息和unionid
      if (unionid && !user.unionid) {
        user.unionid = unionid;
      }
      if (extra?.nickname) user.nickname = extra.nickname;
      if (extra?.avatarUrl) user.avatarUrl = extra.avatarUrl;
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    // 签发JWT（包含 tokenVersion 用于强制登出检测）
    const accessToken = this.jwtService.sign({
      sub: user.id,
      openid: user.openid,
      tv: user.tokenVersion,
    });

    return { accessToken, user, isNew };
  }

  /**
   * 商户/管理员 手机号+密码登录
   * - 用户不存在 → 自动注册（首次登录即注册）
   * - 用户已存在 → 验证密码
   * @param phone - 手机号
   * @param password - 明文密码
   * @returns accessToken + user
   */
  async merchantLogin(
    phone: string,
    password: string,
  ): Promise<{ accessToken: string; user: User; isNew: boolean }> {
    // 查找已有用户（需显式 select password 列）
    let user = await this.userRepo
      .createQueryBuilder('user')
      .where('user.phone = :phone', { phone })
      .addSelect('user.password')
      .getOne();

    let isNew = false;

    if (!user) {
      // 新用户：自动注册
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = this.userRepo.create({
        phone,
        password: hashedPassword,
        role: 'merchant',
        nickname: `商户${phone.slice(-4)}`,
      });
      await this.userRepo.save(user);
      isNew = true;
    } else {
      // 已有用户：验证密码
      if (!user.password) {
        throw new UnauthorizedException('该账号未设置密码，请使用微信登录后设置密码');
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('密码错误');
      }
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    // 签发JWT
    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      tv: user.tokenVersion,
    });

    return { accessToken, user, isNew };
  }

  /**
   * 刷新Token
   * 验证用户存在后签发新Token，包含当前 tokenVersion
   */
  async refreshToken(userId: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      openid: user.openid,
      tv: user.tokenVersion,
    });
    return { accessToken };
  }

  /**
   * 强制登出（递增 tokenVersion，使所有旧 token 失效）
   * @param userId - 用户ID
   */
  async forceLogout(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    user.tokenVersion += 1;
    await this.userRepo.save(user);
  }

  /**
   * 获取用户信息
   */
  async getProfile(userId: string): Promise<User> {
    return this.usersService.findById(userId);
  }

  /** 调用微信 code2Session */
  private async code2Session(code: string): Promise<{ openid: string; unionid?: string }> {
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    if (!appid || !secret) {
      // 开发环境：mock openid
      console.warn('[Auth] 未配置微信AppID/Secret，使用Mock模式');
      return { openid: `mock_openid_${code}`, unionid: `mock_unionid_${code}` };
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const { data } = await axios.get(url);

    if (data.errcode) {
      throw new UnauthorizedException(`微信登录失败: ${data.errmsg}`);
    }

    return { openid: data.openid, unionid: data.unionid };
  }

  /** 验证JWT，返回用户信息 */
  async validateUser(userId: string): Promise<User> {
    return this.usersService.findById(userId);
  }
}
