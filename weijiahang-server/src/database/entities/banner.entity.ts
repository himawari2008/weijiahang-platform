import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/** 首页/活动 Banner 轮播 */
@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 展示位置：home(首页) | activity(活动) | market(市场详情) */
  @Column({ type: 'varchar', length: 30, default: 'home' })
  position: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  desc: string;

  /** 背景：支持 CSS gradient / 颜色值 */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'bg' })
  bg: string;

  /** 图片 URL（优先级高于 bg） */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
  imageUrl: string;

  /** 点击跳转链接（小程序路径） */
  @Column({ type: 'varchar', length: 300, nullable: true })
  link: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
