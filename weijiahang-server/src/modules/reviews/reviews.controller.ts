import {
  Controller, Get, Post, Body, Query, Param,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** 提交评价 — 需登录 */
  @Post()
  async create(
    @Body('userId') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, dto);
  }

  /** 店铺评价列表 — 公开 */
  @Public()
  @Get('shop/:shopId')
  async shopReviews(
    @Param('shopId') shopId: string,
    @Query() query: QueryReviewDto,
  ) {
    return this.reviewsService.findByShop(shopId, query.page, query.pageSize);
  }

  /** 领航员评价列表 — 公开 */
  @Public()
  @Get('navigator/:navId')
  async navigatorReviews(
    @Param('navId') navId: string,
    @Query() query: QueryReviewDto,
  ) {
    return this.reviewsService.findByNavigator(navId, query.page, query.pageSize);
  }

  /** 店铺评分统计 — 公开 */
  @Public()
  @Get('shop/:shopId/stats')
  async shopRatingStats(@Param('shopId') shopId: string) {
    return this.reviewsService.getShopRatingStats(shopId);
  }

  /** 商家/领航员回复评价 — 需登录 */
  @Post(':id/reply')
  async reply(
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(id, dto);
  }

  /** 运营隐藏评价 — 需登录 */
  @Post(':id/hide')
  async hide(@Param('id') id: string) {
    return this.reviewsService.hide(id);
  }
}
