/**
 * 种子管理员账号脚本
 * 用法: npx ts-node scripts/seed-admin.ts
 * 开发环境默认创建 admin / admin123 管理员
 */
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AdminUser } from '../src/database/entities/admin-user.entity';

async function seed() {
  const ds = new DataSource({
    type: 'sqlite',
    database: 'weijiahang-dev.sqlite',
    entities: [AdminUser],
    synchronize: false,
  });
  await ds.initialize();

  const repo = ds.getRepository(AdminUser);

  // 检查是否已存在
  const existing = await repo.findOne({ where: { username: 'admin' } });
  if (existing) {
    console.log('✅ 管理员账号已存在，跳过种子');
    await ds.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = repo.create({
    username: 'admin',
    passwordHash,
    realName: '系统管理员',
    role: 'superadmin',
    phone: '13800000000',
    status: 1,
  });
  await repo.save(admin);
  console.log('✅ 管理员种子账号创建成功: admin / admin123');
  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ 种子失败:', err.message);
  process.exit(1);
});
