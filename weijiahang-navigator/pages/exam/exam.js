// exam.js - 在线考试页面逻辑
var api = require('../../utils/api');

var PASS_THRESHOLD = 80; // 及格线 80 分

Page({
  data: {
    // 页面参数
    courseId: '',
    courseName: '',

    // 题目数据（预计算）
    questions: [],
    // 当前题号（1-based）
    currentIndex: 1,
    // 总题数
    totalCount: 0,

    // 提交按钮是否可用
    canSubmit: false,

    // 结果数据
    showResult: false,
    score: 0,
    passed: false,
    correctCount: 0,

    // 状态
    submitted: false,
    loading: false,
    loadError: false
  },

  onLoad: function (options) {
    var courseId = options.courseId || '';
    var courseName = options.courseName || '未知课程';
    wx.setNavigationBarTitle({ title: courseName + ' - 在线考试' });

    this.setData({
      courseId: courseId,
      courseName: courseName
    });

    this._loadQuestions(courseId);
  },

  /** 从服务端加载题库 */
  _loadQuestions: function (courseId) {
    var that = this;
    that.setData({ loading: true, loadError: false });

    api.getExamQuestions(courseId).then(function (data) {
      var rawQuestions = (data && data.questions) || data || [];
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        that.setData({ loading: false, loadError: true });
        return;
      }

      // 深拷贝并初始化 selected 状态
      var questions = [];
      for (var i = 0; i < rawQuestions.length; i++) {
        var q = rawQuestions[i];
        var opts = [];
        var optionsArr = q.options || [];
        for (var j = 0; j < optionsArr.length; j++) {
          opts.push({
            key: optionsArr[j].key,
            text: optionsArr[j].text,
            selected: false
          });
        }
        questions.push({
          id: q.id,
          question: q.question,
          options: opts,
          answer: q.answer,
          selectedKey: ''
        });
      }

      that.setData({
        questions: questions,
        totalCount: questions.length,
        loading: false
      });
    }).catch(function () {
      that.setData({ loading: false, loadError: true });
    });
  },

  // 选择答案
  onSelect: function (e) {
    if (this.data.submitted) return;

    var qid = e.currentTarget.dataset.qid;
    var key = e.currentTarget.dataset.key;
    var questions = this.data.questions;
    var canSubmit = true;

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (q.id === qid) {
        q.selectedKey = key;
        for (var j = 0; j < q.options.length; j++) {
          q.options[j].selected = (q.options[j].key === key);
        }
        break;
      }
    }

    // 检查是否所有题目都已作答
    for (var k = 0; k < questions.length; k++) {
      if (questions[k].selectedKey === '') {
        canSubmit = false;
        break;
      }
    }

    this.setData({
      questions: questions,
      canSubmit: canSubmit
    });
  },

  // 切换题目
  onSwitchQuestion: function (e) {
    if (this.data.submitted) return;
    var index = e.currentTarget.dataset.index;
    this.setData({ currentIndex: index });
  },

  // 上一题
  onPrev: function () {
    if (this.data.submitted) return;
    if (this.data.currentIndex > 1) {
      this.setData({ currentIndex: this.data.currentIndex - 1 });
    }
  },

  // 下一题
  onNext: function () {
    if (this.data.submitted) return;
    if (this.data.currentIndex < this.data.totalCount) {
      this.setData({ currentIndex: this.data.currentIndex + 1 });
    }
  },

  // 提交考试
  onSubmit: function () {
    if (!this.data.canSubmit || this.data.submitted) return;

    var that = this;
    this.setData({ loading: true });

    var questions = this.data.questions;
    var correctCount = 0;

    for (var i = 0; i < questions.length; i++) {
      if (questions[i].selectedKey === questions[i].answer) {
        correctCount = correctCount + 1;
      }
    }

    var totalCount = questions.length;
    var score = Math.round((correctCount / totalCount) * 100);
    var passed = score >= PASS_THRESHOLD;

    // 构造提交数据
    var answers = [];
    for (var j = 0; j < questions.length; j++) {
      answers.push({
        questionId: questions[j].id,
        selectedKey: questions[j].selectedKey,
        answer: questions[j].answer
      });
    }

    // 调用后端 API 提交成绩
    api.submitExam({
      courseId: that.data.courseId,
      score: score,
      passed: passed ? 1 : 0,
      correctCount: correctCount,
      totalCount: totalCount,
      answers: answers
    }).then(function () {
      // 提交成功
    }).catch(function () {
      // 后端不可用时保持离线可用
    }).then(function () {
      // complete 等价：始终展示结果
      that.setData({
        loading: false,
        submitted: true,
        showResult: true,
        score: score,
        passed: passed,
        correctCount: correctCount
      });
    });
  },

  // 关闭结果弹窗
  onCloseResult: function () {
    this.setData({ showResult: false });
  },

  // 重新考试
  onRetry: function () {
    var questions = this.data.questions;
    // 重置所有选中状态
    for (var i = 0; i < questions.length; i++) {
      questions[i].selectedKey = '';
      for (var j = 0; j < questions[i].options.length; j++) {
        questions[i].options[j].selected = false;
      }
    }

    this.setData({
      questions: questions,
      currentIndex: 1,
      canSubmit: false,
      showResult: false,
      score: 0,
      passed: false,
      correctCount: 0,
      submitted: false,
      loading: false
    });
  },

  // 退出考试
  onExit: function () {
    wx.navigateBack();
  }
});
