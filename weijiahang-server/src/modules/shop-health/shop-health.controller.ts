import { Controller, Get, Param } from '@nestjs/common';
import { ShopHealthService } from './shop-health.service';

@Controller('shop-health')
export class ShopHealthController {
  constructor(private readonly healthService: ShopHealthService) {}

  @Get(':shopId')
  async getHealth(@Param('shopId') shopId: string) {
    return this.healthService.calculateHealth(shopId);
  }
}
