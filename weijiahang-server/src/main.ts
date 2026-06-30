import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import * as helmet from 'helmet';
import * as compression from 'compression';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 安全头
  app.use(helmet.default());

  // 压缩响应
  app.use(compression());

  // 全局前缀
  app.setGlobalPrefix('api/v1');

  // ===================== CORS 白名单 =====================
  const corsWhitelist = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
  ];

  // 生产域名（从环境变量读取）
  const prodOrigin = process.env.CORS_ORIGIN;
  if (prodOrigin) {
    corsWhitelist.push(...prodOrigin.split(','));
  }

  app.enableCors({
    origin: (origin, callback) => {
      // 开发工具（如 Postman）可能不发送 origin
      if (!origin || corsWhitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS 不允许来源: ${origin}`));
      }
    },
    credentials: true,
  });

  // ===================== 分级速率限制 =====================
  // 全局默认：100次/分钟/IP
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        code: 429,
        message: '请求过于频繁，请稍后再试',
        timestamp: new Date().toISOString(),
      },
      skip: (req) => req.url?.startsWith('/api/docs'), // Swagger文档不限速
    }),
  );

  // 认证接口限速：20次/分钟/IP（防暴力破解）
  app.use(
    '/api/v1/auth',
    rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        code: 429,
        message: '认证请求过于频繁，请稍后再试',
        timestamp: new Date().toISOString(),
      },
    }),
  );

  // 管理后台限速：60次/分钟/IP
  app.use(
    '/api/v1/admin',
    rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        code: 429,
        message: '管理接口请求过于频繁',
        timestamp: new Date().toISOString(),
      },
    }),
  );

  // 全局管道：XSS净化 → DTO验证（先净化再验证）
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局过滤器：统一异常响应格式
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局拦截器：统一成功响应格式
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger 文档（非生产环境启用）
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('为家航 API')
      .setDescription('为家航 — 线上线下建材市场O2O平台 API文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`🚀 为家航服务已启动: http://localhost:${port}`);
  console.log(`📚 API文档: http://localhost:${port}/api/docs`);
  console.log(`🛡️  安全: Helmet + CORS白名单 + 分级速率限制 + XSS净化 + 审计日志`);

  // ===================== 优雅关闭 =====================
  // PM2 发送 SIGTERM → 关闭HTTP服务器 → 清理资源 → 退出
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\n⏳ 收到 ${signal} 信号，正在优雅关闭...`);

      // 关闭 NestJS 应用（停止接收新请求，完成进行中的请求）
      await app.close();
      console.log('✅ HTTP 服务已关闭');

      // 注意：TypeORM 连接由 NestJS 生命周期自动关闭
      // WebSocket 连接由 @nestjs/websockets 自动清理

      console.log('👋 为家航服务已安全退出');
      process.exit(0);
    });
  }

  // 未捕获异常处理
  process.on('unhandledRejection', (reason: any) => {
    console.error('❌ 未捕获的 Promise 拒绝:', reason);
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('❌ 未捕获的异常:', error.message);
    process.exit(1);
  });
}
bootstrap();
