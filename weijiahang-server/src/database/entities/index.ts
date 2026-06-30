export { Market } from './market.entity';
export { Navigator } from './navigator.entity';
export { Order } from './order.entity';
export { Product } from './product.entity';
export { Review } from './review.entity';
export { Ad, AdType } from './ad.entity';
export { Shop } from './shop.entity';
export { ShopFavorite } from './shop-favorite.entity';
export { User } from './user.entity';
export { Beacon } from './beacon.entity';
export { NavTrack } from './nav-track.entity';
export { DispatchRecord } from './dispatch-record.entity';
export { Notification } from './notification.entity';
export { NavigatorOnlineRecord } from './navigator-online-record.entity';
// Phase 1 — 客户分层（核心交易链路改造）
export { CustomerTier } from './customer-tier.entity';
export { CustomerTierConfig } from './customer-tier-config.entity';
// Phase 2 — 采购订单系统
export { ProductOrder } from './product-order.entity';
export { ProductOrderItem } from './product-order-item.entity';
// Phase 3 — 优惠券 & 积分
export { Coupon } from './coupon.entity';
export { UserCoupon } from './user-coupon.entity';
export { PointsLog } from './points-log.entity';
export { ReferralRecord } from './referral-record.entity';
// Phase 4 — 平台话术
export { MessageTemplate } from './message-template.entity';
// Phase 2 entities
export { NavigatorTier } from './navigator-tier.entity';
export { NavigatorBadge } from './navigator-badge.entity';
export { SettlementRecord } from './settlement-record.entity';
export { TrainingCourse } from './training-course.entity';
export { TrainingProgress } from './training-progress.entity';
export { MarketingActivity } from './marketing-activity.entity';
export { MerchantCustomer } from './merchant-customer.entity';
export { MerchantWithdraw } from './merchant-withdraw.entity';
