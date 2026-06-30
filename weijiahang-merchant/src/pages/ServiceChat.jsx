import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card, Input, Button, List, Avatar, Badge, Tag, Space, Empty, Skeleton, message, Segmented, Upload,
} from 'antd';
import {
  SendOutlined, UserOutlined, PictureOutlined, SmileOutlined,
  MessageOutlined, CustomerServiceOutlined, ClockCircleOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSocket, SOCKET_EVENTS } from '../hooks/useOrderSocket';

const { TextArea } = Input;
const ORANGE = '#FF6B35';

/** 模拟会话列表 */
const MOCK_CONVERSATIONS = [
  { id: 'conv_1', userName: '王大伟', avatar: '王', lastMsg: '这个瓷砖还有货吗？', time: dayjs().subtract(5, 'minute').toISOString(), unread: 2, status: 'active' },
  { id: 'conv_2', userName: '李阿姨', avatar: '李', lastMsg: '地址发你了吗', time: dayjs().subtract(1, 'hour').toISOString(), unread: 0, status: 'active' },
  { id: 'conv_3', userName: '张明辉-领航员', avatar: '张', lastMsg: '我到店门口了，货备好了吗？', time: dayjs().subtract(2, 'hour').toISOString(), unread: 0, status: 'active' },
  { id: 'conv_4', userName: '陈先生', avatar: '陈', lastMsg: '好的谢谢', time: dayjs().subtract(1, 'day').toISOString(), unread: 0, status: 'closed' },
];

/** 快捷回复模板 */
const QUICK_REPLIES = [
  '您好，欢迎光临！请问有什么可以帮您？',
  '货已备好，随时可以来取。',
  '已在备货中，预计30分钟内完成拍照上传。',
  '请稍等，我帮您查一下库存。',
  '已收到您的订单，我们会尽快处理。',
  '如需退换货，请在订单详情页申请售后。',
];

export default function ServiceChat() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [typingUser, setTypingUser] = useState(null);
  const msgListRef = useRef(null);
  const typingTimerRef = useRef(null);

  // WebSocket 连接
  const wsHost = window.location.hostname;
  const wsPort = import.meta.env.VITE_WS_PORT || '3000';
  const { connected, lastEvent, send } = useSocket({
    url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${wsHost}:${wsPort}/orders?type=merchant&id=xxx`,
    autoConnect: true,
  });

  // 监听 WebSocket 消息
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === SOCKET_EVENTS.CHAT_MESSAGE && activeConv) {
      const msg = lastEvent.data;
      if (msg.conversationId === activeConv.id) {
        setMessages(prev => [...prev, {
          id: `msg_${Date.now()}`,
          text: msg.text,
          from: msg.fromUserId === 'merchant' ? 'merchant' : 'customer',
          time: dayjs().toISOString(),
          type: msg.type || 'text',
          imageUrl: msg.imageUrl,
        }]);
      }
      // 更新会话列表
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId
          ? { ...c, lastMsg: msg.text, time: dayjs().toISOString(), unread: activeConv?.id === c.id ? 0 : (c.unread || 0) + 1 }
          : c
      ));
    }
    if (lastEvent.type === 'typing' && lastEvent.data.conversationId === activeConv?.id) {
      setTypingUser(lastEvent.data.userName);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
    }
    return () => clearTimeout(typingTimerRef.current);
  }, [lastEvent]);

  // 加载会话列表
  useEffect(() => {
    setLoading(true);
    // 模拟加载（实际调用 API）
    setTimeout(() => {
      setConversations(MOCK_CONVERSATIONS);
      setLoading(false);
    }, 600);
  }, []);

  // 加载消息
  const loadMessages = useCallback((conv) => {
    setActiveConv(conv);
    setMsgLoading(true);
    // 模拟加载（实际调用 API）
    setTimeout(() => {
      setMessages([
        { id: 'm1', text: '你好，我在平台上看到了你家的瓷砖', from: 'customer', time: dayjs().subtract(30, 'minute').toISOString() },
        { id: 'm2', text: '请问80×80的玻化砖有什么颜色？', from: 'customer', time: dayjs().subtract(28, 'minute').toISOString() },
        { id: 'm3', text: '您好！我们80×80玻化砖有灰色、米黄、白色三种。灰色卖得最好。', from: 'merchant', time: dayjs().subtract(25, 'minute').toISOString() },
        { id: 'm4', text: '可以发几张实拍图看看吗？', from: 'customer', time: dayjs().subtract(20, 'minute').toISOString() },
        { id: 'm5', text: '好的，我去仓库拍几张', from: 'merchant', time: dayjs().subtract(15, 'minute').toISOString() },
        { id: 'm6', text: '这个瓷砖还有货吗？', from: 'customer', time: dayjs().subtract(5, 'minute').toISOString() },
      ]);
      setMsgLoading(false);
      // 标记已读
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
      // 滚动到底部
      setTimeout(() => {
        msgListRef.current?.scrollTo?.({ top: 99999 });
      }, 100);
    }, 400);
  }, []);

  // 发送消息
  const handleSend = () => {
    const text = inputVal.trim();
    if (!text || !activeConv) return;
    const newMsg = { id: `msg_${Date.now()}`, text, from: 'merchant', time: dayjs().toISOString() };
    setMessages(prev => [...prev, newMsg]);
    setInputVal('');

    // 通过 WebSocket 发送
    if (connected) {
      send({ type: 'chat_message', conversationId: activeConv.id, text, fromUserId: 'merchant' });
    }
    // 更新会话列表
    setConversations(prev => prev.map(c =>
      c.id === activeConv.id ? { ...c, lastMsg: text, time: dayjs().toISOString() } : c
    ));
  };

  // 快捷回复
  const handleQuickReply = (text) => {
    setInputVal(text);
  };

  // 发送图片
  const handleSendImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target.result;
      const newMsg = { id: `msg_${Date.now()}`, text: '[图片]', from: 'merchant', time: dayjs().toISOString(), type: 'image', imageUrl: imgUrl };
      setMessages(prev => [...prev, newMsg]);
      if (connected) {
        send({ type: 'chat_message', conversationId: activeConv.id, text: '[图片]', fromUserId: 'merchant', imageUrl: imgUrl });
      }
    };
    reader.readAsDataURL(file);
    return false; // 阻止默认上传
  };

  // 输入框按键
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter(c =>
    activeTab === 'all' ? true : c.status === activeTab
  );

  const formatTime = (t) => {
    const d = dayjs(t);
    if (d.isSame(dayjs(), 'day')) return d.format('HH:mm');
    if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return '昨天';
    return d.format('MM/DD');
  };

  // 打字动画 CSS，useMemo 避免每次渲染重建 DOM
  const typingStyles = useMemo(() => ({ __html: `
    .typing-dots { display: inline-flex; gap: 3px; align-items: center; }
    .typing-dots .dot {
      width: 4px; height: 4px; border-radius: 50%; background: #999;
      animation: typingBounce 1.4s infinite ease-in-out both;
    }
    .typing-dots .dot:nth-child(1) { animation-delay: 0s; }
    .typing-dots .dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typingBounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
  ` }), []);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 16 }}>
      {/* 左侧会话列表 */}
      <Card
        title={<Space><CustomerServiceOutlined />客户咨询</Space>}
        style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, overflow: 'auto', padding: 0 } }}
        extra={
          <Segmented
            size="small"
            options={[
              { value: 'active', label: '活跃' },
              { value: 'closed', label: '已结束' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        }
      >
        {loading ? (
          <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
        ) : filteredConversations.length === 0 ? (
          <Empty description="暂无会话" style={{ padding: 40 }} />
        ) : (
          <List
            dataSource={filteredConversations}
            renderItem={(item) => (
              <div
                onClick={() => loadMessages(item)}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  background: activeConv?.id === item.id ? '#FFF0EB' : '#fff',
                  borderBottom: '1px solid #f0f0f0',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Badge count={item.unread} size="small" offset={[-4, 4]}>
                    <Avatar style={{ background: ORANGE }}>{item.avatar}</Avatar>
                  </Badge>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{item.userName}</span>
                      <span style={{ fontSize: 12, color: '#999' }}>{formatTime(item.time)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {item.lastMsg}
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </Card>

      {/* 右侧聊天区域 */}
      <Card
        title={activeConv ? (
          <Space>
            <Avatar size="small" style={{ background: ORANGE }}>{activeConv.avatar}</Avatar>
            <span>{activeConv.userName}</span>
            {activeConv.status === 'active' ? <Tag color="green">在线</Tag> : <Tag color="default">已结束</Tag>}
          </Space>
        ) : (
          <span style={{ color: '#999' }}>选择一个会话开始聊天</span>
        )}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 0 } }}
        extra={connected ?<Tag color="green">实时连接中</Tag> : <Tag color="orange">连接中...</Tag>}
      >
        {/* 消息列表 */}
        <div ref={msgListRef} style={{ flex: 1, overflow: 'auto', padding: '16px 20px', background: '#FAFAFA' }}>
          {msgLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : !activeConv ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Empty description={<span><MessageOutlined style={{ fontSize: 48, color: '#ccc' }} /><br />选择左侧会话开始聊天</span>} />
            </div>
          ) : (
            <div>
              {messages.map((msg) => (
                <div key={msg.id} style={{
                  display: 'flex', justifyContent: msg.from === 'merchant' ? 'flex-end' : 'flex-start',
                  marginBottom: 16,
                }}>
                  {msg.from !== 'merchant' && (
                    <Avatar size={32} style={{ background: ORANGE, marginRight: 8, flexShrink: 0 }}>
                      {activeConv?.avatar || <UserOutlined />}
                    </Avatar>
                  )}
                  <div style={{ maxWidth: '70%' }}>
                    {msg.type === 'image' ? (
                      <img src={msg.imageUrl} alt="聊天图片" style={{ maxWidth: 200, borderRadius: 8, cursor: 'pointer' }}
                        onClick={() => window.open(msg.imageUrl)} />
                    ) : (
                      <div style={{
                        padding: '10px 14px', borderRadius: 12,
                        background: msg.from === 'merchant' ? ORANGE : '#fff',
                        color: msg.from === 'merchant' ? '#fff' : '#333',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        fontSize: 14, lineHeight: 1.5,
                      }}>
                        {msg.text}
                      </div>
                    )}
                    <div style={{
                      fontSize: 11, color: '#999', marginTop: 4,
                      textAlign: msg.from === 'merchant' ? 'right' : 'left',
                    }}>
                      {formatTime(msg.time)}
                    </div>
                  </div>
                </div>
              ))}
              {/* 对方正在输入 */}
              {typingUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Avatar size={24} style={{ background: ORANGE }}>{activeConv?.avatar}</Avatar>
                  <span style={{ fontSize: 12, color: '#999' }}>对方正在输入</span>
                  <span className="typing-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 快捷回复 */}
        {activeConv && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', background: '#FAFAFA', overflow: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
              {QUICK_REPLIES.map((text, i) => (
                <Button
                  key={i} size="small" type="dashed"
                  style={{ flexShrink: 0, fontSize: 12 }}
                  onClick={() => handleQuickReply(text)}
                >
                  {text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 输入区域 */}
        {activeConv && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Upload showUploadList={false} beforeUpload={handleSendImage} accept="image/*">
                <Button icon={<PictureOutlined />} type="text" size="small" />
              </Upload>
              <TextArea
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息，Enter发送，Shift+Enter换行"
                autoSize={{ minRows: 1, maxRows: 3 }}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!inputVal.trim()}
                style={{ background: ORANGE, borderColor: ORANGE }}
              >
                发送
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* CSS 动画 */}
      <style dangerouslySetInnerHTML={typingStyles} />
    </div>
  );
}
