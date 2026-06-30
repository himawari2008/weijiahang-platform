var api = require('../../utils/api');

Page({
  data: {
    categoryOptions: [
      { key: 'all', label: '全部' },
      { key: 'service', label: '服务规范' },
      { key: 'inspection', label: '验货标准' },
      { key: 'communication', label: '沟通技巧' },
      { key: 'safety', label: '安全指南' },
    ],

    activeTab: 'all',
    passedCount: 0,
    totalCount: 0,
    headerTitle: '培训中心',
    headerDescription: '完成全部课程可获取领航员认证证书',

    courseListAll: [],
    courseListService: [],
    courseListInspection: [],
    courseListCommunication: [],
    courseListSafety: [],
    currentList: [],
    loading: true,
    error: false,
  },

  onLoad: function () {
    this.fetchCourses();
  },

  /** 从后端加载课程列表 */
  fetchCourses: function () {
    var that = this;
    that.setData({ loading: true, error: false });

    api.getCourses().then(function (rawCourses) {
      that._buildDisplay(rawCourses);
      that.setData({ loading: false });
    }).catch(function () {
      // 降级：使用本地模拟数据
      that._useSimulatedData();
      that.setData({ loading: false });
    });
  },

  /** 从原始数据构建展示列表 */
  _buildDisplay: function (rawCourses) {
    if (!rawCourses || !rawCourses.length) {
      this.setData({ error: true });
      return;
    }

    var courses = [];
    for (var i = 0; i < rawCourses.length; i++) {
      var c = rawCourses[i];
      courses.push({
        id: c.id,
        title: c.title,
        duration: c.duration || 0,
        category: c.category || 'service',
        status: c.status || 'not_started',
        progress: c.progress || 0,
        score: c.score || 0,
        durationText: (c.duration || 0) + 'min',
        progressPercent: (c.progress || 0) + '%',
        statusText: this._getStatusText(c.status),
        statusClass: this._getStatusClass(c.status),
        hasScore: c.status === 'completed' && c.score > 0,
        scoreBadge: (c.status === 'completed' && c.score > 0) ? c.score + '分' : '',
      });
    }

    // 按分类拆分
    var byCategory = { service: [], inspection: [], communication: [], safety: [] };
    for (var j = 0; j < courses.length; j++) {
      var cat = courses[j].category;
      if (byCategory[cat]) byCategory[cat].push(courses[j]);
    }

    var completed = 0;
    for (var k = 0; k < courses.length; k++) {
      if (courses[k].status === 'completed') completed++;
    }

    var listMap = {
      all: courses,
      service: byCategory.service,
      inspection: byCategory.inspection,
      communication: byCategory.communication,
      safety: byCategory.safety,
    };

    this.setData({
      courseListAll: courses,
      courseListService: byCategory.service,
      courseListInspection: byCategory.inspection,
      courseListCommunication: byCategory.communication,
      courseListSafety: byCategory.safety,
      currentList: listMap[this.data.activeTab] || courses,
      passedCount: completed,
      totalCount: courses.length,
    });
  },

  /** 本地模拟数据（降级方案） */
  _useSimulatedData: function () {
    var raw = [
      { id: 'course_1', title: '领航员入门：服务流程全解析', duration: 12, category: 'service', status: 'in_progress', progress: 80, score: 0 },
      { id: 'course_2', title: '验货标准操作：瓷砖篇', duration: 8, category: 'inspection', status: 'completed', progress: 100, score: 92 },
      { id: 'course_3', title: '验货标准操作：地板篇', duration: 6, category: 'inspection', status: 'not_started', progress: 0, score: 0 },
      { id: 'course_4', title: '如何与业主高效沟通', duration: 10, category: 'communication', status: 'not_started', progress: 0, score: 0 },
      { id: 'course_5', title: '紧急情况处理指南', duration: 5, category: 'safety', status: 'not_started', progress: 0, score: 0 },
    ];
    this._buildDisplay(raw);
  },

  _getStatusText: function (status) {
    if (status === 'in_progress') return '学习中';
    if (status === 'completed') return '已完成';
    return '未开始';
  },

  _getStatusClass: function (status) {
    if (status === 'in_progress') return 'status-learning';
    if (status === 'completed') return 'status-done';
    return 'status-pending';
  },

  onTabTap: function (e) {
    var key = e.currentTarget.dataset.key;
    if (key === this.data.activeTab) return;

    var listMap = {
      all: 'courseListAll',
      service: 'courseListService',
      inspection: 'courseListInspection',
      communication: 'courseListCommunication',
      safety: 'courseListSafety',
    };

    this.setData({
      activeTab: key,
      currentList: this.data[listMap[key]],
    });
  },

  onCourseTap: function (e) {
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: '/pages/exam/exam?courseId=' + id + '&courseName=' + encodeURIComponent(name),
    });
  },

  onActionTap: function (e) {
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: '/pages/exam/exam?courseId=' + id + '&courseName=' + encodeURIComponent(name),
    });
  },
});
