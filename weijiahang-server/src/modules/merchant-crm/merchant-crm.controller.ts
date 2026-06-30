import { Controller, Get, Put, Param, Query, Body } from '@nestjs/common';
import { MerchantCrmService } from './merchant-crm.service';

@Controller('merchant-crm')
export class MerchantCrmController {
  constructor(private readonly crmService: MerchantCrmService) {}

  @Get('customers/:shopId')
  async getCustomers(
    @Param('shopId') shopId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.crmService.getCustomers(
      shopId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
      keyword,
    );
  }

  @Get('customers/:shopId/:id')
  async getCustomerDetail(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
  ) {
    return this.crmService.getCustomerDetail(shopId, id);
  }

  @Put('customers/:shopId/:id/tags')
  async updateTags(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body('tags') tags: string[],
  ) {
    return this.crmService.updateTags(shopId, id, tags);
  }

  @Put('customers/:shopId/:id/notes')
  async updateNotes(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body('notes') notes: string,
  ) {
    return this.crmService.updateNotes(shopId, id, notes);
  }

  @Get('stats/:shopId')
  async getStats(@Param('shopId') shopId: string) {
    return this.crmService.getCustomerStats(shopId);
  }
}
