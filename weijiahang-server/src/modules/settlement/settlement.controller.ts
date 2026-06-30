import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { SettlementService } from './settlement.service';

@Controller('settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get('navigator/:navigatorId')
  async getNavigatorSettlements(
    @Param('navigatorId') navigatorId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.settlementService.getNavigatorSettlements(
      navigatorId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Get('pending')
  async getPendingSettlements() {
    return this.settlementService.getPendingSettlements();
  }

  @Post(':id/approve')
  async approveSettlement(@Param('id') id: string) {
    return this.settlementService.approveSettlement(id);
  }

  @Get('stats/:navigatorId')
  async getStats(@Param('navigatorId') navigatorId: string) {
    return this.settlementService.getMonthlyStats(navigatorId);
  }
}
