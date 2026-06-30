import { Controller, Get, Post, Patch, Delete, Put, Body, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** 搜索商品 — 公开 */
  @Public()
  @Get()
  async search(@Query() dto: QueryProductDto) {
    return this.productsService.search(dto);
  }

  /** 商品详情 — 公开 */
  @Public()
  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  /** 某店铺所有商品 — 公开 */
  @Public()
  @Get('shop/:shopId')
  async byShop(@Param('shopId') shopId: string) {
    return this.productsService.findByShop(shopId);
  }

  /** 热门品类统计 — 公开 */
  @Public()
  @Get('categories/hot')
  async hotCategories() {
    return this.productsService.getHotCategories();
  }

  /** 商户上架商品 */
  @Post()
  async create(@Body() dto: CreateProductDto) {
    // 注意：实际应从 JWT 或请求上下文中获取 shopId
    // 此处要求前端在 body 中传入 shopId，后续接入认证后可改为从 token 解析
    return this.productsService.create(dto['shopId'], dto);
  }

  /** 编辑商品 */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(id, dto);
  }

  /** 下架商品（软删除） */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
    return { message: '商品已下架' };
  }

  /** 批量更新商品（上下架/改价） */
  @Put('batch')
  async batchUpdate(@Body() body: { ids: string[]; shopId: string } & Record<string, any>) {
    return this.productsService.batchUpdate(body.ids, body);
  }

  /** 批量删除商品 */
  @Delete('batch')
  async batchDelete(@Body() body: { ids: string[]; shopId: string }) {
    await this.productsService.batchDelete(body.ids);
    return { message: '批量下架完成' };
  }
}
