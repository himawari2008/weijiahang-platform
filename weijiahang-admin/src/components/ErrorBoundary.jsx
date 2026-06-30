import React from 'react';
import { Result, Button } from 'antd';

/**
 * 全局错误边界 — 防止任意页面组件崩溃导致整个路由区域白屏
 * 包裹方式: <ErrorBoundary><YourPage /></ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] 页面崩溃:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="页面加载异常"
          subTitle={this.state.error?.message || '组件渲染时发生未知错误，请刷新后重试'}
          extra={
            <Button type="primary" style={{ background: '#FF6B35', borderColor: '#FF6B35' }} onClick={this.handleReset}>
              刷新页面
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
