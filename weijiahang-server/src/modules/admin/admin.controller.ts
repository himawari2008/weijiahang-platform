import {
  Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Req, ParseBoolPipe,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('管理后台')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, IpWhitelistGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== 管理员认证 ====================

  @Public()
  @Post('login')
  @ApiOperation({ summary: '管理员登录', description: '用户名+密码登录，返回 JWT Token' })
  async login(@Body() dto: { username: string; password: string }) {
    return this.adminService.login(dto.username, dto.password);
  }

  // ==================== 仪表盘 ====================

  @Get('dashboard')
  @ApiOperation({ summary: '运营数据大盘', description: '获取平台运营核心指标' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('pending-tasks')
  @ApiOperation({ summary: '待办任务汇总', description: '获取待审核/待处理任务列表' })
  async getPendingTasks() {
    return this.adminService.getPendingTasks();
  }

  // ==================== 店铺审核 ====================

  @Post('shops')
  @ApiOperation({ summary: '创建店铺（种子数据/测试用）' })
  async createShop(@Body() dto: any) {
    return this.adminService.createShop(dto);
  }

  @Get('shops/pending')
  @ApiOperation({ summary: '待审核店铺列表', description: '获取所有待审核的店铺（分页）' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  async getPendingShops(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.adminService.getPendingShops(page, pageSize);
  }

  @Post('shops/:id/approve')
  @ApiOperation({ summary: '审核店铺', description: '通过或驳回店铺入驻申请' })
  async approveShop(
    @Param('id') shopId: string,
    @Body('approved', ParseBoolPipe) approved: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.approveShop(shopId, approved, reason);
  }

  /** PUT 别名 — 前端 api.js 使用 PUT 方法 */
  @Put('shops/:id/verify')
  @ApiOperation({ summary: '审核店铺（PUT别名）', description: '与 POST approve 功能相同，适配前端调用' })
  async verifyShop(
    @Param('id') shopId: string,
    @Body('approved', ParseBoolPipe) approved: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.approveShop(shopId, approved, reason);
  }

  // ==================== 领航员审核 ====================

  @Get('navigators/pending')
  @ApiOperation({ summary: '待审核领航员列表', description: '获取所有待审核的领航员（分页）' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  async getPendingNavigators(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.adminService.getPendingNavigators(page, pageSize);
  }

  @Post('navigators')
  @ApiOperation({ summary: '创建领航员（种子数据/测试用）' })
  async createNavigator(@Body() dto: any) {
    return this.adminService.createNavigator(dto);
  }

  @Post('navigators/:id/approve')
  @ApiOperation({ summary: '审核领航员', description: '通过或驳回领航员入驻申请' })
  async approveNavigator(
    @Param('id') navId: string,
    @Body('approved', ParseBoolPipe) approved: boolean,
  ) {
    return this.adminService.approveNavigator(navId, approved);
  }

  /** PUT 别名 — 前端 api.js 使用 PUT 方法 */
  @Put('navigators/:id/verify')
  @ApiOperation({ summary: '审核领航员（PUT别名）', description: '与 POST approve 功能相同，适配前端调用' })
  async verifyNavigator(
    @Param('id') navId: string,
    @Body('approved', ParseBoolPipe) approved: boolean,
  ) {
    return this.adminService.approveNavigator(navId, approved);
  }

  // ==================== 用户管理 ====================

  @Get('users')
  @ApiOperation({ summary: '用户列表', description: '分页查询平台用户列表，支持关键字搜索' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'keyword', required: false, description: '搜索关键字（昵称/手机号/姓名）' })
  async getUserList(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.adminService.getUserList(page, pageSize, keyword);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: '更新用户状态', description: '启用或禁用用户账号' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status', ParseIntPipe) status: number,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  // ==================== 财务管理 ====================

  @Get('finance')
  @ApiOperation({ summary: '财务概览', description: '获取平台收入、领航员待结算等财务数据' })
  async getFinanceOverview() {
    return this.adminService.getFinanceOverview();
  }

  @Get('finance/overview')
  @ApiOperation({ summary: '财务概览（别名）', description: '同上，适配前端调用' })
  async getFinanceOverviewAlias() {
    return this.adminService.getFinanceOverview();
  }

  @Get('finance/records')
  @ApiOperation({ summary: '财务记录列表', description: '分页查询平台财务交易记录' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'type', required: false })
  async getFinanceRecords(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('type') type?: string,
  ) {
    return this.adminService.getFinanceRecords(page, pageSize, type);
  }

  @Put('finance/withdraw/:id')
  @ApiOperation({ summary: '处理提现', description: '批准或拒绝领航员提现申请' })
  async processWithdraw(
    @Param('id') id: string,
    @Body('approved', ParseBoolPipe) approved: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.processWithdraw(id, approved, reason);
  }

  // ==================== 结算审核 ====================

  @Get('settlements')
  @ApiOperation({ summary: '结算列表', description: '获取待审核的结算记录列表' })
  async getSettlements(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.adminService.getSettlements(page || 1, pageSize || 20);
  }

  @Put('settlements/:id/approve')
  @ApiOperation({ summary: '批准结算' })
  async approveSettlement(@Param('id') id: string) {
    return this.adminService.approveSettlement(id);
  }

  @Put('settlements/:id/reject')
  @ApiOperation({ summary: '驳回结算' })
  async rejectSettlement(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectSettlement(id, reason);
  }

  @Post('settlements/batch-pay')
  @ApiOperation({ summary: '批量打款', description: '批量支付已批准的结算' })
  async batchPaySettlements(@Body('ids') ids: string[]) {
    return this.adminService.batchPaySettlements(ids);
  }

  // ==================== 订单纠纷 ====================

  @Post('orders')
  @ApiOperation({ summary: '创建订单（种子数据/测试用）' })
  async createOrder(@Body() dto: any) {
    return this.adminService.createOrder(dto);
  }

  @Get('orders/disputes')
  @ApiOperation({ summary: '纠纷订单列表' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  async getDisputes(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.adminService.getDisputes(page, pageSize);
  }

  @Put('orders/:id/dispute')
  @ApiOperation({ summary: '仲裁纠纷', description: '管理员裁决订单纠纷' })
  async resolveDispute(@Param('id') id: string, @Body() resolution: any) {
    return this.adminService.resolveDispute(id, resolution);
  }

  // ==================== 广告管理 ====================

  @Get('ads')
  @ApiOperation({ summary: '广告列表' })
  async getAdList(@Query() query: any) {
    return this.adminService.getAdList(query);
  }

  @Post('ads')
  @ApiOperation({ summary: '创建广告' })
  async createAd(@Body() dto: any) {
    return this.adminService.createAd(dto);
  }

  @Put('ads/:id')
  @ApiOperation({ summary: '更新广告' })
  async updateAd(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateAd(id, dto);
  }

  @Delete('ads/:id')
  @ApiOperation({ summary: '删除广告' })
  async deleteAd(@Param('id') id: string) {
    return this.adminService.deleteAd(id);
  }

  // ==================== 营销管理 ====================

  @Get('marketing')
  @ApiOperation({ summary: '营销活动列表' })
  async getMarketingList(@Query() query: any) {
    return this.adminService.getMarketingList(query);
  }

  @Post('marketing')
  @ApiOperation({ summary: '创建营销活动' })
  async createMarketing(@Body() dto: any) {
    return this.adminService.createMarketing(dto);
  }

  @Put('marketing/:id')
  @ApiOperation({ summary: '更新营销活动' })
  async updateMarketing(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateMarketing(id, dto);
  }

  @Delete('marketing/:id')
  @ApiOperation({ summary: '删除营销活动' })
  async deleteMarketing(@Param('id') id: string) {
    return this.adminService.deleteMarketing(id);
  }

  // ==================== 评价审核 ====================

  @Get('reviews')
  @ApiOperation({ summary: '评价列表', description: '查询全平台评价' })
  async getReviews(@Query() query: any) {
    return this.adminService.getReviews(query);
  }

  @Put('reviews/:id')
  @ApiOperation({ summary: '评价审核', description: '隐藏/显示/标记评价' })
  async moderateReview(@Param('id') id: string, @Body('action') action: string) {
    return this.adminService.moderateReview(id, action);
  }

  // ==================== 信标管理 ====================

  @Get('beacons')
  @ApiOperation({ summary: '信标列表' })
  async getBeacons(@Query() query: any) {
    return this.adminService.getBeacons(query);
  }

  @Post('beacons')
  @ApiOperation({ summary: '创建信标' })
  async createBeacon(@Body() dto: any) {
    return this.adminService.createBeacon(dto);
  }

  @Put('beacons/:id')
  @ApiOperation({ summary: '更新信标' })
  async updateBeacon(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateBeacon(id, dto);
  }

  @Delete('beacons/:id')
  @ApiOperation({ summary: '删除信标' })
  async deleteBeacon(@Param('id') id: string) {
    return this.adminService.deleteBeacon(id);
  }

  // ==================== 系统配置 ====================

  @Get('system-config')
  @ApiOperation({ summary: '获取系统配置' })
  async getSystemConfig() {
    return this.adminService.getSystemConfig();
  }

  @Put('system-config')
  @ApiOperation({ summary: '更新系统配置' })
  async updateSystemConfig(@Body() config: any) {
    return this.adminService.updateSystemConfig(config);
  }

  // ==================== 缓存 & 搜索运维 ====================

  @Post('cache/clear')
  @ApiOperation({ summary: '清除缓存', description: '清除 Redis 应用缓存' })
  async clearCache() {
    return this.adminService.clearCache();
  }

  @Post('search/rebuild-index')
  @ApiOperation({ summary: '重建搜索索引' })
  async rebuildSearchIndex() {
    return this.adminService.rebuildSearchIndex();
  }

  // ==================== 审计日志 ====================

  @Get('audit-logs')
  @ApiOperation({ summary: '审计日志列表' })
  async getAuditLogs(@Query() query: any) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('audit-logs/:id')
  @ApiOperation({ summary: '审计日志详情' })
  async getAuditLogDetail(@Param('id') id: string) {
    return this.adminService.getAuditLogDetail(id);
  }

  // ==================== 市场管理 ====================

  @Get('markets/list')
  @ApiOperation({ summary: '市场列表（管理后台）', description: '获取全部市场（含禁用），分页' })
  async getMarketsList(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.adminService.getMarketsList(page || 1, pageSize || 50);
  }

  @Post('markets')
  @ApiOperation({ summary: '创建市场' })
  async createMarket(@Body() dto: any) {
    return this.adminService.createMarket(dto);
  }

  @Put('markets/:id')
  @ApiOperation({ summary: '更新市场' })
  async updateMarket(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateMarket(id, dto);
  }

  @Delete('markets/:id')
  @ApiOperation({ summary: '删除市场' })
  async deleteMarket(@Param('id') id: string) {
    return this.adminService.deleteMarket(id);
  }

  // ==================== 优惠券管理 ====================

  @Get('coupons')
  @ApiOperation({ summary: '优惠券列表' })
  async getCoupons(@Query() query: any) {
    return this.adminService.getCoupons(query);
  }

  @Post('coupons')
  @ApiOperation({ summary: '创建优惠券' })
  async createCoupon(@Body() dto: any) {
    return this.adminService.createCoupon(dto);
  }

  @Put('coupons/:id')
  @ApiOperation({ summary: '更新优惠券' })
  async updateCoupon(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: '删除优惠券' })
  async deleteCoupon(@Param('id') id: string) {
    return this.adminService.deleteCoupon(id);
  }

  // ==================== 采购订单管理 ====================

  @Get('product-orders')
  @ApiOperation({ summary: '采购订单列表' })
  async getProductOrders(@Query() query: any) {
    return this.adminService.getProductOrders(query);
  }

  @Put('product-orders/:id/status')
  @ApiOperation({ summary: '更新采购订单状态' })
  async updateProductOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateProductOrderStatus(id, status);
  }

  // ==================== 客户分层 ====================

  @Get('customer-tiers')
  @ApiOperation({ summary: '客户分层列表' })
  async getCustomerTiers(@Query() query: any) {
    return this.adminService.getCustomerTiers(query);
  }

  @Put('customer-tiers/:userId')
  @ApiOperation({ summary: '分配客群类型' })
  async assignCustomerTier(@Param('userId') userId: string, @Body('customerType') customerType: string) {
    return this.adminService.assignCustomerTier(userId, customerType);
  }

  // ==================== 消息模板 ====================

  @Get('message-templates')
  @ApiOperation({ summary: '消息模板列表' })
  async getMessageTemplates() {
    return this.adminService.getMessageTemplates();
  }

  @Put('message-templates/:id')
  @ApiOperation({ summary: '更新消息模板' })
  async updateMessageTemplate(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateMessageTemplate(id, dto);
  }

  // ==================== 市场分析 ====================

  @Get('analytics/markets')
  @ApiOperation({ summary: '市场大盘分析' })
  async getMarketAnalytics(@Query('days') days?: number) {
    return this.adminService.getMarketAnalytics(days || 30);
  }
}
