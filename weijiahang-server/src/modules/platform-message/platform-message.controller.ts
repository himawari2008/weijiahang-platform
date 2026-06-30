import { Controller, Get, Put, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { PlatformMessageService } from './platform-message.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('platform-messages')
export class PlatformMessageController {
  constructor(private readonly messageService: PlatformMessageService) {}

  /** 初始化默认模板 */
  @Public()
  @Post('seed')
  async seedTemplates() {
    const count = await this.messageService.seedDefaultTemplates();
    return { seeded: count, message: count > 0 ? `已初始化${count}个模板` : '模板已存在' };
  }

  /** 获取所有模板 */
  @Get('templates')
  async getTemplates() {
    return this.messageService.getTemplates();
  }

  /** 获取单个模板 */
  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    return this.messageService.getTemplate(id);
  }

  /** 更新模板 */
  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.messageService.updateTemplate(id, body);
  }

  /**
   * 测试发送
   * FIX: 校验必填参数，发送失败时返回错误而非永远 { success: true }
   */
  @Post('test-send')
  async testSend(@Body() body: { eventCode: string; userId: string; context?: any }) {
    if (!body.eventCode || !body.userId) {
      throw new BadRequestException('eventCode 和 userId 为必填项');
    }
    await this.messageService.renderAndSend(body.eventCode, body.userId, body.context || {});
    return { success: true };
  }
}
