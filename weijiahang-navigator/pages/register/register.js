var app = getApp();

/**
 * 注册页面 - 4步认证流程
 * Step 1: 实名信息
 * Step 2: 身份认证（拍照）
 * Step 3: 市场考核（5题单选，3/5通过）
 * Step 4: 技能选择
 */
Page({
  data: {
    // 步骤管理
    currentStep: 1,
    totalSteps: 4,
    stepTitles: ['实名信息', '身份认证', '市场考核', '技能选择'],
    stepProgress: [
      { label: '实名信息', active: true },
      { label: '身份认证', active: false },
      { label: '市场考核', active: false },
      { label: '技能选择', active: false }
    ],

    // Step 1: 实名信息
    realName: '',
    idCard: '',
    phone: '',
    step1Errors: {},

    // Step 2: 身份认证
    idCardFront: '',
    idCardBack: '',
    faceVerified: false,
    step2Errors: {},

    // Step 3: 市场考核
    selectedMarkets: [],
    marketOptions: [],  // API动态加载
    // 考核题目
    quizQuestions: [
      {
        id: 1,
        question: '某客户需要800×800的亮面瓷砖，以下哪种描述最准确？',
        options: ['A. 这是玻化砖，吸水率低于0.5%', 'B. 这是釉面砖，需要泡水后铺贴', 'C. 这是通体砖，表面不需要处理', 'D. 这是马赛克，需要拼花铺贴'],
        answer: 0,
        explanation: '800×800亮面砖通常为玻化砖（抛光砖），吸水率低，不需泡水'
      },
      {
        id: 2,
        question: '实木复合地板与强化地板的区别，哪个说法正确？',
        options: ['A. 实木复合地板不能用于地暖', 'B. 强化地板耐磨层决定使用寿命', 'C. 实木复合地板比强化地板更怕水', 'D. 强化地板可以随意打磨翻新'],
        answer: 1,
        explanation: '强化地板的耐磨层（三氧化二铝）直接影响使用寿命'
      },
      {
        id: 3,
        question: '卫生间防水高度至少应做到多少？',
        options: ['A. 淋浴区1.5米，干区0.3米', 'B. 淋浴区1.8米，干区0.5米', 'C. 全屋统一1.2米', 'D. 淋浴区2.0米，干区1.0米'],
        answer: 1,
        explanation: '淋浴区防水1.8米，干区0.5米是国标最低要求'
      },
      {
        id: 4,
        question: '客户说"我要3分光的水性漆"，以下哪个理解正确？',
        options: ['A. 30%光泽度，适合墙面', 'B. 3%光泽度，接近哑光', 'C. 三分之一的浓度，需要稀释', 'D. 30分钟后干燥的漆'],
        answer: 0,
        explanation: '3分光指30%光泽度，是水性木器漆常见的光泽等级'
      },
      {
        id: 5,
        question: '以下哪种情况最适合向客户推荐陪逛服务？',
        options: ['A. 客户已经确定品牌和型号', 'B. 客户第一次装修，对材料完全不了解', 'C. 客户只需要送货上门', 'D. 客户在网上已经下单'],
        answer: 1,
        explanation: '陪逛服务最适合完全不懂材料的客户，领航员可以提供专业建议'
      }
    ],
    quizAnswers: {},       // { questionId: selectedIndex }
    quizResult: null,      // { passed, score, total }
    quizSubmitted: false,

    // Step 4: 技能选择
    skillOptions: [
      { id: 'tile', label: '瓷砖', icon: 'tile', selected: false },
      { id: 'floor', label: '地板', icon: 'floor', selected: false },
      { id: 'bath', label: '卫浴', icon: 'bath', selected: false },
      { id: 'door', label: '门窗', icon: 'door', selected: false },
      { id: 'paint', label: '涂料', icon: 'paint', selected: false },
      { id: 'light', label: '灯具', icon: 'light', selected: false },
      { id: 'hardware', label: '五金', icon: 'hardware', selected: false },
      { id: 'aid', label: '辅材', icon: 'aid', selected: false },
      { id: 'stone', label: '石材', icon: 'stone', selected: false }
    ],
    serviceTypeOptions: [
      { id: 'navigation', label: '导航带路', selected: false, desc: '帮客户快速找到目标店铺' },
      { id: 'accompany', label: '陪逛选购', selected: false, desc: '陪同客户逛市场、对比选品' },
      { id: 'inspection', label: '验货服务', selected: false, desc: '到店检查货物质量和数量' }
    ],
    specialSkills: {
      bargain: false,       // 砍价
      dialect: false,       // 方言
      hasVehicle: false     // 有货车
    },
    experienceYears: 0,
    experienceOptions: ['1年以下', '1-3年', '3-5年', '5-10年', '10年以上'],
    experienceIndex: -1,
    step4Errors: {},

    // 提交状态
    submitting: false,
    registerSuccess: false,

    // WXML 预计算字段
    selectedMarketNames: '',
    skillNames: '',
    serviceTypeNames: '',
    expText: '',
  },

  /* ========== 生命周期 ========== */

  onLoad: function () {
    this._updateStepProgress();
    this._loadMarketOptions();
  },

  /** 加载市场选项：API优先 + Mock降级 */
  _loadMarketOptions: function () {
    var that = this;
    var api = require('../../utils/api');
    api.getMarkets().then(function (list) {
      if (list.length > 0) {
        var options = list.map(function (m) {
          return { id: m.id, name: m.name, selected: false };
        });
        that.setData({ marketOptions: options });
        return;
      }
      throw new Error('空数据');
    }).catch(function () {
      // API不可用，显示空状态
      that.setData({ marketOptions: [] });
    });
  },

  /* ========== 步骤进度 ========== */

  _updateStepProgress: function () {
    var step = this.data.currentStep;
    var progress = [];

    for (var i = 0; i < this.data.totalSteps; i++) {
      var idx = i + 1;
      progress.push({
        label: this.data.stepTitles[i],
        active: idx === step,
        completed: idx < step,
        number: idx
      });
    }

    this.setData({ stepProgress: progress });
  },

  goNextStep: function () {
    var step = this.data.currentStep;

    // 按步骤校验
    switch (step) {
      case 1:
        if (!this._validateStep1()) return;
        break;
      case 2:
        if (!this._validateStep2()) return;
        break;
      case 3:
        if (!this._validateStep3()) return;
        break;
      case 4:
        if (!this._validateStep4()) return;
        break;
    }

    if (step < this.data.totalSteps) {
      this.setData({ currentStep: step + 1 });
      this._updateStepProgress();
      // 滚动到顶部
      wx.pageScrollTo({ scrollTop: 0 });
    } else {
      this._submitRegister();
    }
  },

  goPrevStep: function () {
    if (this.data.currentStep > 1) {
      this.setData({ currentStep: this.data.currentStep - 1 });
      this._updateStepProgress();
      wx.pageScrollTo({ scrollTop: 0 });
    }
  },

  /* ==========================================
     Step 1: 实名信息
     ========================================== */

  onNameInput: function (e) {
    this.setData({ realName: e.detail.value });
  },

  onIdCardInput: function (e) {
    this.setData({ idCard: e.detail.value });
  },

  onPhoneInput: function (e) {
    this.setData({ phone: e.detail.value });
  },

  _validateStep1: function () {
    var errors = {};
    var valid = true;

    if (!this.data.realName || this.data.realName.trim().length < 2) {
      errors.realName = '请输入真实姓名（至少2个字）';
      valid = false;
    }
    if (!this.data.idCard || !this._isValidIdCard(this.data.idCard)) {
      errors.idCard = '请输入正确的18位身份证号';
      valid = false;
    }
    if (!this.data.phone || !this._isValidPhone(this.data.phone)) {
      errors.phone = '请输入正确的11位手机号';
      valid = false;
    }

    this.setData({ step1Errors: errors });
    if (!valid) {
      wx.showToast({ title: '请完善信息后再继续', icon: 'none' });
    }
    return valid;
  },

  _isValidIdCard: function (val) {
    return /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(val);
  },

  _isValidPhone: function (val) {
    return /^1[3-9]\d{9}$/.test(val);
  },

  /* ==========================================
     Step 2: 身份认证
     ========================================== */

  onTakeIdFront: function () {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: function (res) {
        that.setData({
          idCardFront: res.tempFilePaths[0],
          'step2Errors.idCardFront': ''
        });
      }
    });
  },

  onTakeIdBack: function () {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: function (res) {
        that.setData({
          idCardBack: res.tempFilePaths[0],
          'step2Errors.idCardBack': ''
        });
      }
    });
  },

  onFaceVerify: function () {
    var that = this;

    wx.showModal({
      title: '人脸验证',
      content: '将调用微信原生人脸识别进行活体检测。\n请确保光线充足，面部无遮挡。',
      confirmText: '开始验证',
      success: function (res) {
        if (res.confirm) {
          wx.showLoading({ title: '验证中...' });

          // 模拟人脸识别（生产环境应接入微信原生生物认证或第三方SDK）
          setTimeout(function () {
            wx.hideLoading();
            that.setData({
              faceVerified: true,
              'step2Errors.faceVerified': ''
            });
            wx.showToast({ title: '人脸验证成功', icon: 'success' });
          }, 2000);
        }
      }
    });
  },

  _validateStep2: function () {
    var errors = {};
    var valid = true;

    if (!this.data.idCardFront) {
      errors.idCardFront = '请拍摄身份证正面';
      valid = false;
    }
    if (!this.data.idCardBack) {
      errors.idCardBack = '请拍摄身份证反面';
      valid = false;
    }
    if (!this.data.faceVerified) {
      errors.faceVerified = '请完成人脸验证';
      valid = false;
    }

    this.setData({ step2Errors: errors });
    if (!valid) {
      wx.showToast({ title: '请完成身份认证再继续', icon: 'none' });
    }
    return valid;
  },

  /* ==========================================
     Step 3: 市场考核（选择常驻市场 + 答题）
     ========================================== */

  onMarketToggle: function (e) {
    var marketId = e.currentTarget.dataset.id;
    var markets = this.data.marketOptions;
    var selectedCount = 0;

    for (var i = 0; i < markets.length; i++) {
      if (markets[i].selected) selectedCount++;
    }

    for (var j = 0; j < markets.length; j++) {
      if (markets[j].id === marketId) {
        if (markets[j].selected) {
          markets[j].selected = false;
          selectedCount--;
        } else {
          if (selectedCount >= 3) {
            wx.showToast({ title: '最多选择3个常驻市场', icon: 'none' });
            return;
          }
          markets[j].selected = true;
          selectedCount++;
        }
        break;
      }
    }

    var selectedNames = [];
    for (var k = 0; k < markets.length; k++) {
      if (markets[k].selected) {
        selectedNames.push(markets[k].name);
      }
    }

    this.setData({
      marketOptions: markets,
      selectedMarketNames: selectedNames.join('、')
    });
  },

  onQuizSelect: function (e) {
    var questionId = Number(e.currentTarget.dataset.qid);
    var optionIndex = Number(e.currentTarget.dataset.oidx);
    var answers = this.data.quizAnswers;
    answers[questionId] = optionIndex;
    this.setData({ quizAnswers: answers });
  },

  onQuizSubmit: function () {
    var questions = this.data.quizQuestions;
    var answers = this.data.quizAnswers;
    var score = 0;
    var total = questions.length;

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (answers[q.id] === q.answer) {
        score++;
      }
    }

    var passed = score >= 3;

    this.setData({
      quizResult: {
        passed: passed,
        score: score,
        total: total
      },
      quizSubmitted: true
    });
  },

  _validateStep3: function () {
    // 先检查是否选了市场
    var selectedMarkets = [];
    for (var i = 0; i < this.data.marketOptions.length; i++) {
      if (this.data.marketOptions[i].selected) {
        selectedMarkets.push(this.data.marketOptions[i]);
      }
    }

    if (selectedMarkets.length === 0) {
      wx.showToast({ title: '请至少选择1个常驻市场', icon: 'none' });
      return false;
    }

    // 检查是否已答题
    if (!this.data.quizSubmitted) {
      wx.showToast({ title: '请先完成市场知识考核', icon: 'none' });
      return false;
    }

    if (this.data.quizResult && !this.data.quizResult.passed) {
      wx.showToast({ title: '考核未通过，请重新答题', icon: 'none' });
      return false;
    }

    return true;
  },

  onQuizRetry: function () {
    this.setData({
      quizAnswers: {},
      quizResult: null,
      quizSubmitted: false
    });
  },

  /* ==========================================
     Step 4: 技能选择
     ========================================== */

  onSkillToggle: function (e) {
    var skillId = e.currentTarget.dataset.id;
    var skills = this.data.skillOptions;

    for (var i = 0; i < skills.length; i++) {
      if (skills[i].id === skillId) {
        skills[i].selected = !skills[i].selected;
        break;
      }
    }

    var names = [];
    for (var j = 0; j < skills.length; j++) {
      if (skills[j].selected) {
        names.push(skills[j].label);
      }
    }

    this.setData({
      skillOptions: skills,
      skillNames: names.join('、')
    });
  },

  onServiceTypeToggle: function (e) {
    var svcId = e.currentTarget.dataset.id;
    var services = this.data.serviceTypeOptions;

    for (var i = 0; i < services.length; i++) {
      if (services[i].id === svcId) {
        services[i].selected = !services[i].selected;
        break;
      }
    }

    var names = [];
    for (var j = 0; j < services.length; j++) {
      if (services[j].selected) {
        names.push(services[j].label);
      }
    }

    this.setData({
      serviceTypeOptions: services,
      serviceTypeNames: names.join('、')
    });
  },

  onSpecialToggle: function (e) {
    var key = e.currentTarget.dataset.key;
    var special = this.data.specialSkills;
    special[key] = !special[key];
    this.setData({ specialSkills: special });
  },

  onExperienceChange: function (e) {
    var idx = Number(e.detail.value);
    var text = this.data.experienceOptions[idx] || '';
    this.setData({
      experienceIndex: idx,
      experienceYears: idx,
      expText: text
    });
  },

  _validateStep4: function () {
    var errors = {};

    if (this.data.experienceIndex < 0) {
      errors.experience = '请选择从业经验';
      this.setData({ step4Errors: errors });
      wx.showToast({ title: '请选择从业经验', icon: 'none' });
      return false;
    }

    this.setData({ step4Errors: {} });
    return true;
  },

  /* ==========================================
     提交注册
     ========================================== */

  _submitRegister: function () {
    var that = this;
    that.setData({ submitting: true });

    // 整理提交数据
    var selectedMarkets = [];
    for (var i = 0; i < that.data.marketOptions.length; i++) {
      if (that.data.marketOptions[i].selected) {
        selectedMarkets.push(that.data.marketOptions[i].id);
      }
    }

    var selectedSkills = [];
    for (var j = 0; j < that.data.skillOptions.length; j++) {
      if (that.data.skillOptions[j].selected) {
        selectedSkills.push(that.data.skillOptions[j].id);
      }
    }

    var serviceTypes = [];
    for (var k = 0; k < that.data.serviceTypeOptions.length; k++) {
      if (that.data.serviceTypeOptions[k].selected) {
        serviceTypes.push(that.data.serviceTypeOptions[k].id);
      }
    }

    var registerData = {
      realName: that.data.realName.trim(),
      idCard: that.data.idCard.trim(),
      phone: that.data.phone.trim(),
      marketIds: selectedMarkets,
      skills: selectedSkills,
      serviceTypes: serviceTypes,
      specialSkills: that.data.specialSkills,
      experienceYears: that.data.experienceIndex
    };

    wx.showLoading({ title: '提交中...' });

    // 调用注册 API
    var api = require('../../utils/api');
    api.register(registerData).then(function (navInfo) {
      wx.hideLoading();
      that.setData({ submitting: false, registerSuccess: true });
      wx.showToast({ title: '注册成功！', icon: 'success' });

      // 更新本地缓存
      wx.setStorageSync('nav_info', navInfo);
      app.globalData.navInfo = navInfo;

      // 显示新人保护提示
      wx.showModal({
        title: '欢迎成为领航员',
        content: '您已进入新人保护期（前20单）\n\n保护内容：\n- 优先派发简单订单\n- 超时免处罚\n- 平台资深领航员一对一指导\n\n开始接单吧！',
        showCancel: false,
        confirmText: '开始接单',
        confirmColor: '#FF6B35',
        success: function () {
          wx.switchTab({ url: '/pages/index/index' });
        }
      });
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ submitting: false });
      var msg = err.message || '注册失败，请重试';
      wx.showToast({ title: msg, icon: 'none' });
      wx.showModal({
        title: '提交失败',
        content: '网络异常，请稍后重试。\n您填写的信息不会丢失。',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  },

  /* ==========================================
     工具方法
     ========================================== */

  onBackHome: function () {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
