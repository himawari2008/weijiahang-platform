import { Controller, Post, Body, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { AiService } from './ai.service';
import { Public } from '../../common/decorators/public.decorator';

/** AI服务 — 公开访问，供小程序用户使用 */
@Public()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** AI 材料计算 */
  @Post('material-calc')
  async calcMaterials(@Body() dto: any) {
    return this.aiService.materialCalc(dto);
  }

  /** AI 对话 */
  @Post('chat')
  async chat(@Body() dto: {
    message: string;
    history?: Array<{ role: string; content: string }>;
    city?: string;
  }) {
    return this.aiService.chat(dto);
  }

  /**
   * AI 流式对话 (SSE)
   * 使用 chunked transfer 逐字推送，微信小程序通过 enableChunked 接收
   */
  @Post('chat/stream')
  @HttpCode(200)
  async chatStream(
    @Body() dto: {
      message: string;
      history?: Array<{ role: string; content: string }>;
      city?: string;
    },
    @Res() res: Response,
  ) {
    // 设置流式响应头
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 订阅 Observable，每收到数据就 write 一个 chunk
    const subscription = this.aiService.chatStream(dto).subscribe({
      next: (chunk: any) => {
        // 每个 chunk 用换行分隔，前端按行解析
        const line = JSON.stringify(chunk) + '\n';
        res.write(line);
      },
      error: (err: any) => {
        res.write(JSON.stringify({ type: 'error', data: err?.message || '流式响应异常' }) + '\n');
        res.end();
      },
      complete: () => {
        res.end();
      },
    });

    // 客户端断开时取消订阅
    res.on('close', () => {
      subscription.unsubscribe();
    });
  }
}
