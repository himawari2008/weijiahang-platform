# 为家航 Tab 图标

## 使用说明

这 5 个 SVG 文件是底部导航栏图标的设计源文件。

### 转换为 PNG（必须）

微信小程序 Tab 图标只支持 PNG 格式，请按以下规格导出：

| 维度 | 要求 |
|------|------|
| 尺寸 | **81 × 81 px** |
| 背景 | **透明** |
| 颜色 | 图标本身填黑色 `#000000`，微信框架会自动染成 tabBar 颜色 |
| 格式 | PNG-24（带透明通道） |

### 转换方式

1. 用 Figma / Sketch / Illustrator 打开 SVG
2. 导出为 81×81 PNG
3. 放到 `assets/icons/` 目录下
4. 确认文件：`tab-home.png` `tab-ai.png` `tab-msg.png` `tab-orders.png` `tab-mine.png`

### 图标清单

| 文件名 | 说明 | Tab |
|--------|------|-----|
| tab-home.svg | 房子（屋顶+墙体+门） | 首页 |
| tab-ai.svg | 四角星在圆环内 | AI助手 |
| tab-msg.svg | 对话气泡+三点 | 消息 |
| tab-orders.svg | 剪贴板+对勾 | 订单 |
| tab-mine.svg | 人物轮廓 | 我的 |

### App 图标

App 主图标使用 `assets/logo.svg`，导出规格：

| 维度 | 要求 |
|------|------|
| 尺寸 | **144 × 144 px** |
| 背景 | 航橙渐变 `#FF6B35 → #E55A2B` |
| 图形 | 白字 WJ + 屋顶 + 指南针（见 logo.svg） |

上传路径：微信公众平台 → 小程序管理 → 基本设置 → 小程序图标
