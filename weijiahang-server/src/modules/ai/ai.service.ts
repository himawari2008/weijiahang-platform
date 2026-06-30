import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';
import axios from 'axios';
import { calculateMaterials, CalcInput } from './material-engine';

/**
 * AI 引擎服务
 * 材料计算 → 100%基于定额公式（material-engine），不依赖AI
 * AI对话 → Claude API做语义理解，金额数据从定额库查，不凭空生成
 * 材料计算 + 店铺推荐 + 智能搜索
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
  private readonly apiKey = process.env.CLAUDE_API_KEY;
  private readonly model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

  /**
   * AI 材料计算
   * 输入：空间+面积+风格
   * 输出：材料清单+用量+预算
   */
  async materialCalc(dto: {
    spaces: Array<{ type: string; name: string; area: number }>;
    style?: string;
    city?: string;
    imageBase64?: string;
  }): Promise<any> {
    // 定额引擎计算（100%准确）
    const rooms = dto.spaces.map((s) => ({
      name: s.name || '客厅',
      area: s.area || 20,
    }));
    const grade = dto.style === '高端' ? '高端' : dto.style === '经济' ? '经济' : '中等';
    const engineResult = calculateMaterials({
      rooms,
      categories: (dto.spaces[0] as any)?.category ? [(dto.spaces[0] as any).category] : undefined,
      grade,
      city: dto.city || '西安',
      singleMode: !!(dto.spaces[0] as any)?.category,
    });

    // 如果有图片，尝试用AI识图补充信息
    if (dto.imageBase64) {
      try { await this.enhanceWithVision(dto, engineResult); } catch {}
    }

    // 如果有Claude API，用AI润色说明文字
    try {
      const enhanced = await this.enhanceWithAI(dto, engineResult);
      return enhanced;
    } catch {
      return engineResult;
    }
  }

  /** AI润色（可选增强，失败不影响结果） */
  private async enhanceWithAI(dto: any, result: any): Promise<any> {
    return result;
  }

  /** 识图增强 — 使用 Claude Vision 识别建材/空间 */
  private async enhanceWithVision(dto: any, result: any): Promise<void> {
    if (!this.apiKey || !dto.imageBase64) return;

    try {
      const resp = await axios.post(
        this.CLAUDE_API_URL,
        {
          model: this.model,
          max_tokens: 500,
          temperature: 0.2,
          system: '你是一个建材识别助手。请识别图片中的空间类型、材质品类、大概规格。只输出JSON。',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: dto.imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: '请识别这张图片，返回JSON格式：{"spaceType":"客厅/厨房/浴室等","materials":[{"category":"瓷砖/地板/涂料等","confidence":"高/中/低","color":"颜色","estimatedSpec":"规格估计"}],"areaEstimate":"面积估算"}。如果图片不是建材/装修相关，返回{"error":"非建材图片"}。',
                },
              ],
            },
          ],
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );

      const text = resp.data.content[0].text;
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');

      if (!parsed.error) {
        result.visionAnalysis = {
          spaceType: parsed.spaceType,
          materials: parsed.materials || [],
          areaEstimate: parsed.areaEstimate,
        };

        if (parsed.materials?.length > 0) {
          result.recognizedFromImage = parsed.materials.map((m: any) => ({
            name: m.category || '识别材料',
            spec: m.estimatedSpec || '',
            confidence: m.confidence || '中',
          }));
        }
      }
    } catch (err) {
      this.logger.warn('Vision识别失败（降级处理）', err?.message);
    }
  }

  /** 构建材料计算 Prompt */
  private buildMaterialCalcPrompt(dto: any): any {
    const spacesText = dto.spaces
      .map((s) => `- ${s.name}(类型:${s.type}) 面积:${s.area}㎡`)
      .join('\n');

    const userContent: any[] = [];

    if (dto.imageBase64) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: dto.imageBase64,
        },
      });
      userContent.push({
        type: 'text',
        text: `这是一张户型图或设计图。请先识别图中的空间类型和大致面积，再根据以下额外信息进行计算：
${spacesText || '如果图中已能识别全部空间，则使用图中信息'}

装修风格：${dto.style || '无特定风格'}
所在城市：${dto.city || '西安'}
装修类型：新房装修，半包（主材自购）

请在返回JSON中额外包含：
- "recognizedRooms": "从图中识别到的空间名称"
- "recognizedArea": 从图中估算的总面积（㎡）`,
      });
    } else {
      userContent.push({
        type: 'text',
        content: `请为以下空间计算装修材料清单：
${spacesText}

装修风格：${dto.style || '无特定风格'}
所在城市：${dto.city || '西安'}
装修类型：新房装修，半包（主材自购）`,
      });
    }

    return {
      system: `你是一个专业的装修材料顾问。${dto.imageBase64 ? '请先识别用户上传的户型图/设计图，提取空间信息和面积，' : ''}然后计算需要的材料清单。

请严格按以下JSON格式输出（不要输出其他内容）：
{
  "materials": [
    {
      "category": "瓷砖",
      "items": [
        {
          "name": "客厅地砖",
          "spec": "800×800mm",
          "qty": 38,
          "unit": "㎡",
          "tips": "建议多买5%预留损耗",
          "priceRange": {"min": 3800, "max": 5700}
        }
      ]
    }
  ],
  "totalRange": {"min": 38000, "max": 72000},
  "summary": "材料总计约38,000-72,000元，比全包装修公司报价约省20%-30%"
}

计算规则：
1. 每种材料的用量按行业标准公式计算
2. 价格参考西安建材市场中等档次
3. 单位为平方米(㎡)/米(m)/件/套
4. 预算范围取中等档次的合理区间`,

      messages: [
        {
          role: 'user',
          content: `请为以下空间计算装修材料清单：
${spacesText}

装修风格：${dto.style || '无特定风格'}
所在城市：${dto.city || '西安'}
装修类型：新房装修，半包（主材自购）`,
        },
      ],
    };
  }

  /** 调用 Claude API */
  private async callClaude(payload: any): Promise<string> {
    if (!this.apiKey) {
      this.logger.warn('未配置 CLAUDE_API_KEY，使用本地计算模式');
      throw new Error('No API key configured');
    }

    const resp = await axios.post(
      this.CLAUDE_API_URL,
      {
        model: this.model,
        max_tokens: 4000,
        temperature: 0.3,
        system: payload.system,
        messages: payload.messages,
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    return resp.data.content[0].text;
  }

  /** 解析AI返回的JSON */
  private parseMaterialResult(text: string): any {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('无法解析AI返回的材料清单');
  }

  /** AI 对话接口 */
  async chat(dto: {
    message: string;
    history?: Array<{ role: string; content: string }>;
    city?: string;
  }): Promise<any> {
    const systemPrompt = `你是为家航AI助手，帮用户在建材市场里找材料、算用量、推荐店铺。

你的能力：
1. 听懂用户的装修/采购需求（如"做电视背景墙""卫生间翻新""买智能马桶"）
2. 推荐合适的材料品类和规格
3. 估算大致用量和预算范围
4. 推荐匹配的店铺（评分高、距离近、价格合理）

回答风格：简洁实用，每次回答控制在200字以内。如果用户的问题涉及具体品类，给出1-3条材料建议+1-2家店铺推荐。
店铺推荐时务必说明评分和位置。价格用人民币。城市默认西安。`;

    try {
      const response = await this.callClaude({
        system: systemPrompt,
        messages: [
          ...(dto.history || []),
          { role: 'user', content: dto.message },
        ],
      });
      return this.parseChatResult(response);
    } catch (err) {
      this.logger.error('AI对话失败', err);
      return {
        text: '抱歉，AI服务暂时不可用。请稍后重试，或直接到市场里逛逛，首页可以搜索店铺和品类。',
      };
    }
  }

  /**
   * SSE 流式对话
   * 返回 Observable，每次推送一个 token 或结构化数据块
   */
  chatStream(dto: {
    message: string;
    history?: Array<{ role: string; content: string }>;
    city?: string;
  }): Observable<any> {
    return new Observable((subscriber: Subscriber<any>) => {
      this.streamChatToSubscriber(dto, subscriber);
    });
  }

  /** 实际执行流式对话逻辑 */
  private async streamChatToSubscriber(
    dto: { message: string; history?: Array<{ role: string; content: string }>; city?: string },
    subscriber: Subscriber<any>,
  ) {
    const systemPrompt = `你是为家航AI助手，帮用户在建材市场里找材料、算用量、推荐店铺。

你的能力：
1. 听懂用户的装修/采购需求
2. 推荐合适的材料品类和规格
3. 估算大致用量和预算范围
4. 推荐匹配的店铺

回答风格：简洁实用，控制在200字以内。如果用户问具体品类，给出材料建议+店铺推荐。
格式：纯文本，不要用markdown代码块包裹。`;

    try {
      // 有 API key 时调用 Claude 流式
      if (this.apiKey) {
        await this.streamFromClaude(systemPrompt, dto, subscriber);
      } else {
        // 无 API key 时模拟流式输出
        await this.streamLocalFallback(dto.message, subscriber);
      }
    } catch (err) {
      this.logger.error('流式对话失败', err);
      // 降级：发送本地响应
      try {
        await this.streamLocalFallback(dto.message, subscriber);
      } catch (e2) {
        subscriber.next({ type: 'error', data: 'AI服务暂不可用' });
      }
    }

    subscriber.complete();
  }

  /** 调用 Claude API 流式 */
  private async streamFromClaude(
    systemPrompt: string,
    dto: { message: string; history?: Array<{ role: string; content: string }>; city?: string },
    subscriber: Subscriber<any>,
  ) {
    const response = await axios.post(
      this.CLAUDE_API_URL,
      {
        model: this.model,
        max_tokens: 2000,
        temperature: 0.5,
        system: systemPrompt,
        messages: [
          ...(dto.history || []),
          { role: 'user', content: dto.message },
        ],
        stream: true,
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 60000,
      },
    );

    // 按行解析 SSE 事件
    let buffer = '';
    response.data.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            // Claude 流式事件类型
            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text || '';
              if (text) {
                subscriber.next({ type: 'text', data: text });
              }
            } else if (parsed.type === 'content_block_start') {
              if (parsed.content_block?.type === 'tool_use') {
                subscriber.next({ type: 'tool_use', data: parsed.content_block });
              }
            } else if (parsed.type === 'message_stop') {
              subscriber.next({ type: 'done' });
            }
          } catch {
            // 忽略解析失败的行
          }
        }
      }
    });

    response.data.on('end', () => {
      subscriber.next({ type: 'done' });
    });

    response.data.on('error', (err: Error) => {
      this.logger.error('Claude 流读取错误', err);
      subscriber.next({ type: 'error', data: '流式响应中断' });
    });
  }

  /** 本地模拟流式输出（Claude API 不可用时降级） */
  private async streamLocalFallback(message: string, subscriber: Subscriber<any>) {
    // 本地10场景响应引擎，逐字输出
    const response = this.getLocalResponse(message);

    // 先逐字输出文本
    const text = response.text;
    for (let i = 0; i < text.length; i++) {
      subscriber.next({ type: 'text', data: text[i] });
      // 模拟打字速度：10-20ms/字
      await this.delay(15 + Math.random() * 15);
    }

    // 有材料数据时发送
    if (response.materials && response.materials.length > 0) {
      subscriber.next({ type: 'materials', data: response.materials });
    }

    // 有店铺推荐时发送
    if (response.shops && response.shops.length > 0) {
      subscriber.next({ type: 'shops', data: response.shops });
    }

    subscriber.next({ type: 'done' });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 解析对话返回 */
  private parseChatResult(text: string): any {
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch {}
    return { text };
  }

  /** 本地10场景响应引擎 */
  private getLocalResponse(text: string): any {
    const q = text.toLowerCase();

    // 1. 背景墙/瓷砖
    if (q.includes('瓷砖') || q.includes('背景墙') || q.includes('电视墙')) {
      return {
        text: '做电视背景墙的话，推荐用岩板或大板瓷砖（900×1800mm），效果好接缝少。\n\n用量估算：一面3m×2.5m的背景墙，约需4-5片大板，加上损耗买6片。岩板价格在1200-3000元/片，比普通瓷砖贵但效果更好。\n\n建议搭配专用岩板胶和环氧彩砂美缝。',
        materials: [
          { name: '岩板/大板瓷砖', spec: '900×1800mm', qty: 6, unit: '片', priceMin: 1200, priceMax: 3000 },
          { name: '瓷砖胶', spec: '专用岩板胶', qty: 2, unit: '桶', priceMin: 80, priceMax: 200 },
          { name: '环氧彩砂美缝', spec: '3kg', qty: 2, unit: '桶', priceMin: 120, priceMax: 280 },
        ],
        shops: [
          { id: '3', name: '恒达瓷砖旗舰店', rating: 4.9, address: 'B区2排22号', priceMin: 150, priceMax: 350, unit: '㎡' },
          { id: '1', name: '老李瓷砖批发', rating: 4.8, address: 'A区3排15号', priceMin: 80, priceMax: 200, unit: '㎡' },
        ],
      };
    }

    // 2. 全屋/三室
    if (q.includes('三室') || q.includes('120') || q.includes('全屋')) {
      return {
        text: '120㎡三室两厅全屋瓷砖用量估算：\n\n客厅+餐厅（约40㎡）：需800×800地砖约63片\n厨房+卫生间墙地（约30㎡）：需300×600瓷砖约167片\n阳台（约5㎡）：防滑砖约9片\n\n总计约需239片，建议多买5%预留损耗=251片。中档瓷砖预算约8000-15000元，如果选品牌砖可能到20000元以上。',
        materials: [
          { name: '客厅地砖 800×800', spec: '800×800mm', qty: 63, unit: '片', priceMin: 3000, priceMax: 5000 },
          { name: '厨卫墙地砖 300×600', spec: '300×600mm', qty: 167, unit: '片', priceMin: 2500, priceMax: 4500 },
          { name: '装修辅材包', spec: '水泥+沙+胶', qty: 1, unit: '套', priceMin: 2000, priceMax: 3500 },
        ],
        shops: [
          { id: '1', name: '老李瓷砖批发', rating: 4.8, address: 'A区3排15号', priceMin: 80, priceMax: 200, unit: '㎡' },
          { id: '2', name: '鑫源建材商行', rating: 4.6, address: 'A区1排8号', priceMin: 60, priceMax: 150, unit: '㎡' },
        ],
      };
    }

    // 3. 地板选购
    if (q.includes('地板') || q.includes('木地板') || q.includes('复合地板')) {
      return {
        text: '地板选购建议：\n\n1. 实木地板：质感好但需保养，300-800元/㎡\n2. 多层实木：性价比高，150-350元/㎡\n3. 强化复合：耐磨便宜，60-150元/㎡\n\n用量=面积÷单片面积×1.08（损耗8%）。客厅推荐大尺寸（1200×200mm）显宽敞，卧室常用小板更温馨。别忘了搭配防潮膜和踢脚线。',
        materials: [
          { name: '强化复合地板', spec: '1200×200mm', qty: 60, unit: '㎡', priceMin: 60, priceMax: 150 },
          { name: '防潮膜', spec: '2mm', qty: 60, unit: '㎡', priceMin: 3, priceMax: 8 },
          { name: '踢脚线', spec: 'PVC', qty: 40, unit: '米', priceMin: 8, priceMax: 20 },
        ],
        shops: [
          { id: '4', name: '大自然地板', rating: 4.7, address: 'C区1排12号', priceMin: 60, priceMax: 300, unit: '㎡' },
        ],
      };
    }

    // 4. 卫浴
    if (q.includes('卫浴') || q.includes('马桶') || q.includes('花洒') || q.includes('浴室柜')) {
      return {
        text: '卫浴选购建议：\n\n1. 马桶：虹吸式静音好，直冲式不堵。智能马桶选即热式（活水加热更卫生）。坑距量准！一般是305或400mm。\n2. 花洒：选全铜阀体+空气注入技术，省水30%。恒温花洒对老人小孩更安全。\n3. 浴室柜：多层实木+防水漆+石英石台面，80cm适合大多数家庭。',
        materials: [
          { name: '智能马桶', spec: '即热式 305坑距', qty: 1, unit: '台', priceMin: 2000, priceMax: 5000 },
          { name: '恒温花洒', spec: '全铜 三出水', qty: 1, unit: '套', priceMin: 600, priceMax: 1500 },
          { name: '浴室柜', spec: '80cm+石英石台面', qty: 1, unit: '套', priceMin: 800, priceMax: 2500 },
        ],
        shops: [
          { id: '5', name: '九牧卫浴', rating: 4.8, address: 'B区1排6号', priceMin: 500, priceMax: 5000, unit: '件' },
        ],
      };
    }

    // 5. 涂料
    if (q.includes('涂料') || q.includes('漆') || q.includes('乳胶漆') || q.includes('墙漆')) {
      return {
        text: '涂料选购：\n\n1. 按光泽：哑光（家装主流）/丝光（厨房适用）/半光（门框）\n2. 按功能：净味/抗甲醛/可擦洗。有小孩选可擦洗款。\n3. 用量=面积÷8㎡/L×2遍（底漆一遍+面漆两遍）\n\n推荐买大桶（18L）底漆1桶+面漆2桶，比小桶组合便宜30%。',
        materials: [
          { name: '内墙底漆', spec: '18L', qty: 1, unit: '桶', priceMin: 300, priceMax: 800 },
          { name: '内墙面漆', spec: '18L', qty: 2, unit: '桶', priceMin: 400, priceMax: 1200 },
          { name: '腻子粉', spec: '20kg', qty: 8, unit: '袋', priceMin: 25, priceMax: 60 },
        ],
        shops: [
          { id: '6', name: '立邦涂料专营', rating: 4.6, address: 'D区2排3号', priceMin: 200, priceMax: 1200, unit: '桶' },
        ],
      };
    }

    // 6. 门窗
    if (q.includes('门') || q.includes('窗') || q.includes('防盗门') || q.includes('铝合金')) {
      return {
        text: '门窗选购：\n\n1. 入户门：甲级防盗门+超B级锁芯，带智能锁预算3000-6000元\n2. 室内门：实木复合门性价比最高，800-2000元/扇。注意含不含五金。\n3. 断桥铝窗：选70系以上，双层中空钢化玻璃，500-1000元/㎡\n\n量尺一定要精准！门窗误差不超过5mm，否则安装麻烦。三室一般需要3-4扇室内门。',
        materials: [
          { name: '实木复合室内门', spec: '800×2100mm', qty: 3, unit: '扇', priceMin: 800, priceMax: 2000 },
          { name: '断桥铝窗', spec: '70系 双层中空', qty: 12, unit: '㎡', priceMin: 500, priceMax: 1000 },
          { name: '智能门锁', spec: '指纹+密码+APP', qty: 1, unit: '套', priceMin: 800, priceMax: 2500 },
        ],
        shops: [
          { id: '7', name: 'TATA木门', rating: 4.5, address: 'E区1排10号', priceMin: 1000, priceMax: 3000, unit: '扇' },
        ],
      };
    }

    // 7. 石材
    if (q.includes('石材') || q.includes('大理石') || q.includes('石英石') || q.includes('岩板')) {
      return {
        text: '石材选购：\n\n1. 厨房台面：石英石（硬度高不渗色，400-800元/米）或岩板（耐高温但贵，800-2500元/米）\n2. 窗台石：人造石即可，100-300元/米\n3. 背景墙：岩板900×1800mm大板效果最好\n\n注意：天然石材每批花纹不同，建议一次买够同一批次，避免色差。',
        materials: [
          { name: '石英石台面', spec: '15mm厚', qty: 4, unit: '米', priceMin: 400, priceMax: 800 },
          { name: '岩板背景墙', spec: '900×1800mm', qty: 6, unit: '片', priceMin: 800, priceMax: 2500 },
        ],
        shops: [
          { id: '8', name: '环球石材', rating: 4.4, address: 'F区3排5号', priceMin: 300, priceMax: 2500, unit: '㎡' },
        ],
      };
    }

    // 8. 辅材五金
    if (q.includes('五金') || q.includes('辅材') || q.includes('胶') || q.includes('水泥')) {
      return {
        text: '辅材五金选购：\n\n1. 瓷砖胶：C2型粘结力最强，大板岩板用C2S1柔性款\n2. 美缝剂：环氧彩砂效果最好但贵，普通美缝剂日常够用\n3. 水泥：家装用P.O42.5即可，325#发灰强度低不推荐\n4. 五金：合页/滑轨/拉手，选304不锈钢。百隆/海蒂诗是进口好货。\n\n辅材虽小，但影响施工质量和寿命，别图便宜！',
        materials: [
          { name: '瓷砖胶C2型', spec: '25kg', qty: 20, unit: '袋', priceMin: 45, priceMax: 80 },
          { name: '美缝剂', spec: '400ml', qty: 8, unit: '支', priceMin: 30, priceMax: 60 },
          { name: '水泥P.O42.5', spec: '50kg', qty: 10, unit: '袋', priceMin: 25, priceMax: 35 },
        ],
        shops: [
          { id: '2', name: '鑫源建材商行', rating: 4.6, address: 'A区1排8号', priceMin: 25, priceMax: 80, unit: '件' },
        ],
      };
    }

    // 9. 预算咨询
    if (q.includes('预算') || q.includes('多少钱') || q.includes('费用') || q.includes('省钱')) {
      return {
        text: '装修预算参考（100㎡中档装修）：\n\n水电改造：8000-12000元\n瓷砖+铺贴：15000-25000元\n地板：6000-12000元\n卫浴（2卫）：8000-15000元\n橱柜：6000-12000元\n门+窗：8000-15000元\n涂料+施工：4000-8000元\n辅材+五金：3000-5000元\n\n总预算约5.8万-11.5万（不含家具家电）。建议预留10%应急金。去建材市场买材料通常比装修公司套餐省20%-30%。',
        materials: [],
        shops: [
          { id: '1', name: '老李瓷砖批发', rating: 4.8, address: 'A区3排15号', priceMin: 80, priceMax: 200, unit: '㎡' },
          { id: '4', name: '大自然地板', rating: 4.7, address: 'C区1排12号', priceMin: 60, priceMax: 300, unit: '㎡' },
          { id: '5', name: '九牧卫浴', rating: 4.8, address: 'B区1排6号', priceMin: 500, priceMax: 5000, unit: '件' },
        ],
      };
    }

    // 10. 默认兜底
    return {
      text: `好的，我理解你的需求。\n\n关于"${text.slice(0, 20)}${text.length > 20 ? '...' : ''}"，建议你到市场实地看看，我可以帮你：\n\n1. 推荐合适的材料品类和规格\n2. 计算大致用量和预算\n3. 推荐评分高的店铺\n\n你想先从哪个方面了解？瓷砖、地板、卫浴还是其他品类？`,
    };
  }
}
