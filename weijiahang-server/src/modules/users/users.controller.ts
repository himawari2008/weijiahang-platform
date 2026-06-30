import {
  Controller, Get, Post, Patch, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('用户')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  async updateProfile(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(id, dto);
  }

  /** 获取当前登录用户信息 */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  /** 更新当前用户信息 */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前用户个人信息' })
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  /** 创建收货地址 */
  @Post('address')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建收货地址' })
  async createAddress(@Req() req: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(req.user.userId, dto);
  }

  /** 获取收货地址列表 */
  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取收货地址列表' })
  async getAddresses(@Req() req: any) {
    return this.usersService.getAddresses(req.user.userId);
  }

  /** 获取收藏列表（type=shop 店铺收藏） */
  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取收藏列表' })
  async getFavorites(@Req() req: any, @Query('type') type?: string) {
    return this.usersService.getFavorites(req.user.userId, type);
  }

  /** 添加收藏 */
  @Post('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加店铺收藏' })
  async addFavorite(@Req() req: any, @Body('shopId') shopId: string) {
    return this.usersService.addFavorite(req.user.userId, shopId);
  }

  /** 删除收藏 */
  @Delete('favorites/:shopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除店铺收藏' })
  async removeFavorite(@Req() req: any, @Param('shopId') shopId: string) {
    await this.usersService.removeFavorite(req.user.userId, shopId);
  }
}
