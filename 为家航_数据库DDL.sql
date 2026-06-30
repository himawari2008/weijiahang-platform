-- ============================================================
-- 为家航 — 数据库 DDL
-- 版本: V1.0 | 日期: 2026-06-15
-- 数据库: PostgreSQL 15+ + PostGIS 3+
-- 编码: UTF-8
-- ============================================================

-- 0. 初始化扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- 模糊搜索

-- ============================================================
-- 1. 基础枚举类型
-- ============================================================

-- 服务类型枚举
DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('navigation', 'accompany', 'inspection');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 订单状态枚举
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending',      -- 待接单
        'accepted',     -- 已接单
        'arrived',      -- 已到达
        'serving',      -- 服务中
        'completed',    -- 已完成
        'cancelled',    -- 已取消
        'abnormal'      -- 异常
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 审核状态枚举
DO $$ BEGIN
    CREATE TYPE verify_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 推广类型枚举
DO $$ BEGIN
    CREATE TYPE ad_type AS ENUM ('cpc', 'cpm', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. 核心业务表
-- ============================================================

-- 2.1 市场表
CREATE TABLE IF NOT EXISTS markets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100)    NOT NULL,
    city            VARCHAR(50)     NOT NULL,
    district        VARCHAR(50),
    address         VARCHAR(300)    NOT NULL,
    location        GEOGRAPHY(POINT, 4326),      -- 市场中心经纬度
    floor_plan_url  VARCHAR(500),                -- 楼层平面图文件URL（SVG/矢量图）
    floors          JSONB                        -- 楼层结构 [{"floor":1,"name":"瓷砖区","svg_layer":"floor1"}]
                        DEFAULT '[]'::JSONB,
    area_sqm        INT,                         -- 总面积(㎡)
    shop_count      INT             DEFAULT 0,
    beacon_count    INT             DEFAULT 0,
    business_hours  VARCHAR(50)     DEFAULT '09:00-18:00',
    contact_phone   VARCHAR(20),
    status          SMALLINT        DEFAULT 1,   -- 1正常 0禁用
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE markets IS '建材市场/小商品城基础信息';
COMMENT ON COLUMN markets.location IS '市场中心GPS坐标';
COMMENT ON COLUMN markets.floors IS '楼层结构JSON，含每层名称和对应SVG图层';

-- 2.2 蓝牙信标表
CREATE TABLE IF NOT EXISTS beacons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id       UUID            NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    beacon_uid      VARCHAR(50)     NOT NULL,    -- 信标硬件唯一标识（如MAC地址）
    floor           INT             NOT NULL,
    -- 安装位置（经纬度 + 平面坐标双体系）
    longitude       DOUBLE PRECISION,
    latitude        DOUBLE PRECISION,
    location        GEOGRAPHY(POINT, 4325),      -- PostGIS 地理坐标
    x_px            DOUBLE PRECISION,            -- 平面图X像素坐标
    y_px            DOUBLE PRECISION,            -- 平面图Y像素坐标
    tx_power        INT             DEFAULT -59, -- 发射功率(dBm @1m)
    battery_level   INT             DEFAULT 100, -- 电量百分比
    firmware_ver    VARCHAR(20),
    last_seen       TIMESTAMPTZ,
    status          SMALLINT        DEFAULT 1,   -- 1正常 0离线 2维修
    installed_at    TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW(),

    UNIQUE(market_id, beacon_uid)
);

COMMENT ON TABLE beacons IS '蓝牙信标设备管理';
COMMENT ON COLUMN beacons.x_px IS '在楼层平面图上的X像素坐标，用于渲染导航';

-- 信标索引
CREATE INDEX IF NOT EXISTS idx_beacons_market ON beacons(market_id);
CREATE INDEX IF NOT EXISTS idx_beacons_floor ON beacons(market_id, floor);

-- 2.3 店铺表
CREATE TABLE IF NOT EXISTS shops (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id       UUID            NOT NULL REFERENCES markets(id),
    name            VARCHAR(100)    NOT NULL,    -- 店铺名称
    building        VARCHAR(20),                 -- 区/栋
    row_no          VARCHAR(20),                 -- 排
    shop_no         VARCHAR(20),                 -- 号
    -- 室内坐标（用于导航终点定位）
    longitude       DOUBLE PRECISION,
    latitude        DOUBLE PRECISION,
    location        GEOGRAPHY(POINT, 4325),
    x_px            DOUBLE PRECISION,            -- 平面图X坐标
    y_px            DOUBLE PRECISION,            -- 平面图Y坐标
    floor           INT             DEFAULT 1,
    -- 图片
    shop_image      VARCHAR(500),                -- 门头照URL
    images          JSONB           DEFAULT '[]'::JSONB, -- 店内环境照
    -- 认证信息
    business_license_url VARCHAR(500),           -- 营业执照图片
    license_no      VARCHAR(50),                 -- 统一社会信用代码
    legal_person    VARCHAR(20),                 -- 法人姓名
    phone           VARCHAR(20),
    -- 经营信息
    categories      JSONB           DEFAULT '[]'::JSONB, -- ["瓷砖","卫浴"]
    brands          JSONB           DEFAULT '[]'::JSONB, -- ["东鹏","马可波罗"]
    price_range     JSONB,                        -- {"min":80,"max":200,"unit":"㎡"}
    biz_hours_start TIME            DEFAULT '09:00',
    biz_hours_end   TIME            DEFAULT '18:00',
    announcement    VARCHAR(200),                 -- 商家公告
    -- 统计字段
    rating          DECIMAL(2,1)    DEFAULT 5.0,
    review_count    INT             DEFAULT 0,
    total_nav_count INT             DEFAULT 0,   -- 累计被导航次数
    favorite_count  INT             DEFAULT 0,   -- 收藏数
    -- 状态
    is_verified     BOOLEAN         DEFAULT FALSE,
    is_promoted     BOOLEAN         DEFAULT FALSE,
    verify_status   VERIFY_STATUS   DEFAULT 'pending',
    status          SMALLINT        DEFAULT 1,   -- 1正常 0禁用
    owner_user_id   UUID,                        -- 关联商家端注册用户
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE shops IS '市场内店铺/档口基础信息';
COMMENT ON COLUMN shops.categories IS '主营品类标签，JSON数组';
COMMENT ON COLUMN shops.brands IS '经营品牌，JSON数组';

-- 店铺索引
CREATE INDEX IF NOT EXISTS idx_shops_market ON shops(market_id);
CREATE INDEX IF NOT EXISTS idx_shops_category ON shops USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_shops_rating ON shops(rating DESC);
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_shops_verified ON shops(is_verified) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_shops_name_trgm ON shops USING GIN (name gin_trgm_ops); -- 模糊搜索

-- 2.4 店铺商品表
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id         UUID            NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name            VARCHAR(200)    NOT NULL,
    category        VARCHAR(50)     NOT NULL,    -- 品类
    spec            VARCHAR(100),                -- 规格
    price           DECIMAL(10,2),
    price_unit      VARCHAR(20)     DEFAULT '㎡', -- 计价单位
    images          JSONB           DEFAULT '[]'::JSONB,
    description     VARCHAR(500),
    is_on_sale      BOOLEAN         DEFAULT TRUE,
    sort_order      INT             DEFAULT 0,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE products IS '店铺展品/商品';
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 2.5 用户表（业主/采购商）
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    openid          VARCHAR(64)     UNIQUE NOT NULL, -- 微信openid
    unionid         VARCHAR(64),                     -- 微信unionid（跨应用）
    nickname        VARCHAR(50),
    avatar_url      VARCHAR(500),
    phone           VARCHAR(20),
    real_name       VARCHAR(20),
    city            VARCHAR(50),
    default_market  UUID            REFERENCES markets(id),
    -- 统计
    total_orders    INT             DEFAULT 0,
    -- 状态
    status          SMALLINT        DEFAULT 1,   -- 1正常 0禁用
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE users IS 'C端用户（业主/采购商）';
CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 2.6 领航员表
CREATE TABLE IF NOT EXISTS navigators (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    openid          VARCHAR(64)     UNIQUE NOT NULL,
    unionid         VARCHAR(64),
    real_name       VARCHAR(20)     NOT NULL,
    id_card         VARCHAR(64)     NOT NULL,    -- 加密存储（AES-256）
    phone           VARCHAR(20)     NOT NULL,
    avatar_url      VARCHAR(500),
    -- 认证资料
    id_card_front   VARCHAR(500),                -- 身份证正面照URL
    id_card_back    VARCHAR(500),                -- 身份证反面照URL
    face_verified   BOOLEAN         DEFAULT FALSE,
    background_check BOOLEAN        DEFAULT FALSE,
    verify_status   VERIFY_STATUS   DEFAULT 'pending',
    -- 服务配置
    home_markets    JSONB           DEFAULT '[]'::JSONB, -- 常驻市场
    skills          JSONB           DEFAULT '[]'::JSONB, -- ["瓷砖","砍价","方言"]
    experience_years INT            DEFAULT 0,
    -- 实时状态
    is_online       BOOLEAN         DEFAULT FALSE, -- 接单开关
    is_busy         BOOLEAN         DEFAULT FALSE, -- 是否在服务中
    current_market  UUID            REFERENCES markets(id),
    last_latitude   DOUBLE PRECISION,
    last_longitude  DOUBLE PRECISION,
    last_location_at TIMESTAMPTZ,
    -- 统计
    rating          DECIMAL(2,1)    DEFAULT 5.0,
    total_orders    INT             DEFAULT 0,
    complete_orders INT             DEFAULT 0,
    cancel_count    INT             DEFAULT 0,
    -- 收益
    balance         DECIMAL(10,2)   DEFAULT 0.00, -- 可提现余额(元)
    total_earned    DECIMAL(10,2)   DEFAULT 0.00, -- 累计收入
    -- 状态
    status          SMALLINT        DEFAULT 0,   -- 0待审核 1正常 2禁用
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE navigators IS '领航员（线下代看/导航服务者）';
COMMENT ON COLUMN navigators.id_card IS '身份证号（AES-256-CBC加密存储）';
COMMENT ON COLUMN navigators.home_markets IS '常驻市场UUID数组';
COMMENT ON COLUMN navigators.skills IS '技能标签JSON数组';

CREATE INDEX IF NOT EXISTS idx_navigators_openid ON navigators(openid);
CREATE INDEX IF NOT EXISTS idx_navigators_market ON navigators(current_market);
CREATE INDEX IF NOT EXISTS idx_navigators_online ON navigators(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_navigators_rating ON navigators(rating DESC);

-- 2.7 店铺收藏表
CREATE TABLE IF NOT EXISTS shop_favorites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id         UUID            NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),

    UNIQUE(user_id, shop_id)
);

COMMENT ON TABLE shop_favorites IS '用户收藏店铺';
CREATE INDEX IF NOT EXISTS idx_fav_user ON shop_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_shop ON shop_favorites(shop_id);

-- 2.8 领航服务订单表
CREATE TABLE IF NOT EXISTS orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no        VARCHAR(32)     UNIQUE NOT NULL, -- 订单编号（日期+序号）
    user_id         UUID            NOT NULL REFERENCES users(id),
    navigator_id    UUID            REFERENCES navigators(id),
    -- 服务信息
    service_type    SERVICE_TYPE    NOT NULL,
    title           VARCHAR(100),
    description     TEXT,                        -- 用户需求描述
    target_shops    JSONB           DEFAULT '[]'::JSONB, -- 目标店铺UUID数组
    target_market   UUID            NOT NULL REFERENCES markets(id),
    budget_range    JSONB,                        -- {"min":0,"max":100,"unit":"元/㎡"}
    -- 费用明细
    amount          DECIMAL(10,2)   NOT NULL,     -- 订单总金额
    platform_fee    DECIMAL(10,2)   DEFAULT 0,    -- 平台佣金
    navigator_income DECIMAL(10,2)  DEFAULT 0,    -- 领航员收入
    -- 时间
    expected_start  TIMESTAMPTZ,                  -- 期望开始时间
    actual_start    TIMESTAMPTZ,                  -- 实际开始时间
    expected_end    TIMESTAMPTZ,
    actual_end      TIMESTAMPTZ,
    -- 状态
    status          ORDER_STATUS    DEFAULT 'pending',
    cancel_reason   VARCHAR(200),
    cancel_by       VARCHAR(20),                  -- user / navigator / system
    user_confirmed  BOOLEAN         DEFAULT FALSE,
    -- 验货报告
    inspection_report JSONB         DEFAULT '{}'::JSONB, -- 领航员提交的验货数据
    -- 支付
    pay_status      SMALLINT        DEFAULT 0,   -- 0未支付 1已支付 2已退款
    pay_transaction VARCHAR(64),                 -- 微信支付流水号
    refund_amount   DECIMAL(10,2),
    -- 元数据
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE orders IS '领航服务订单（导航/陪逛/验货）';
COMMENT ON COLUMN orders.target_shops IS '用户指定要去的店铺UUID数组';
COMMENT ON COLUMN orders.inspection_report IS '领航员提交的验货JSON（照片URL/备注/checklist）';

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_navigator ON orders(navigator_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_market ON orders(target_market);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no);

-- 2.9 订单日志表
CREATE TABLE IF NOT EXISTS order_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    action          VARCHAR(50)     NOT NULL,     -- created/accepted/arrived/serving/completed/cancelled/abnormal
    operator_type   VARCHAR(20)     NOT NULL,     -- user / navigator / system
    operator_id     UUID,
    detail          JSONB           DEFAULT '{}'::JSONB,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE order_logs IS '订单状态流转日志（不可变）';
CREATE INDEX IF NOT EXISTS idx_logs_order ON order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON order_logs(created_at DESC);

-- 2.10 领航员轨迹表
CREATE TABLE IF NOT EXISTS nav_tracks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    navigator_id    UUID            NOT NULL REFERENCES navigators(id),
    location        GEOGRAPHY(POINT, 4325) NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    speed           DOUBLE PRECISION,            -- 移动速度(m/s)
    accuracy        DOUBLE PRECISION,            -- GPS精度(米)
    floor           INT,                         -- 所在楼层（蓝牙定位）
    beacon_data     JSONB           DEFAULT '[]'::JSONB, -- 扫描到的信标[{id,rssi}]
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE nav_tracks IS '领航员实时轨迹（时序数据，保留30天）';
COMMENT ON COLUMN nav_tracks.beacon_data IS '扫描到的蓝牙信标ID和RSSI值数组';

CREATE INDEX IF NOT EXISTS idx_tracks_order ON nav_tracks(order_id);
CREATE INDEX IF NOT EXISTS idx_tracks_navigator ON nav_tracks(navigator_id);
CREATE INDEX IF NOT EXISTS idx_tracks_created ON nav_tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_location ON nav_tracks USING GIST (location);

-- 2.11 评价表
CREATE TABLE IF NOT EXISTS reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID            NOT NULL REFERENCES orders(id),
    reviewer_id     UUID            NOT NULL REFERENCES users(id),
    -- 评价目标
    target_type     VARCHAR(20)     NOT NULL,    -- shop / navigator
    target_id       UUID            NOT NULL,
    -- 评分
    rating          SMALLINT        NOT NULL CHECK (rating >= 1 AND rating <= 5),
    quality_rating  SMALLINT        CHECK (quality_rating >= 1 AND quality_rating <= 5),
    price_rating    SMALLINT        CHECK (price_rating >= 1 AND price_rating <= 5),
    service_rating  SMALLINT        CHECK (service_rating >= 1 AND service_rating <= 5),
    -- 评价内容
    tags            JSONB           DEFAULT '[]'::JSONB, -- ["性价比高","老板实在","质量好"]
    content         VARCHAR(500),
    images          JSONB           DEFAULT '[]'::JSONB,
    -- 商家/领航员回复
    reply           VARCHAR(200),
    replied_at      TIMESTAMPTZ,
    -- 状态
    is_anonymous    BOOLEAN         DEFAULT FALSE,
    status          SMALLINT        DEFAULT 1,   -- 1正常 0隐藏(申诉)
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE reviews IS '店铺评价 + 领航员评价';
COMMENT ON COLUMN reviews.target_type IS '评价对象类型：shop=店铺, navigator=领航员';

CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(reviewer_id);

-- 2.12 推广表
CREATE TABLE IF NOT EXISTS ads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id         UUID            NOT NULL REFERENCES shops(id),
    ad_type         AD_TYPE         NOT NULL,
    ad_position     VARCHAR(30)     NOT NULL,    -- home_featured / category_top / search_result
    -- 预算
    budget          DECIMAL(10,2),               -- 预算总额
    daily_budget    DECIMAL(10,2),               -- 日预算上限
    cpc_bid         DECIMAL(6,2),                -- CPC单次点击出价(元)
    -- 投放数据
    impressions     INT             DEFAULT 0,   -- 累计展示次数
    clicks          INT             DEFAULT 0,   -- 累计点击次数
    spent           DECIMAL(10,2)   DEFAULT 0,   -- 已花费金额
    -- 排期
    start_date      DATE            NOT NULL,
    end_date        DATE            NOT NULL,
    status          SMALLINT        DEFAULT 1,   -- 1投放中 0暂停 2已结束
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE ads IS '商家付费推广管理';

CREATE INDEX IF NOT EXISTS idx_ads_shop ON ads(shop_id);
CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(status, start_date, end_date) WHERE status = 1;
CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(ad_position, status);

-- ============================================================
-- 3. 系统管理表
-- ============================================================

-- 3.1 后台管理员
CREATE TABLE IF NOT EXISTS admin_users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(50)     UNIQUE NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,    -- bcrypt
    real_name       VARCHAR(20),
    role            VARCHAR(30)     DEFAULT 'operator', -- super_admin / admin / operator
    phone           VARCHAR(20),
    last_login_at   TIMESTAMPTZ,
    last_login_ip   VARCHAR(45),
    status          SMALLINT        DEFAULT 1,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE admin_users IS '管理后台用户';

-- 3.2 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key      VARCHAR(100)    UNIQUE NOT NULL,
    config_value    JSONB           NOT NULL,
    description     VARCHAR(200),
    updated_by      UUID            REFERENCES admin_users(id),
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE system_configs IS '系统配置（动态参数/运营开关）';

-- 3.3 AI对话日志（用户使用AI材料计算器的记录）
CREATE TABLE IF NOT EXISTS ai_chat_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            REFERENCES users(id),
    session_id      VARCHAR(64)     NOT NULL,    -- 一次对话的会话ID
    role            VARCHAR(20)     NOT NULL,    -- user / assistant
    content         TEXT            NOT NULL,
    tokens_used     INT,
    model           VARCHAR(50)     DEFAULT 'claude',
    metadata        JSONB           DEFAULT '{}'::JSONB,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE ai_chat_logs IS 'AI材料计算器对话记录（用于优化和审计）';
CREATE INDEX IF NOT EXISTS idx_ai_user ON ai_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_session ON ai_chat_logs(session_id);

-- ============================================================
-- 4. 自动更新触发器
-- ============================================================

-- 4.1 更新 updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 为所有含 updated_at 的表创建触发器
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
            tbl, tbl
        );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END LOOP;
END $$;

-- 4.3 店铺评分自动更新触发器
CREATE OR REPLACE FUNCTION update_shop_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE shops SET
            rating = (
                SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0)
                FROM reviews
                WHERE target_type = 'shop' AND target_id = NEW.target_id AND status = 1
            ),
            review_count = (
                SELECT COUNT(*)
                FROM reviews
                WHERE target_type = 'shop' AND target_id = NEW.target_id AND status = 1
            )
        WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_shop_rating
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    WHEN (NEW.target_type = 'shop')
    EXECUTE FUNCTION update_shop_rating();

-- 4.4 领航员评分自动更新触发器
CREATE OR REPLACE FUNCTION update_navigator_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE navigators SET
            rating = (
                SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0)
                FROM reviews
                WHERE target_type = 'navigator' AND target_id = NEW.target_id AND status = 1
            ),
            total_orders = (
                SELECT COUNT(*)
                FROM orders
                WHERE navigator_id = NEW.target_id AND status = 'completed'
            ),
            complete_orders = (
                SELECT COUNT(*)
                FROM orders
                WHERE navigator_id = NEW.target_id AND status = 'completed'
            )
        WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_nav_rating
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    WHEN (NEW.target_type = 'navigator')
    EXECUTE FUNCTION update_navigator_rating();

-- ============================================================
-- 5. 分区表：轨迹数据按月分区
-- ============================================================

-- 创建分区函数（生产环境建议按月分区，此处用创建时间作为示例）
-- CREATE TABLE nav_tracks_202606 PARTITION OF nav_tracks
--     FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- ============================================================
-- 6. 初始测试数据（可选，开发环境使用）
-- ============================================================

-- 插入测试市场
INSERT INTO markets (id, name, city, district, address, floors, area_sqm)
VALUES
    ('a0000001-0000-0000-0000-000000000001', '西安大明宫建材市场', '西安', '未央区',
     '西安市未央区太华北路218号',
     '[{"floor": 1, "name": "瓷砖石材区"}, {"floor": 1, "name": "卫浴洁具区"},
       {"floor": 1, "name": "木地板区"},   {"floor": 2, "name": "门窗定制区"},
       {"floor": 2, "name": "灯具灯饰区"}, {"floor": 3, "name": "家具软装区"}]',
     50000)
ON CONFLICT DO NOTHING;

-- 插入测试管理员
INSERT INTO admin_users (id, username, password_hash, role, real_name)
VALUES
    ('b0000001-0000-0000-0000-000000000001', 'admin',
     '$2b$10$placeholder_hash_replace_with_real_bcrypt', 'super_admin', '系统管理员')
ON CONFLICT DO NOTHING;

-- ============================================================
-- DDL 完成
-- ============================================================
-- 表数量: 15张
-- 触发器: updated_at自动更新 + 评分自动重算
-- 索引: 30+ 个业务索引
-- 分区策略: nav_tracks 建议按月分区（生产环境）
-- 下一步: 运行此DDL → Node.js项目初始化 → API开发
-- ============================================================
