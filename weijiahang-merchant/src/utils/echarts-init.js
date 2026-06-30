// ============================================
// ECharts 统一注册 — 所有图表页面复用
// 避免每个页面独立 import + use
// ============================================
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, FunnelChart, RadarChart } from 'echarts/charts';
import {
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
  ToolboxComponent, RadarComponent, GraphicComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart, BarChart, PieChart, FunnelChart, RadarChart,
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
  ToolboxComponent, RadarComponent, GraphicComponent,
  CanvasRenderer,
]);

export default echarts;
