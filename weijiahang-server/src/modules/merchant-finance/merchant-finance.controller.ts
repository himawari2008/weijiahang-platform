import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { MerchantFinanceService } from './merchant-finance.service';

@Controller('merchant-finance')
export class MerchantFinanceController {
  constructor(private readonly financeService: MerchantFinanceService) {}

  @Get('overview/:shopId')
  async getOverview(@Param('shopId') shopId: string) {
    return this.financeService.getFinanceOverview(shopId);
  }

  @Get('transactions/:shopId')
  async getTransactions(
    @Param('shopId') shopId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.financeService.getTransactionRecords(
      shopId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
      dateFrom,
      dateTo,
    );
  }

  @Get('withdrawals/:shopId')
  async getWithdrawals(@Param('shopId') shopId: string) {
    return this.financeService.getWithdrawHistory(shopId);
  }

  @Post('withdraw')
  async requestWithdraw(
    @Body('shopId') shopId: string,
    @Body('amount') amount: number,
    @Body('method') method: string,
  ) {
    return this.financeService.requestWithdraw(shopId, amount, method);
  }

  @Put('withdraw/:id/approve')
  async approveWithdraw(@Param('id') id: string) {
    return this.financeService.approveWithdraw(id);
  }

  @Put('withdraw/:id/reject')
  async rejectWithdraw(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.financeService.rejectWithdraw(id, reason);
  }
}
