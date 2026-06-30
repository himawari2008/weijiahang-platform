import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate } from '../../database/entities/message-template.entity';
import { User } from '../../database/entities/user.entity';
import { NotificationService } from '../notification/notification.service';

/** 客群类型 → 模板字段映射 */
const TYPE_FIELD_MAP: Record<string, keyof MessageTemplate> = {
  retail: 'bodyRetail',
  contractor: 'bodyContractor',
  decoration_company: 'bodyDecoration',
  wholesale: 'bodyWholesale',
};

/**
 * 默认话术模板数据
 *
 * 话术原则：
 * - 将平台有利条款包装为客户保障
 * - "平台先行赔付" → 暗示平台权威
 * - "三道把关" → 强化平台品控形象
 * - "货不对板包退" → 降低决策门槛
 */
const DEFAULT_TEMPLATES: Array<Partial<MessageTemplate>> = [
  {
    code: 'order_confirmed',
    name: '订单确认通知',
    triggerEvent: 'product_order.merchant_confirmed',
    targetType: 'user',
    bodyRetail: '您的订单{orderNo}已由为家航平台审核，{shopName}正在备货。平台承诺货不对板包退，全程无忧。',
    bodyContractor: '订单{orderNo}已确认，领航员{navName}将为您集货配送。平台三重把关，质量有保障。您的等级折扣已自动生效。',
    bodyDecoration: '项目订单{orderNo}已确认。平台先行赔付机制已生效，全程品控由为家航负责。信用额度已更新。',
    bodyWholesale: '批发订单{orderNo}已确认，批量折扣已自动计算。为家航大客户专属通道保障交付时效。',
    bodyDefault: '订单{orderNo}已确认，商家正在备货。为家航平台为您保驾护航。',
    templateVars: ['orderNo', 'shopName', 'navName', 'amount'],
    channels: ['notification'],
  },
  {
    code: 'delivery_update',
    name: '发货通知',
    triggerEvent: 'product_order.shipped',
    targetType: 'user',
    bodyRetail: '您的货物已从{shopName}发出，预计{eta}到达。为家航全程追踪，如有问题随时联系平台。',
    bodyContractor: '集货配送已发出，领航员{navName}正在配送途中。{deliveryInfo}。平台品控团队全程跟进。',
    bodyDecoration: '项目物资已发出，预计{eta}到达。为家航项目管家将同步验收进度。',
    bodyWholesale: '批量货物已发出，物流单号{trackingNo}。为家航大客户服务团队将跟进签收。',
    bodyDefault: '货物已从{shopName}发出，预计{eta}到达。为家航全程追踪。',
    templateVars: ['shopName', 'eta', 'navName', 'deliveryInfo', 'trackingNo'],
    channels: ['notification'],
  },
  {
    code: 'after_sales_checkin',
    name: '收货后回访',
    triggerEvent: 'product_order.received_7days',
    targetType: 'user',
    bodyRetail: '使用7天了，产品怎么样？为家航「货不对板包退」承诺长期有效，有任何问题找平台。满意的话给商家点个好评吧~',
    bodyContractor: '项目进展顺利吗？这批材料的品质您还满意吗？为家航品控团队随时为您服务，有问题平台兜底。',
    bodyDecoration: '项目材料使用情况如何？为家航项目保障机制持续生效中，如需补货享老客专属价。',
    bodyWholesale: '批量采购使用情况如何？为家航大客户经理将主动联系确认售后需求，平台保障始终在线。',
    bodyDefault: '使用一周了，产品怎么样？为家航平台保障持续生效，有任何问题随时联系。',
    templateVars: ['shopName', 'orderNo'],
    channels: ['notification'],
  },
  {
    code: 'welcome_new_user',
    name: '新人欢迎',
    triggerEvent: 'user.registered',
    targetType: 'user',
    bodyRetail: '欢迎加入为家航！首单满200减50新人券已到账。平台「三道把关」为您装修保驾护航，放心选购。',
    bodyContractor: '欢迎工长师傅加入为家航！批量采购享专属折扣，领航员集货配送省心省力。新人券已到账。',
    bodyDecoration: '欢迎装企合作伙伴！为家航为您提供项目级采购服务，信用额度已开通，专属客户经理将联系您。',
    bodyWholesale: '欢迎批发合作伙伴！为家航大客户体系已为您开通：专属议价、批量折扣、优先配送、月结服务。',
    bodyDefault: '欢迎加入为家航！新人专享券已到账，平台三大保障为您护航。',
    templateVars: ['couponAmount', 'minAmount'],
    channels: ['notification'],
  },
  {
    code: 'tier_upgrade',
    name: '等级升级通知',
    triggerEvent: 'customer_tier.upgraded',
    targetType: 'user',
    bodyRetail: '恭喜升级为{tierName}客户！专属{tierName}价已生效，下单自动享受{tierDiscountRate}%优惠。继续采购升至{nextTier}享更大折扣！',
    bodyContractor: '恭喜晋升{tierName}工长！{tierDiscountRate}%等级折扣已生效，配送优先权提升。距离{nextTier}还差{amountNeeded}元。',
    bodyDecoration: '恭喜信用等级升至{tierName}！月信用额度已提升至{creditLimit}元。为家航与您共同成长。',
    bodyWholesale: '恭喜大客户等级升至{tierName}！{tierDiscountRate}%批发折扣 + 优先配送 + 专属服务通道已全部生效。',
    bodyDefault: '恭喜升级为{tierName}客户！专属优惠已生效，下单自动享受折扣。',
    templateVars: ['tierName', 'tierDiscountRate', 'nextTier', 'amountNeeded', 'creditLimit'],
    channels: ['notification'],
  },
];

@Injectable()
export class PlatformMessageService {
  private readonly logger = new Logger(PlatformMessageService.name);

  constructor(
    @InjectRepository(MessageTemplate)
    private readonly templateRepo: Repository<MessageTemplate>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  /* ═══════════════════════════════════════════
     模板渲染
     ═══════════════════════════════════════════ */

  /**
   * 根据事件+用户信息渲染消息
   * @returns { title, body } 或 null
   */
  async renderAndSend(
    eventCode: string,
    userId: string,
    context: Record<string, string> = {},
  ): Promise<void> {
    const template = await this.templateRepo.findOne({ where: { code: eventCode, isActive: true } });
    if (!template) {
      this.logger.warn(`未找到模板: ${eventCode}`);
      return;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    // 选客群对应文案
    const field = TYPE_FIELD_MAP[user.customerType] || 'bodyDefault';
    let body = (template[field] as string) || template.bodyDefault || '';

    // 填充模板变量
    // FIX: 使用 replacer 函数防止 $ 特殊替换模式注入
    for (const [key, value] of Object.entries(context)) {
      body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), () => value);
    }

    // 推送通知
    try {
      await this.notificationService.create({
        targetId: userId,
        targetType: template.targetType as any,
        type: template.triggerEvent as any,
        title: template.name,
        body,
        data: context,
      });
    } catch (e) {
      this.logger.warn(`通知发送失败: ${eventCode}`, e.message);
    }
  }

  /** 业务事件快捷发送 */
  async sendOnEvent(
    event: string,
    userId: string,
    context: Record<string, string> = {},
  ): Promise<void> {
    await this.renderAndSend(event, userId, context);
  }

  /* ═══════════════════════════════════════════
     模板管理（Admin）
     ═══════════════════════════════════════════ */

  async getTemplates(): Promise<MessageTemplate[]> {
    return this.templateRepo.find({ order: { code: 'ASC' } });
  }

  async getTemplate(id: string): Promise<MessageTemplate | null> {
    return this.templateRepo.findOne({ where: { id } });
  }

  async updateTemplate(id: string, dto: Partial<MessageTemplate>): Promise<MessageTemplate | null> {
    await this.templateRepo.update(id, dto as any);
    return this.templateRepo.findOne({ where: { id } });
  }

  /** 初始化默认模板 */
  async seedDefaultTemplates(): Promise<number> {
    const count = await this.templateRepo.count();
    if (count > 0) return 0;

    const entities = DEFAULT_TEMPLATES.map(t => this.templateRepo.create(t as any));
    await this.templateRepo.save(entities as any);
    return entities.length;
  }
}
