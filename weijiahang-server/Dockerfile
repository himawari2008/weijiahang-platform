# 为家航后端 — 多阶段构建
# 构建阶段
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

# 运行阶段
FROM node:24-alpine
WORKDIR /app

# 安全：非 root 用户运行
RUN addgroup -g 1001 -S nestjs && adduser -S nestjs -u 1001

# 安装生产依赖
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 复制运行时所需文件
COPY --chown=nestjs:nestjs .env.example ./

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]