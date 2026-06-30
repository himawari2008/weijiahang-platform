const app = getApp();

Page({
  data: {
    mode: 'chat',   // 'chat' | 'calc'
    messages: [],
    inputText: '',
    loading: false,
    scrollTo: '',
    // 流式输出状态
    streaming: false,
    streamingText: '',    // 当前正在输出的文字
    // 语音状态
    isRecording: false,
    recordTime: 0,
  },

  onLoad() {
    this.initVoiceRecorder();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    // 加载对话历史
    this.loadHistory();
  },

  /** 加载对话历史 */
  loadHistory() {
    try {
      const history = wx.getStorageSync('ai_chat_history');
      if (history && history.length > 0) {
        this.setData({ messages: history });
      }
    } catch (e) {
      // ignore
    }
  },

  /** 保存对话历史（最多保留50条） */
  saveHistory(msgs) {
    const recent = msgs.slice(-50);
    try {
      wx.setStorageSync('ai_chat_history', recent);
    } catch (e) {
      // ignore
    }
  },

  /** 新建对话 */
  onNewChat() {
    if (this.data.loading) return;
    wx.showModal({
      title: '新建对话',
      content: '当前对话将被清除，确定开始新对话吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ messages: [], streamingText: '', streaming: false });
          wx.removeStorageSync('ai_chat_history');
        }
      },
    });
  },

  /** 切换模式 */
  onMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === 'calc') {
      wx.navigateTo({ url: '/pages/ai-calc/ai-calc' });
      return;
    }
    this.setData({ mode });
  },

  /** 跳转快速计算 */
  onGoCalc() {
    wx.navigateTo({ url: '/pages/ai-calc/ai-calc' });
  },

  onInput(e) { this.setData({ inputText: e.detail.value }); },

  /** 快捷提问 */
  onQuickAsk(e) {
    const q = e.currentTarget.dataset.q;
    this.setData({ inputText: q });
    this.sendMessage(q);
  },

  /** 发送消息 */
  async onSend() {
    const text = this.data.inputText.trim();
    if (!text || this.data.loading) return;
    this.sendMessage(text);
  },

  async sendMessage(text) {
    const userMsg = { id: Date.now(), role: 'user', text };
    const msgs = [...this.data.messages, userMsg];
    this.setData({
      messages: msgs,
      inputText: '',
      loading: true,
      streaming: true,
      streamingText: '',
      scrollTo: `msg-${userMsg.id}`,
    });
    this.saveHistory(msgs);

    // 尝试流式请求
    try {
      await this.streamChat(text, msgs);
    } catch (err) {
      // 流式失败降级到普通请求
      console.log('流式请求失败，降级到普通请求', err);
      try {
        await this.fallbackChat(text, msgs);
      } catch (err2) {
        // 完全离线：本地响应
        this.appendLocalResponse(text);
      }
    }

    this.setData({ loading: false, streaming: false });
    // 保存含AI回复的完整历史
    this.saveHistory(this.data.messages);
  },

  /** SSE 流式请求 — 核心 */
  streamChat(text, history) {
    return new Promise((resolve, reject) => {
      const that = this;
      let fullText = '';
      let materials = null;
      let shops = null;
      let chunkBuffer = '';

      const requestTask = wx.request({
        url: `${app.globalData.apiBase}/ai/chat/stream`,
        method: 'POST',
        enableChunked: true,
        header: { 'Content-Type': 'application/json' },
        data: {
          message: text,
          history: history.slice(-6).map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
          city: '西安',
        },
        success: () => {
          // 流结束时添加完整AI消息
          if (fullText || materials || shops) {
            const aiMsg = {
              id: Date.now() + 1,
              role: 'assistant',
              text: fullText || '收到你的问题了',
              materials: materials,
              shops: shops,
            };
            that.setData({
              messages: [...that.data.messages, aiMsg],
              streamingText: '',
              scrollTo: `msg-${aiMsg.id}`,
            });
          }
          resolve(null);
        },
        fail: (err) => {
          // 如果有已接收的内容也算成功
          if (fullText) {
            const aiMsg = {
              id: Date.now() + 1,
              role: 'assistant',
              text: fullText,
              materials: materials,
              shops: shops,
            };
            that.setData({
              messages: [...that.data.messages, aiMsg],
              streamingText: '',
              scrollTo: `msg-${aiMsg.id}`,
            });
            resolve(null);
          } else {
            reject(err);
          }
        },
      });

      // 监听分块数据
      requestTask.onChunkReceived((res) => {
        try {
          // 将 ArrayBuffer 转为字符串
          const chunk = that.arrayBufferToString(res.data);
          chunkBuffer += chunk;

          // 按行解析 JSON chunk
          const lines = chunkBuffer.split('\n');
          chunkBuffer = lines.pop() || ''; // 不完整的行放回 buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              switch (parsed.type) {
                case 'text':
                  // 逐字追加文本
                  fullText += parsed.data;
                  that.setData({ streamingText: fullText });
                  break;
                case 'materials':
                  materials = parsed.data;
                  break;
                case 'shops':
                  shops = parsed.data;
                  break;
                case 'error':
                  console.error('AI流式错误:', parsed.data);
                  break;
                case 'done':
                  // 流正常结束
                  break;
              }
            } catch (parseErr) {
              // 忽略解析失败的行
            }
          }
        } catch (e) {
          console.error('chunk解析错误:', e);
        }
      });
    });
  },

  /** 降级：普通非流式请求 */
  fallbackChat(text, history) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}/ai/chat`,
        method: 'POST',
        data: {
          message: text,
          history: history.slice(-6).map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
          city: '西安',
        },
        success: (res) => {
          if (res.data && res.data.code === 200) {
            const data = res.data.data;
            const aiMsg = {
              id: Date.now() + 1,
              role: 'assistant',
              text: data.text || '',
              materials: data.materials || null,
              shops: data.shops || null,
            };
            this.setData({
              messages: [...this.data.messages, aiMsg],
              streamingText: '',
              scrollTo: `msg-${aiMsg.id}`,
            });
            resolve(null);
          } else {
            reject(new Error('API返回异常'));
          }
        },
        fail: reject,
      });
    });
  },

  /** 完全离线降级 */
  appendLocalResponse(text) {
    const resp = this.localResponse(text);
    const aiMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      text: resp.text,
      materials: resp.materials || null,
      shops: resp.shops || null,
    };
    this.setData({
      messages: [...this.data.messages, aiMsg],
      scrollTo: `msg-${aiMsg.id}`,
    });
  },

  /** ArrayBuffer → 字符串（兼容处理） */
  arrayBufferToString(buffer) {
    // 微信返回的可能是 ArrayBuffer
    if (buffer instanceof ArrayBuffer) {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(new Uint8Array(buffer));
    }
    // 也可能是字符串
    if (typeof buffer === 'string') return buffer;
    // 兜底
    return String(buffer);
  },

  /** 本地10场景降级引擎 */
  localResponse(text) {
    const q = text.toLowerCase();
    // 1. 背景墙/瓷砖
    if (q.includes('瓷砖') || q.includes('背景墙') || q.includes('电视墙')) {
      return {
        text: '做电视背景墙的话，推荐用岩板或大板瓷砖（900×1800mm），效果好接缝少。\n\n用量估算：一面3m×2.5m的背景墙，约需4-5片大板，加上损耗买6片。岩板价格在1200-3000元/片，比普通瓷砖贵但效果更好。',
        materials: [
          { name: '岩板/大板瓷砖', spec: '900×1800mm', qty: 6, unit: '片', priceMin: 1200, priceMax: 3000 },
          { name: '瓷砖胶', spec: '专用岩板胶', qty: 2, unit: '桶', priceMin: 80, priceMax: 200 },
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
        text: '120㎡三室两厅全屋瓷砖用量估算：\n\n客厅+餐厅（约40㎡）：需800×800地砖约63片\n厨房+卫生间墙地（约30㎡）：需300×600瓷砖约167片\n阳台（约5㎡）：防滑砖约9片\n\n总计约需239片，建议多买5%预留损耗=251片。中档瓷砖预算约8000-15000元。',
        materials: [
          { name: '客厅地砖 800×800', spec: '800×800mm', qty: 63, unit: '片', priceMin: 3000, priceMax: 5000 },
          { name: '厨卫墙地砖 300×600', spec: '300×600mm', qty: 167, unit: '片', priceMin: 2500, priceMax: 4500 },
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
        text: '地板选购建议：\n\n1. 实木地板：质感好但需保养，300-800元/㎡\n2. 多层实木：性价比高，150-350元/㎡\n3. 强化复合：耐磨便宜，60-150元/㎡\n\n用量=面积÷单片面积×1.08（损耗8%）。客厅推荐大尺寸显宽敞。',
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
        text: '卫浴选购建议：\n\n1. 马桶：虹吸式静音好，直冲式不堵。智能马桶选即热式，坑距量准（305/400mm）。\n2. 花洒：全铜阀体+空气注入技术，省水30%\n3. 浴室柜：多层实木+防水漆+石英石台面，80cm适合大多数家庭。',
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
        text: '涂料选购：\n\n1. 按光泽分：哑光（家装主流）/丝光/半光，有小孩选可擦洗款\n2. 用量=面积÷8㎡/L×2遍（底漆一遍+面漆两遍）\n\n推荐买大桶18L，底漆1桶+面漆2桶，比小桶组合便宜30%。',
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
        text: '门窗选购：\n\n1. 入户门：甲级防盗门+超B级锁芯，预算2000-5000元\n2. 室内门：实木复合门性价比最高，800-2000元/扇\n3. 断桥铝窗：选70系以上，双层中空钢化玻璃，500-1000元/㎡\n\n量尺要精准，误差不超过5mm。',
        materials: [
          { name: '实木复合室内门', spec: '800×2100mm', qty: 3, unit: '扇', priceMin: 800, priceMax: 2000 },
          { name: '断桥铝窗', spec: '70系 双层中空', qty: 12, unit: '㎡', priceMin: 500, priceMax: 1000 },
        ],
        shops: [
          { id: '7', name: 'TATA木门', rating: 4.5, address: 'E区1排10号', priceMin: 1000, priceMax: 3000, unit: '扇' },
        ],
      };
    }
    // 7. 石材
    if (q.includes('石材') || q.includes('大理石') || q.includes('石英石') || q.includes('岩板')) {
      return {
        text: '石材选购：\n\n1. 厨房台面：石英石硬度高不渗色，400-800元/米；岩板耐高温但贵，800-2500元/米\n2. 窗台石：人造石即可，100-300元/米\n3. 背景墙：岩板900×1800mm大板效果最好\n\n注意：天然石材每批花纹不同，建议一次买够同一批次。',
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
        text: '辅材五金选购：\n\n1. 瓷砖胶：C2型粘结力最强，大板用C2S1柔性款\n2. 美缝剂：环氧彩砂效果最好，普通美缝剂日常够用\n3. 水泥：家装用P.O42.5即可，325#强度低不推荐\n4. 五金：合页/滑轨/拉手，选304不锈钢\n\n辅材虽小但影响施工质量，别图便宜！',
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
        text: '装修预算参考（100㎡中档装修）：\n\n水电改造：8000-12000元\n瓷砖+铺贴：15000-25000元\n地板：6000-12000元\n卫浴（2卫）：8000-15000元\n橱柜：6000-12000元\n门+窗：8000-15000元\n涂料+施工：4000-8000元\n辅材+五金：3000-5000元\n\n总预算约5.8万-11.5万（不含家具家电）。建议预留10%应急金。去建材市场买材料通常比装修公司套餐省20%+。',
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
  },

  /** 拍照 */
  onTakePhoto() {
    const that = this;
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['camera', 'album'],
      success: (res) => {
        const img = res.tempFiles[0].tempFilePath;
        const msg = { id: Date.now(), role: 'user', text: '帮我看看这张图', image: img };
        const msgs = [...that.data.messages, msg];
        that.setData({ messages: msgs, loading: true, scrollTo: `msg-${msg.id}` });
        that.saveHistory(msgs);

        // 将图片转为base64发送给AI
        that.analyzeImage(img);
      },
    });
  },

  /** 图片AI分析 */
  analyzeImage(imgPath) {
    const that = this;
    // 先读取文件为base64
    const fs = wx.getFileSystemManager();
    try {
      const base64 = fs.readFileSync(imgPath, 'base64');
      // 尝试流式请求带图片
      wx.request({
        url: `${app.globalData.apiBase}/ai/chat`,
        method: 'POST',
        data: {
          message: '请帮我看看这张图片，如果是建材/装修相关的图片，告诉我这是什么材料、大概规格和价格区间。如果不是建材相关的，请礼貌告知。',
          history: [],
          city: '西安',
          imageBase64: base64,
        },
        success: (res) => {
          if (res.data && res.data.code === 200) {
            const data = res.data.data;
            const aiMsg = {
              id: Date.now() + 1,
              role: 'assistant',
              text: data.text || '收到图片了',
              materials: data.materials || null,
              shops: data.shops || null,
            };
            that.setData({
              messages: [...that.data.messages, aiMsg],
              loading: false,
              scrollTo: `msg-${aiMsg.id}`,
            });
            that.saveHistory(that.data.messages);
          } else {
            that.setData({ loading: false });
            const aiMsg = {
              id: Date.now() + 1,
              role: 'assistant',
              text: '我看到这张图了。如果这是户型图/设计图，请告诉我这是什么空间，我来帮你计算材料。如果是装修效果图，告诉我你喜欢哪种风格，我推荐对应的材料和店铺。',
            };
            that.setData({
              messages: [...that.data.messages, aiMsg],
              scrollTo: `msg-${aiMsg.id}`,
            });
            that.saveHistory(that.data.messages);
          }
        },
        fail: () => {
          that.setData({ loading: false });
          const aiMsg = {
            id: Date.now() + 1,
            role: 'assistant',
            text: '我看到这张图了。如果这是户型图/设计图，请告诉我这是什么空间，我来帮你计算材料。如果是装修效果图，告诉我你喜欢哪种风格，我推荐对应的材料和店铺。',
          };
          that.setData({
            messages: [...that.data.messages, aiMsg],
            scrollTo: `msg-${aiMsg.id}`,
          });
          that.saveHistory(that.data.messages);
        },
      });
    } catch (e) {
      // 文件读取失败，回退到文本模式
      that.setData({ loading: false });
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        text: '抱歉，图片读取失败。你可以描述一下图片内容，我来帮你分析。或者你可以直接描述需求，比如"客厅地面铺什么好"。',
      };
      that.setData({
        messages: [...that.data.messages, aiMsg],
        scrollTo: `msg-${aiMsg.id}`,
      });
      that.saveHistory(that.data.messages);
    }
  },

  /** 材料加入购物车 */
  onAddToCart(e) {
    const { name, spec, qty, unit, pricemin, pricemax } = e.currentTarget.dataset;
    try {
      let cart = wx.getStorageSync('cart') || [];
      cart.push({
        id: Date.now(),
        name: name,
        spec: spec || '',
        qty: qty || 1,
        unit: unit || '件',
        price: Math.round((pricemin + pricemax) / 2), // 取中间价
        priceMin: pricemin,
        priceMax: pricemax,
        checked: true,
      });
      wx.setStorageSync('cart', cart);
      wx.showToast({ title: '已加入购物车', icon: 'success' });
      // 更新tabBar角标
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ cartCount: cart.length });
      }
    } catch (err) {
      wx.showToast({ title: '加入失败', icon: 'none' });
    }
  },

  /** 材料一键下单 */
  onBuyNow(e) {
    const { name, spec, qty, unit, pricemin, pricemax } = e.currentTarget.dataset;
    const item = {
      id: Date.now(),
      name: name,
      spec: spec || '',
      qty: qty || 1,
      unit: unit || '件',
      price: Math.round((pricemin + pricemax) / 2),
    };
    // 跳转创建订单页面
    wx.navigateTo({
      url: `/pages/order-create/order-create?fromAI=1&item=${encodeURIComponent(JSON.stringify(item))}`,
    });
  },

  onShopTap(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/shop-detail/shop-detail?shopId=' + encodeURIComponent(id) + '&shopName=' + encodeURIComponent(name) });
  },

  /* ═══════ 语音输入 ═══════ */
  initVoiceRecorder() {
    const that = this;
    this.recorder = wx.getRecorderManager();

    this.recorder.onStart(() => {
      that.setData({ isRecording: true, recordTime: 0 });
      // 震动反馈
      wx.vibrateShort({ type: 'medium' });
      // 计时器
      that._recordTimer = setInterval(() => {
        that.setData({ recordTime: that.data.recordTime + 1 });
      }, 1000);
    });

    this.recorder.onStop((res) => {
      that.setData({ isRecording: false });
      clearInterval(that._recordTimer);
      const duration = res.duration;

      // 录音太短（<1秒）忽略
      if (duration < 800) {
        wx.showToast({ title: '录音时间太短', icon: 'none' });
        return;
      }

      // 发送语音消息
      const voiceMsg = {
        id: Date.now(),
        role: 'user',
        text: '[语音消息]',
        voicePath: res.tempFilePath,
        voiceDuration: Math.round(duration / 1000),
      };
      const msgs = [...that.data.messages, voiceMsg];
      that.setData({ messages: msgs, scrollTo: `msg-${voiceMsg.id}` });
      that.saveHistory(msgs);

      // 模拟AI响应语音
      that.setData({ loading: true });
      setTimeout(() => {
        const aiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          text: '收到你的语音消息了。语音功能目前为演示模式，后续将接入语音识别实现语音对话。你可以打字描述需求，我来帮你找材料、算用量。',
        };
        that.setData({
          messages: [...that.data.messages, aiMsg],
          loading: false,
          scrollTo: `msg-${aiMsg.id}`,
        });
        that.saveHistory(that.data.messages);
      }, 800);
    });

    this.recorder.onError((err) => {
      that.setData({ isRecording: false });
      clearInterval(that._recordTimer);
      console.error('录音失败:', err);
      wx.showToast({ title: '录音失败，请重试', icon: 'none' });
    });
  },

  /** 开始录音 */
  onVoiceStart() {
    if (this.data.loading) return;
    this.recorder.start({
      duration: 60000,   // 最长60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3',
    });
  },

  /** 停止录音 */
  onVoiceEnd() {
    if (this.data.isRecording) {
      this.recorder.stop();
    }
  },

  /** 录音取消（手指滑出按钮 / 系统中断） */
  onVoiceCancel() {
    if (this.data.isRecording) {
      this.recorder.stop();
      // 取消不发送消息，清除弹起的界面
      this.setData({ isRecording: false });
      clearInterval(this._recordTimer);
      wx.showToast({ title: '已取消录音', icon: 'none', duration: 1000 });
    }
  },
});
