import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import axios from 'axios';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DiagnosisPage() {
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('welcome'); // welcome, collecting_info, diagnosing, report_ready
  const [goal, setGoal] = useState('');
  const [completeness, setCompleteness] = useState(0);
  const [knownFacts, setKnownFacts] = useState({});
  const [missingFields, setMissingFields] = useState([]);
  const [messages, setMessages] = useState([]);
  const [report, setReport] = useState(null);
  const [isRestoredSession, setIsRestoredSession] = useState(false);
  const [profileStatus, setProfileStatus] = useState('idle'); // idle, updating, updated, failed
  const [diagnosisHistory, setDiagnosisHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // UI state
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, report
  const [errorMsg, setErrorMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [themeMode, setThemeMode] = useState('light');

  // Header login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState('none');
  const [credits, setCredits] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const messagesEndRef = useRef(null);
  const isComposingRef = useRef(false);

  // 1. 初始化登录与历史会话状态
  useEffect(() => {
    const storedEmail = localStorage.getItem('fde_diagnosis_email');
    const storedPassword = localStorage.getItem('fde_diagnosis_password');
    const storedVerified = localStorage.getItem('fde_diagnosis_verified') === 'true';

    if (storedEmail && storedPassword && storedVerified) {
      setEmail(storedEmail);
      setPassword(storedPassword);
      handleVerifyEmail(storedEmail, storedPassword);
    }

  }, []);

  // 2. 聊天区域自动滚到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      // 在正在生成/流式输出回复时采用瞬时定位 'auto' 以免滚动重叠或抖动；在非流式载入状态下使用 'smooth' 平滑过渡。
      messagesEndRef.current.scrollIntoView({ behavior: isChatLoading ? 'auto' : 'smooth' });
    }
  }, [messages, isChatLoading]);

  // 3. 轮询后台画像抽取进度
  useEffect(() => {
    let timer = null;
    let pollCount = 0;
    const maxPolls = 8; // 最多轮询 24 秒 (8 次 * 3秒)，完美覆盖后台 Gemini 慢提取生命周期

    const poll = async () => {
      if (!sessionId) return;
      pollCount++;
      try {
        const res = await axios.post('/api/diagnosis/session', { id: sessionId, email, password });
        if (res.data?.success) {
          const { session, knownFacts: facts, missingFields: missing } = res.data;
          
          // 每次轮询都静默同步最新数据，让本地快速提取与后台慢提取无缝呈现
          setKnownFacts(facts || {});
          setMissingFields(missing || []);
          setStatus(session.status);

          setCompleteness(prevComp => {
            if (session.completeness > prevComp) {
              const diff = session.completeness - prevComp;
              triggerToast(`✨ 已更新企业画像，完整度 +${diff}%`);
            }
            return session.completeness;
          });

          // 仅在轮询次数达到上限后清除定时器并收尾状态
          if (pollCount >= maxPolls) {
            setProfileStatus('updated');
            if (timer) clearInterval(timer);
          }
        }
      } catch (err) {
        console.error('Polling profile status error:', err);
        if (pollCount >= maxPolls) {
          setProfileStatus('updated'); // 超时也平滑为 updated，保全信心
          if (timer) clearInterval(timer);
        }
      }
    };

    if (profileStatus === 'updating' && sessionId) {
      // 3秒轮询一次
      timer = setInterval(poll, 3000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [profileStatus, sessionId]);

  // 登录/验证邮箱
  const handleVerifyEmail = async (emailToVerify, passwordToVerify) => {
    if (!emailToVerify || !EMAIL_REGEX.test(emailToVerify)) {
      triggerToast('请输入有效的电子邮箱！');
      return;
    }
    if (!passwordToVerify) {
      triggerToast('请输入密码！');
      return;
    }
    setIsCheckingEmail(true);
    setErrorMsg('');
    try {
      const response = await axios.post('/api/diagnosis-auth/pre-check', { email: emailToVerify, password: passwordToVerify });
      if (response.data?.success) {
        setEmailStatus('verified');
        setCredits(response.data.credits);
        localStorage.setItem('fde_diagnosis_email', emailToVerify);
        localStorage.setItem('fde_diagnosis_password', passwordToVerify);
        localStorage.setItem('fde_diagnosis_verified', 'true');
        triggerToast(response.data.isNewUser ? '注册成功：当前无需邮箱验证码，诊断历史会保存到该邮箱账号。' : '验证成功：诊断历史会保存到该邮箱账号。');
        await loadDiagnosisHistory(emailToVerify, passwordToVerify, true);
      }
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.error || '登录失败，请检查配置或网络');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fde_diagnosis_email');
    localStorage.removeItem('fde_diagnosis_password');
    localStorage.removeItem('fde_diagnosis_verified');
    setEmail('');
    setPassword('');
    setEmailStatus('none');
    setCredits(0);
    setDiagnosisHistory([]);
    setSessionId(null);
    setStatus('welcome');
    setMessages([]);
    setKnownFacts({});
    setMissingFields([]);
    setReport(null);
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const renderPrintList = (items) => {
    if (!Array.isArray(items) || items.length === 0) return '<p class="muted">暂无</p>';
    return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  };

  const handleDownloadReportPdf = () => {
    if (!report) {
      triggerToast('请先生成诊断报告');
      return;
    }

    const oppRows = (report.opportunityMap || []).map(item => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.value)}</td>
        <td>${escapeHtml(item.complexity)}</td>
        <td>${escapeHtml(item.priority)}</td>
      </tr>
    `).join('');

    const agents = (report.recommendedAgents || []).map(item => `
      <section>
        <h3>${escapeHtml(item.name)}</h3>
        <p><strong>核心功能：</strong>${escapeHtml(item.description)}</p>
        <p><strong>系统对接：</strong>${escapeHtml(item.integration)}</p>
      </section>
    `).join('');

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>企业 AI 增长转型诊断报告</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #111827; margin: 0; padding: 36px; line-height: 1.65; }
            h1 { font-size: 26px; margin: 0 0 6px; }
            h2 { font-size: 17px; margin: 28px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
            h3 { font-size: 14px; margin: 14px 0 4px; }
            p, li, td, th { font-size: 12px; }
            .meta { color: #6b7280; font-size: 12px; margin-bottom: 22px; }
            .score { display: inline-block; font-size: 34px; font-weight: 800; color: #0f766e; margin-right: 10px; }
            .summary { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
            section { break-inside: avoid; }
            .muted { color: #9ca3af; }
            @page { size: A4; margin: 18mm; }
            @media print { body { padding: 0; } button { display: none; } }
          </style>
        </head>
        <body>
          <h1>企业 AI 增长转型诊断报告</h1>
          <div class="meta">生成时间：${escapeHtml(new Date().toLocaleString())}</div>
          <section class="summary">
            <div><span class="score">${escapeHtml(report.maturityScore)}</span>转型成熟度评分</div>
            <p>${escapeHtml(report.summary)}</p>
          </section>
          <h2>核心流程痛点</h2>
          ${renderPrintList(report.painPoints)}
          <h2>AI 场景落地机会地图</h2>
          <table>
            <thead><tr><th>推荐落地场景</th><th>商业价值</th><th>落地难度</th><th>优先级</th></tr></thead>
            <tbody>${oppRows || '<tr><td colspan="4" class="muted">暂无</td></tr>'}</tbody>
          </table>
          <h2>推荐智能体设计</h2>
          ${agents || '<p class="muted">暂无</p>'}
          <h2>30/60/90 天落地路线图</h2>
          <p><strong>Day 30：</strong>${escapeHtml(report.roadmap30_60_90?.day30)}</p>
          <p><strong>Day 60：</strong>${escapeHtml(report.roadmap30_60_90?.day60)}</p>
          <p><strong>Day 90：</strong>${escapeHtml(report.roadmap30_60_90?.day90)}</p>
          <h2>必备数据与接口准备</h2>
          ${renderPrintList(report.dataRequirements)}
          <h2>潜在落地风险与合规建议</h2>
          ${renderPrintList(report.risks)}
          <h2>建议专家深度沟通问题</h2>
          ${renderPrintList(report.nextActions)}
        </body>
      </html>`;

    const existingFrame = document.getElementById('diagnosis-report-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'diagnosis-report-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDoc = frameWindow?.document;
    if (!frameWindow || !frameDoc) {
      iframe.remove();
      triggerToast('浏览器暂时无法打开 PDF 导出，请刷新后重试');
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    iframe.onload = () => {
      setTimeout(() => {
        try {
          frameWindow.focus();
          frameWindow.print();
        } catch (err) {
          console.error('Print report failed:', err);
          triggerToast('浏览器未能打开打印窗口，请重试');
        } finally {
          setTimeout(() => iframe.remove(), 1200);
        }
      }, 250);
    };
  };

  const loadDiagnosisHistory = async (emailToLoad = email, passwordToUse = password, restoreLatest = false) => {
    if (!emailToLoad || !passwordToUse) return;
    setIsHistoryLoading(true);
    try {
      const res = await axios.post('/api/diagnosis/history', {
        email: emailToLoad,
        password: passwordToUse
      });
      if (res.data?.success) {
        const sessions = res.data.sessions || [];
        setDiagnosisHistory(sessions);
        const storedSessionId = localStorage.getItem('diagnosis_session_id');
        const sessionToRestore = sessions.find(item => item.id === storedSessionId) || sessions[0];
        if (restoreLatest && sessionToRestore) {
          await loadSession(sessionToRestore.id, emailToLoad, passwordToUse);
        }
      }
    } catch (err) {
      console.error('Failed to load diagnosis history:', err);
      triggerToast(err.response?.data?.error || '诊断历史加载失败');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDeleteSession = async (sid) => {
    if (!sid || !email || !password) return;
    const confirmed = window.confirm('确定删除这条对话吗？');
    if (!confirmed) return;

    try {
      const res = await axios.post('/api/diagnosis/delete', { sessionId: sid, email, password });
      if (!res.data?.success) {
        triggerToast(res.data?.error || '删除失败');
        return;
      }

      const nextHistory = diagnosisHistory.filter(item => item.id !== sid);
      setDiagnosisHistory(nextHistory);
      triggerToast('已从历史列表删除');

      if (sid === sessionId) {
        localStorage.removeItem('diagnosis_session_id');
        const nextSession = nextHistory[0];
        if (nextSession) {
          await loadSession(nextSession.id);
        } else {
          setSessionId(null);
          setStatus('welcome');
          setCompleteness(0);
          setKnownFacts({});
          setMissingFields([]);
          setMessages([]);
          setReport(null);
          setGoal('');
          setIsRestoredSession(false);
        }
      }
    } catch (err) {
      console.error('Failed to delete diagnosis session:', err);
      triggerToast(err.response?.data?.error || '删除失败，请稍后重试');
    }
  };

  // 加载已有的诊断会话
  const loadSession = async (sid, emailToUse = email, passwordToUse = password) => {
    try {
      const res = await axios.post('/api/diagnosis/session', {
        id: sid,
        email: emailToUse,
        password: passwordToUse
      });
      if (res.data?.success) {
        const { session, messages: historyMsgs, knownFacts: facts, missingFields: missing, report: rep } = res.data;
        setSessionId(session.id);
        setStatus(session.status);
        setCompleteness(session.completeness);
        setKnownFacts(facts || {});
        setMissingFields(missing || []);
        setMessages(historyMsgs || []);
        setReport(rep || null);
        setIsRestoredSession(true); // 已恢复历史会话
        setProfileStatus(session.profileStatus || 'idle');
        localStorage.setItem('diagnosis_session_id', session.id);
        if (rep) {
          setActiveTab('report');
        } else {
          setActiveTab('profile');
        }
      } else {
        localStorage.removeItem('diagnosis_session_id');
      }
    } catch (err) {
      console.error('Failed to load diagnosis session:', err);
      localStorage.removeItem('diagnosis_session_id');
    }
  };

  // 开启新的诊断会话
  const handleStartDiagnosis = async (selectedGoal) => {
    if (emailStatus !== 'verified' || !email || !password) {
      triggerToast('请先登录账号，再开始免费企业 AI 增长转型诊断');
      return;
    }
    if (!selectedGoal) {
      triggerToast('请先选择一个诊断目标');
      return;
    }
    setGoal(selectedGoal);
    setIsChatLoading(true);
    setIsRestoredSession(false); // 新会话，设为 false
    setProfileStatus('idle');
    try {
      const res = await axios.post('/api/diagnosis/start', {
        email,
        password,
        goal: selectedGoal
      });
      if (res.data?.success) {
        const { sessionId: newSid, welcomeText, completeness: newComp, knownFacts: facts, missingFields: missing, status: newStatus } = res.data;
        setSessionId(newSid);
        setStatus(newStatus);
        setCompleteness(newComp);
        setKnownFacts(facts || {});
        setMissingFields(missing || []);
        setMessages([{ sender: 'agent', content: welcomeText, created_at: new Date().toISOString() }]);
        setReport(null);
        setActiveTab('profile');
        localStorage.setItem('diagnosis_session_id', newSid);
        loadDiagnosisHistory(email, password, false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('启动诊断会话失败，请重试');
      triggerToast('启动诊断会话失败，请重试');
    } finally {
      setIsChatLoading(false);
      if (emailStatus === 'verified') {
        loadDiagnosisHistory(email, password, false);
      }
    }
  };

  // 发送消息
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText || inputText.trim() === '') {
      triggerToast('不能提交空消息');
      return;
    }
    if (isChatLoading) return;

    const userMsg = inputText.trim();
    setInputText('');
    
    // 乐观更新 UI 聊天区
    const tempUserMsg = { sender: 'user', content: userMsg, created_at: new Date().toISOString() };
    const tempAgentMsgId = 'agent_temp_' + Date.now();
    const tempAgentMsg = { id: tempAgentMsgId, sender: 'agent', content: '', created_at: new Date().toISOString() };
    
    setMessages(prev => [...prev, tempUserMsg, tempAgentMsg]);
    setIsChatLoading(true);
    setErrorMsg('');
    // 过滤纯提问、短语或闲聊，避免不必要的画像提取转圈
    const shouldExtract = (text) => {
      if (!text) return false;
      const t = text.trim();
      if (t.length < 5) return false;
      if (/^(你好|您好|在吗|在么|谢谢|感谢|hello|hi|👋)$/i.test(t)) return false;
      if (
        t.includes('？') || 
        t.includes('?') || 
        /^(还需要|还要|需要哪些|哪些信息|是什么|怎么做|如何|为什么|啥|什么)/.test(t) ||
        /(什么信息|哪些信息|还要提供什么|还需要提供什么)/.test(t)
      ) return false;
      return true;
    };

    if (shouldExtract(userMsg)) {
      setProfileStatus('updating'); // 仅对携带事实信息的陈述激活后台画像更新状态
    }

    try {
      const response = await fetch('/api/diagnosis/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: userMsg,
          email,
          password
        })
      });

      if (!response.ok) {
        throw new Error('消息发送失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let accumulatedReply = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accumulatedReply += chunk;
          setMessages(prev => {
            return prev.map(msg => {
              if (msg.id === tempAgentMsgId) {
                return { ...msg, content: accumulatedReply };
              }
              return msg;
            });
          });
        }
      }
    } catch (err) {
      console.error(err);
      // 清理临时气泡并显示报错
      setMessages(prev => prev.filter(msg => msg.id !== tempAgentMsgId));
      setErrorMsg('网络异常，消息未成功送达。请重新发送。');
      triggerToast('网络连接失败，请重试');
    } finally {
      setIsChatLoading(false);
    }
  };

  // 生成诊断报告
  const handleGenerateReport = async () => {
    if (isReportLoading) return;
    setIsReportLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post('/api/diagnosis/report', { sessionId, email, password });
      if (res.data?.success) {
        setReport(res.data.report);
        setStatus('report_ready');
        setActiveTab('report');
        triggerToast('🎉 您的企业 AI 增长转型诊断报告已成功生成！');
        // 重新拉取一次对话历史以更新报告生成的系统提示通知
        const sessionRes = await axios.post('/api/diagnosis/session', { id: sessionId, email, password });
        if (sessionRes.data?.success) {
          setMessages(sessionRes.data.messages || []);
        }
      } else {
        triggerToast(res.data?.error || '生成报告失败');
      }
    } catch (err) {
      console.error(err);
      triggerToast('生成报告时发生未知错误，请重试');
    } finally {
      setIsReportLoading(false);
    }
  };

  // 重置/重新诊断
  const handleReset = () => {
    if (window.confirm('您确定要重置当前诊断并开启一份新诊断吗？历史记录将不再在此显示。')) {
      localStorage.removeItem('diagnosis_session_id');
      setSessionId(null);
      setStatus('welcome');
      setCompleteness(0);
      setKnownFacts({});
      setMissingFields([]);
      setMessages([]);
      setReport(null);
      setGoal('');
      setIsRestoredSession(false);
    }
  };

  const goals = [
    '增长转化诊断 (销售/客服/运营 Agent)',
    '降本提效诊断 (把重复活变成自动化)',
    'AI 试点落地诊断 (30天内见到小成果)',
    '综合转型诊断 (让顾问帮我梳理方向)'
  ];

  // 渲染诊断维度的显示卡片
  const renderProfileFields = () => {
    const dimensionMapping = {
      basicInfo: { label: '企业规模与场景', desc: '行业、团队、老板关心的业务盘子', icon: '🏢' },
      businessGoal: { label: '增长与降本目标', desc: '增长、降本、提效、少出错', icon: '💰' },
      currentProcess: { label: '最值得自动化的环节', desc: '重复劳动、卡点、客户等待', icon: '🔄' },
      dataFoundation: { label: '已有数据资产', desc: '表格、系统、客户记录、知识库', icon: '📊' },
      techFoundation: { label: '现有工具底座', desc: 'CRM/ERP/飞书/企微/工单等', icon: '🛠️' },
      orgFoundation: { label: '谁受益谁拍板', desc: '使用人、负责人、预算和试点部门', icon: '👥' },
      riskConstraints: { label: '不能踩的坑', desc: '隐私、合规、权限、人工复核', icon: '⚠️' },
      successCriteria: { label: '老板愿意买单的结果', desc: '30/60/90 天可衡量改善', icon: '🏆' }
    };

    return Object.keys(dimensionMapping).map((key) => {
      const isKnown = !!knownFacts[key];
      const detail = knownFacts[key];
      const meta = dimensionMapping[key];

      return (
        <div key={key} className={`profile-item-card ${isKnown ? 'known' : 'unknown'}`}>
          <div className="card-top">
            <span className="card-icon">{meta.icon}</span>
            <div className="card-info">
              <h4>{meta.label}</h4>
              <p className="card-desc-placeholder">{meta.desc}</p>
            </div>
            <span className={`status-badge ${isKnown ? 'status-known' : 'status-unknown'}`}>
              {isKnown ? '已提取' : '待补充'}
            </span>
          </div>
          {isKnown ? (
            <div className="card-body-text">{detail}</div>
          ) : (
            <div className="card-body-empty">顾问访谈中，请在对话中补充...</div>
          )}
        </div>
      );
    });
  };

  // 根据分数获取成熟度级别
  const getMaturityLevel = (score) => {
    if (score <= 30) return { label: '起步期 (信息化不足)', color: '#ef4444' };
    if (score <= 60) return { label: '探索期 (单点尝试阶段)', color: '#f59e0b' };
    if (score <= 80) return { label: '应用期 (业务流程融入)', color: '#0d9488' };
    return { label: '智能期 (全链路AI协同)', color: '#10b981' };
  };

  const formatHistoryTitle = (item) => {
    if (item.lastUserMessage) {
      return item.lastUserMessage.length > 24 ? `${item.lastUserMessage.slice(0, 24)}...` : item.lastUserMessage;
    }
    return `增长转型诊断 ${new Date(item.createdAt).toLocaleDateString()}`;
  };

  const formatHistoryTime = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleString();
  };

  return (
    <div className={`app-container theme-${themeMode} ${status !== 'welcome' && sessionId ? 'fixed-workbench' : ''}`}>
      <Head>
        <title>FDE FAN Diagnosis | 企业 AI 转型诊断 Agent</title>
        <meta name="description" content="FDE FAN 企业 AI 转型诊断 Agent，用轻量访谈帮助企业识别增长、降本、提效和 30/60/90 天落地路径" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <Header
        title="FDE FAN Diagnosis"
        subtitle="企业 AI 转型诊断 Agent"
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        emailStatus={emailStatus}
        credits={credits}
        isCheckingEmail={isCheckingEmail}
        onVerifyEmail={handleVerifyEmail}
        onLogout={handleLogout}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode(prev => prev === 'light' ? 'dark' : 'light')}
      />

      {showToast && (
        <div className="toast-notification">
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="main-workspace-full">
        {status === 'welcome' || !sessionId ? (
          /* 目标选择欢迎页 */
          <div className="welcome-container">
            <div className="welcome-hero animate-fade-in">
              <span className="welcome-badge">FDE FAN DIAGNOSIS AGENT</span>
              <h1>企业 AI 转型诊断 Agent</h1>
              <p className="welcome-description">
                不先卖方案，不让您填长问卷。通过几轮顾问式对话，帮企业识别增长机会、降本空间、效率瓶颈和 30/60/90 天可落地的 AI 转型路径。
              </p>
            </div>

            <div className="usage-guide-card animate-slide-up">
              <h2>如何开始使用</h2>
              <ol>
                <li><strong>注册 / 登录：</strong>在右上角输入邮箱和密码，首次使用会自动注册。</li>
                <li><strong>账号验证：</strong>再次进入时使用同一邮箱和密码验证身份，历史诊断会自动恢复。</li>
                <li><strong>选择诊断入口：</strong>第一次进入选择一个最接近当前目标的入口，之后会直接进入上次对话。</li>
                <li><strong>开始对话：</strong>直接描述企业最想增长、降本、提效或转型卡住的场景，AI 顾问会逐步追问。</li>
                <li><strong>生成报告：</strong>信息完整后生成企业 AI 增长转型诊断报告，并可导出 PDF。</li>
              </ol>
            </div>

            <div className="goal-selection-card animate-slide-up">
              {emailStatus !== 'verified' && (
                <div className="login-required-banner">
                  请先在右上角登录账号。登录后才能开始免费企业 AI 增长转型诊断，所有对话、画像和报告会自动保存到该账号。
                </div>
              )}
              <h2>选择一个诊断入口</h2>
              <p className="goal-subtitle">选一个最像您当前处境的入口。AI 顾问会先给判断，再用很轻的问题把真实需求梳理出来：</p>
              
              <div className="goals-grid">
                {goals.map((g, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleStartDiagnosis(g)}
                    className="goal-btn-item"
                    disabled={isChatLoading}
                  >
                    <div className="goal-btn-icon">
                      {idx === 0 && '💸'}
                      {idx === 1 && '📈'}
                      {idx === 2 && '⚡'}
                      {idx === 3 && '🧭'}
                    </div>
                    <div className="goal-btn-content">
                      <span className="goal-title-txt">{g.split(' (')[0]}</span>
                      {g.includes('(') && <span className="goal-desc-txt">{g.slice(g.indexOf('('))}</span>}
                    </div>
                    <span className="goal-arrow">→</span>
                  </button>
                ))}
              </div>

	              {isChatLoading && (
                <div className="welcome-loading">
                  <div className="loading-spinner"></div>
                  <span>正在准备企业 AI 增长转型诊断顾问，请稍候...</span>
                </div>
              )}
            </div>

            {emailStatus === 'verified' && (
              <div className="history-card animate-slide-up">
                <div className="history-header">
                  <div>
                    <h3>账号历史诊断</h3>
                    <p>同一账号下的诊断会话都会保存在数据库，重新进入可继续查看。</p>
                  </div>
                  <button
                    type="button"
                    className="btn-history-refresh"
                    onClick={() => loadDiagnosisHistory(email, password, false)}
                    disabled={isHistoryLoading}
                  >
                    刷新
                  </button>
                </div>
                {isHistoryLoading ? (
                  <div className="history-empty">正在加载历史记录...</div>
                ) : diagnosisHistory.length > 0 ? (
                  <div className="history-list">
                    {diagnosisHistory.map(item => (
                      <div
                        key={item.id}
                        className="history-item"
                      >
                        <button type="button" className="history-item-main" onClick={() => loadSession(item.id)}>
                          <span className="history-title">{formatHistoryTitle(item)}</span>
                          <span className="history-meta">{item.completeness}% · {item.messageCount} 条 · {formatHistoryTime(item.updatedAt)}</span>
                        </button>
                        <button type="button" className="history-delete-btn" onClick={() => handleDeleteSession(item.id)} title="删除这条对话">
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="history-empty">这个账号还没有诊断历史。选择上方入口开始第一轮。</div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 诊断工作台主界面 */
          <div className="workbench-layout">
            
            {/* 左侧分栏：诊断进度和完整度 */}
            <div className="sidebar-col">
              <div className="sidebar-card">
                <h3 className="section-title">诊断进度</h3>
                
                {/* 完整度刻度 */}
                <div className="completeness-block">
                  <div className="completeness-circle-container">
                    <svg viewBox="0 0 100 100" className="progress-circle">
                      <circle cx="50" cy="50" r="42" className="progress-bg"></circle>
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        className="progress-bar"
                        style={{ strokeDasharray: `${2 * Math.PI * 42}`, strokeDashoffset: `${2 * Math.PI * 42 * (1 - completeness / 100)}` }}
                      ></circle>
                    </svg>
                    <div className="progress-text-overlay">
                      <span className="percent-num">{completeness}%</span>
                      <span className="percent-label">机会清晰度</span>
                    </div>
                  </div>
                </div>

                {/* 状态阶段提示 */}
                <div className="state-badge-container">
                  <span className="state-label">当前阶段:</span>
                  <span className={`state-value-tag ${status}`}>
                    {status === 'collecting_info' && '正在梳理增长与转型线索'}
                    {status === 'clarifying' && '锁定可落地小切口'}
                    {status === 'researching' && '匹配行业可抄作业案例'}
                    {status === 'diagnosing' && '测算机会优先级'}
                    {status === 'report_ready' && '诊断报告已就绪'}
                  </span>
                </div>

                <div className="divider"></div>

                <div className="history-mini-block">
                  <div className="history-mini-title">
                    <span>账号历史</span>
                    <button type="button" onClick={() => loadDiagnosisHistory(email, password, false)} disabled={isHistoryLoading}>刷新</button>
                  </div>
                  {diagnosisHistory.length > 0 ? (
                    <div className="history-mini-list">
                      {diagnosisHistory.slice(0, 6).map(item => (
                        <div
                          key={item.id}
                          className={`history-mini-item ${item.id === sessionId ? 'active' : ''}`}
                        >
                          <button type="button" className="history-mini-main" onClick={() => loadSession(item.id)}>
                            <span>{formatHistoryTitle(item)}</span>
                            <small>{item.completeness}% · {formatHistoryTime(item.updatedAt)}</small>
                          </button>
                          <button type="button" className="history-mini-delete" onClick={() => handleDeleteSession(item.id)} title="删除">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="history-mini-empty">暂无历史</div>
                  )}
                </div>

                <div className="divider"></div>

                {/* 缺失维度提醒 */}
                <div className="missing-list-block">
                  <h4>还差这些就能出诊断报告</h4>
                  {missingFields.length > 0 ? (
                    <ul className="missing-fields-list">
                      {missingFields.map((field, idx) => (
                        <li key={idx}>
                          <span className="dot-warn">!</span>
                          <span className="field-name-text">{field.split(' (')[0]}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="missing-empty-state">
                      ✨ 诊断信息已经比较清楚，可以生成报告！
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                  <button onClick={handleReset} className="btn-reset-session">
                    新的对话
                  </button>
                </div>
              </div>
            </div>

            {/* 中间分栏：聊天访谈区 */}
            <div className="chat-col">
              <div className="chat-container-card">
                <div className="chat-header">
                  <div className="status-indicator"></div>
                  <div>
                    <h4>企业 AI 增长转型诊断对话</h4>
                    <span className="chat-sub">先判断方向，再用轻问题沉淀可落地路径</span>
                  </div>
                  {completeness >= 50 && (
                    <button 
                      onClick={handleGenerateReport} 
                      className={`btn-action-report pulse-glow ${isReportLoading ? 'loading' : ''}`}
                      disabled={isReportLoading}
                    >
                      {isReportLoading ? '正在生成诊断报告...' : report ? '✨ 重新生成诊断报告' : '✨ 生成诊断报告'}
                    </button>
                  )}
                </div>

                {/* 对话列表 */}
                <div className="messages-scroller">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`message-bubble-wrapper ${msg.sender}`}>
                      <div className="message-avatar">
                        {msg.sender === 'agent' ? '🤖' : '👤'}
                      </div>
                      <div className="message-bubble-content">
                        <div className="bubble-meta">
                          {msg.sender === 'agent' ? 'AI 增长转型顾问' : '您'}
                        </div>
                        <div className="bubble-text">{msg.content}</div>
                      </div>
                    </div>
                  ))}

                  {isChatLoading && !messages.some(msg => String(msg.id || '').startsWith('agent_temp_') && msg.content) && (
                    <div className="message-bubble-wrapper agent">
                      <div className="message-avatar">🤖</div>
                      <div className="message-bubble-content">
                        <div className="bubble-meta">AI 增长转型顾问正在思考...</div>
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="chat-error-bar">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* 对话底部输入框 */}
                <form onSubmit={handleSendMessage} className="chat-input-wrapper">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="随便说一个最烦、最耗人、最影响成交的环节，例如：报价慢、客户跟进乱、表格填不完..."
                    className="chat-textarea"
                    rows={3}
                    disabled={isChatLoading || isReportLoading}
                    onCompositionStart={() => {
                      isComposingRef.current = true;
                    }}
                    onCompositionEnd={() => {
                      isComposingRef.current = false;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current && !e.nativeEvent?.isComposing) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <div className="input-toolbar">
                    <button 
                      type="submit" 
                      className="btn-send-message"
                      disabled={isChatLoading || isReportLoading || !inputText.trim()}
                      aria-label="发送消息"
                      title="发送消息"
                    >
                      ↑
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* 右侧分栏：实时画像/诊断报告 */}
            <div className="profile-col">
              <div className="tabbed-container-card">
                
                {/* 选项卡头部 */}
                <div className="tabs-header">
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                  >
                    实时诊断画像
                  </button>
                  <button 
                    onClick={() => setActiveTab('report')} 
                    className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
                    disabled={!report && completeness < 50}
                    title={completeness < 50 && !report ? '完整度达到 50% 后解锁报告' : ''}
                  >
                    诊断报告 {!report && completeness < 50 && '🔒'}
                  </button>
                </div>

                {/* 选项卡内容区域 */}
                <div className="tab-content-scroller">
                  {activeTab === 'profile' ? (
                    /* 选项卡一：企业画像 */
                    <div className="profile-tab-view animate-fade-in">
                      <div className="profile-intro">
                        <h5>已识别的诊断线索</h5>
                        <p>越往下聊，越能看清增长空间、降本路径、提效切口和谁最该拍板：</p>
                      </div>

                      {profileStatus === 'updating' && (
                        <div className="profile-status-banner updating animate-fade-in">
                          <span className="spinner-mini"></span>
                          <span>🧭 顾问正在后台把线索整理成机会画像，请继续对话...</span>
                        </div>
                      )}
                      {profileStatus === 'failed' && (
                        <div className="profile-status-banner failed animate-fade-in">
                          <span>⚠️ 部分机会线索整理较慢，您可以继续对话或稍后重试。</span>
                        </div>
                      )}
                      <div className="profile-cards-grid">
                        {renderProfileFields()}
                      </div>
                    </div>
                  ) : (
                    /* 选项卡二：诊断报告 */
                    <div className="report-tab-view animate-fade-in">
                      {report ? (
                        <div className="report-doc-container">
                          <div className="report-actions-row">
                            <button type="button" className="btn-download-report" onClick={handleDownloadReportPdf}>
                              导出 PDF
                            </button>
                          </div>
                          
                          {/* 成熟度大仪表盘 */}
                          <div className="report-hero-card">
                            <div className="maturity-score-gauge">
                              <div className="gauge-value">{report.maturityScore}</div>
                              <div className="gauge-label">转型成熟度评分</div>
                            </div>
                            <div className="maturity-level-desc" style={{ color: getMaturityLevel(report.maturityScore).color }}>
                              🎯 级别评定：{getMaturityLevel(report.maturityScore).label}
                            </div>
                            <p className="report-summary-p">{report.summary}</p>
                          </div>

                          {/* 痛点分类 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">🚨 核心流程痛点</h4>
                            <div className="pain-points-list-container">
                              {report.painPoints?.map((p, i) => (
                                <div key={i} className="pain-bullet">
                                  <span className="pain-badge">痛点 {i + 1}</span>
                                  <p>{p}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 场景落地机会地图 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">🗺️ AI 场景落地机会地图</h4>
                            <div className="table-responsive">
                              <table className="opp-map-table">
                                <thead>
                                  <tr>
                                    <th>推荐落地场景</th>
                                    <th>商业价值</th>
                                    <th>落地难度</th>
                                    <th>优先级</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.opportunityMap?.map((opp, i) => (
                                    <tr key={i}>
                                      <td className="opp-title">{opp.title}</td>
                                      <td><span className={`eval-badge val-${opp.value}`}>{opp.value}</span></td>
                                      <td><span className={`eval-badge cmp-${opp.complexity}`}>{opp.complexity}</span></td>
                                      <td><span className={`pri-badge pri-${opp.priority}`}>{opp.priority}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 推荐 Agents 模块 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">🤖 推荐智能体 (Agents) 设计</h4>
                            <div className="agents-grid-container">
                              {report.recommendedAgents?.map((agent, i) => (
                                <div key={i} className="agent-rec-card">
                                  <h5>{agent.name}</h5>
                                  <p className="agent-desc-para"><strong>核心功能：</strong>{agent.description}</p>
                                  <p className="agent-integ-para"><strong>系统对接：</strong>{agent.integration}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 30-60-90 天路线图 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">📅 30/60/90 天落地路线图</h4>
                            <div className="timeline-container">
                              <div className="timeline-step">
                                <div className="timeline-badge-day">Day 30</div>
                                <div className="timeline-content-card">
                                  <h6>准备与试点阶段</h6>
                                  <p>{report.roadmap30_60_90?.day30}</p>
                                </div>
                              </div>
                              <div className="timeline-step">
                                <div className="timeline-badge-day">Day 60</div>
                                <div className="timeline-content-card">
                                  <h6>核心实施与集成阶段</h6>
                                  <p>{report.roadmap30_60_90?.day60}</p>
                                </div>
                              </div>
                              <div className="timeline-step">
                                <div className="timeline-badge-day">Day 90</div>
                                <div className="timeline-content-card">
                                  <h6>全面上线与效益推广</h6>
                                  <p>{report.roadmap30_60_90?.day90}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 数据/系统准备要求 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">💾 必备数据与接口准备</h4>
                            <ul className="rep-bullet-ul">
                              {report.dataRequirements?.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>

                          {/* 风险合规提醒 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">⚠️ 潜在落地风险与合规建议</h4>
                            <ul className="rep-bullet-ul">
                              {report.risks?.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>

                          {/* 下一步深聊问题 */}
                          <div className="report-section-block">
                            <h4 className="rep-sec-title">🧭 建议专家深度沟通问题</h4>
                            <ul className="rep-bullet-ul-accent">
                              {report.nextActions?.map((act, i) => (
                                <li key={i}>{act}</li>
                              ))}
                            </ul>
                          </div>

                        </div>
                      ) : (
                        <div className="report-unlocked-state">
                          <span className="unlocked-icon">🔒</span>
                          <h5>诊断报告未生成</h5>
                          <p>继续把增长目标、流程瓶颈、数据基础和落地约束讲清楚。诊断信息达到 50% 后，即可生成 30/60/90 天增长转型报告。</p>
                          <div className="unlocked-progress-bar">
                            <div className="unlocked-progress-fill" style={{ width: `${completeness}%` }}></div>
                          </div>
                          <span>当前信息收集度: {completeness} / 50 %</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}
      </main>

      {/* 精细化设计的样式系统 */}
      <style jsx global>{`
        /* 默认根容器，支持欢迎页自然流动与滚动 */
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #0b1120;
        }

        /* 仅在进入访谈工作台后，强行锁定为浏览器视口高度 */
        .app-container.fixed-workbench {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
        }

        .main-workspace-full {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #0b1120;
          position: relative;
        }

        /* 仅在工作台状态下锁死高度，防止内容撑开父容器 */
        .app-container.fixed-workbench .main-workspace-full {
          height: 0;
          overflow: hidden;
        }

        /* 动画库 */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(13, 148, 136, 0); }
          100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Toast 提示 */
        .toast-notification {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(45, 212, 191, 0.4);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(45, 212, 191, 0.2);
          border-radius: 50px;
          padding: 10px 24px;
          z-index: 1000;
          color: #f8fafc;
          font-weight: 500;
          font-size: 0.85rem;
          animation: fadeIn 0.2s ease, slideUp 0.2s ease;
        }

        /* 欢迎页排版 */
        .welcome-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 4rem 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
        }

        .welcome-hero {
          margin-bottom: 2.5rem;
        }

        .welcome-badge {
          background: rgba(13, 148, 136, 0.15);
          border: 1px solid rgba(13, 148, 136, 0.4);
          color: #2dd4bf;
          border-radius: 50px;
          padding: 0.3rem 0.95rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-bottom: 1.2rem;
          display: inline-block;
        }

        .welcome-hero h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 2.8rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 1rem 0;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #ffffff 40%, #0d9488 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .welcome-description {
          font-size: 1.05rem;
          color: #94a3b8;
          line-height: 1.6;
          max-width: 720px;
          margin: 0 auto;
        }

        .usage-guide-card {
          width: 100%;
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 18px;
          padding: 1.35rem 1.5rem;
          margin-bottom: 1rem;
          text-align: left;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
          box-sizing: border-box;
        }

        .usage-guide-card h2 {
          margin: 0 0 0.8rem 0;
          color: #f8fafc;
          font-size: 1rem;
        }

        .usage-guide-card ol {
          margin: 0;
          padding-left: 1.2rem;
          display: grid;
          gap: 0.55rem;
        }

        .usage-guide-card li {
          color: #94a3b8;
          font-size: 0.82rem;
          line-height: 1.55;
        }

        .usage-guide-card strong {
          color: #e2e8f0;
        }

        /* 目标卡片选择 */
        .goal-selection-card {
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 2.5rem;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .login-required-banner {
          margin-bottom: 1rem;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: #fbbf24;
          font-size: 0.82rem;
          line-height: 1.5;
          text-align: left;
        }

        .goal-selection-card h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.4rem;
          margin: 0 0 0.5rem 0;
          color: #f8fafc;
        }

        .goal-subtitle {
          color: #64748b;
          font-size: 0.85rem;
          margin-bottom: 2rem;
        }

        .goals-grid {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .history-card {
          margin-top: 1rem;
          width: 100%;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1rem;
          text-align: left;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 0.85rem;
        }

        .history-header h3 {
          margin: 0;
          font-size: 0.95rem;
          color: #f8fafc;
        }

        .history-header p {
          margin: 4px 0 0 0;
          color: #64748b;
          font-size: 0.75rem;
          line-height: 1.5;
        }

        .btn-history-refresh {
          background: rgba(13, 148, 136, 0.14);
          border: 1px solid rgba(13, 148, 136, 0.3);
          color: #5eead4;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
          font-size: 0.72rem;
        }

        .history-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem;
        }

        .history-item {
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(30, 41, 59, 0.5);
          color: #cbd5e1;
          border-radius: 10px;
          padding: 10px 12px;
          cursor: pointer;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .history-item:hover {
          border-color: rgba(45, 212, 191, 0.35);
          color: #ffffff;
        }

        .history-title {
          font-size: 0.82rem;
          font-weight: 700;
        }

        .history-meta {
          font-size: 0.68rem;
          color: #64748b;
        }

        .history-empty {
          color: #64748b;
          font-size: 0.78rem;
          padding: 0.75rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
        }

        .goal-btn-item {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.1rem 1.5rem;
          display: flex;
          align-items: center;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #94a3b8;
          width: 100%;
        }

        .goal-btn-item:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%);
          border-color: rgba(13, 148, 136, 0.4);
          transform: translateY(-2px);
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.1);
        }

        .goal-btn-icon {
          font-size: 1.8rem;
          margin-right: 1.25rem;
          opacity: 0.85;
        }

        .goal-btn-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .goal-title-txt {
          font-size: 0.95rem;
          font-weight: 600;
          color: #f1f5f9;
        }

        .goal-desc-txt {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.2rem;
        }

        .goal-arrow {
          font-size: 1.2rem;
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.3s ease;
          color: #2dd4bf;
          margin-left: 1rem;
        }

        .goal-btn-item:hover .goal-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        .welcome-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
          font-size: 0.85rem;
          color: #0d9488;
        }

        .loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(13, 148, 136, 0.2);
          border-top-color: #0d9488;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* 诊断工作台网格 */
        .workbench-layout {
          display: grid;
          grid-template-columns: 280px 1fr 420px;
          gap: 1.25rem;
          padding: 1.25rem;
          flex: 1;
          height: calc(100vh - 73px); /* 扣除 Header 高度 */
          box-sizing: border-box;
          overflow: hidden;
        }

        @media (max-width: 1200px) {
          .workbench-layout {
            grid-template-columns: 240px 1fr 360px;
          }
        }

        @media (max-width: 992px) {
          .workbench-layout {
            grid-template-columns: 1fr;
            height: auto;
            overflow: auto;
          }
        }

        /* 侧边栏及卡片 */
        .sidebar-col, .chat-col, .profile-col {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        @media (max-width: 992px) {
          .sidebar-col, .chat-col, .profile-col {
            height: auto;
            overflow: visible;
          }
        }

        .sidebar-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
        }

        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 1.2rem 0;
          letter-spacing: 0.02em;
          border-left: 3px solid #0d9488;
          padding-left: 8px;
        }

        /* 圆环进度条 */
        .completeness-block {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .completeness-circle-container {
          position: relative;
          width: 140px;
          height: 140px;
        }

        .progress-circle {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }

        .progress-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.03);
          stroke-width: 6px;
        }

        .progress-bar {
          fill: none;
          stroke: url(#cyan-gradient); /* 我们使用普通的颜色先兜底 */
          stroke: #0d9488;
          stroke-width: 6px;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-text-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .percent-num {
          font-family: 'Outfit', sans-serif;
          font-size: 1.8rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
        }

        .percent-label {
          font-size: 0.65rem;
          color: #64748b;
          margin-top: 4px;
          font-weight: 500;
        }

        /* 状态阶段 */
        .state-badge-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.4);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          margin-bottom: 1.25rem;
        }

        .state-label {
          font-size: 0.75rem;
          color: #64748b;
        }

        .state-value-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: #38bdf8;
        }

        .state-value-tag.report_ready {
          color: #10b981;
        }

        .state-value-tag.diagnosing {
          color: #f59e0b;
        }

        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.05);
          margin-bottom: 1.25rem;
        }

        .history-mini-block {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .history-mini-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #cbd5e1;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .history-mini-title button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          border-radius: 6px;
          padding: 3px 7px;
          cursor: pointer;
          font-size: 0.65rem;
        }

        .history-mini-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          max-height: 210px;
          overflow-y: auto;
          padding-right: 2px;
        }

        .history-mini-item {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 23, 42, 0.35);
          color: #94a3b8;
          border-radius: 8px;
          padding: 7px;
          text-align: left;
          cursor: default;
          display: flex;
          flex-direction: column;
          gap: 3px;
          box-sizing: border-box;
        }

        .history-mini-item.active {
          border-color: rgba(45, 212, 191, 0.35);
          color: #f8fafc;
          background: rgba(13, 148, 136, 0.1);
        }

        .history-mini-item span {
          font-size: 0.72rem;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .history-mini-item small,
        .history-mini-empty {
          color: #64748b;
          font-size: 0.64rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 缺失列表 */
        .missing-list-block h4 {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0 0 0.75rem 0;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .missing-fields-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .missing-fields-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: #64748b;
          background: rgba(239, 68, 68, 0.02);
          border: 1px dashed rgba(239, 68, 68, 0.1);
          padding: 6px 10px;
          border-radius: 6px;
        }

        .dot-warn {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          font-size: 0.65rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .field-name-text {
          flex: 1;
        }

        .missing-empty-state {
          font-size: 0.75rem;
          color: #10b981;
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.15);
          padding: 10px;
          border-radius: 8px;
          text-align: center;
          font-weight: 500;
        }

        .btn-reset-session {
          background: #0d9488;
          border: 1px solid rgba(13, 148, 136, 0.45);
          color: #ffffff;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s ease;
        }

        .btn-reset-session:hover {
          border-color: rgba(13, 148, 136, 0.65);
          color: #ffffff;
          background: #0f766e;
        }

        /* 中间聊天区样式 */
        .chat-container-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 23, 42, 0.2);
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0d9488;
          box-shadow: 0 0 10px #0d9488;
        }

        .chat-header h4 {
          margin: 0;
          font-size: 0.95rem;
          color: #ffffff;
        }

        .chat-sub {
          font-size: 0.7rem;
          color: #64748b;
          display: block;
        }

        .btn-action-report {
          margin-left: auto;
          background: #0d9488;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-action-report:hover:not(:disabled) {
          background: #0f766e;
          transform: translateY(-1px);
        }

        .pulse-glow {
          animation: pulse 2s infinite;
        }

        /* 气泡聊天滚动区 */
        .messages-scroller {
          flex: 1;
          padding: 1.25rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          background: rgba(15, 23, 42, 0.1);
        }

        .message-bubble-wrapper {
          display: flex;
          gap: 12px;
          max-width: 85%;
        }

        .message-bubble-wrapper.agent {
          align-self: flex-start;
        }

        .message-bubble-wrapper.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .message-bubble-wrapper.agent .message-avatar {
          border-color: rgba(13, 148, 136, 0.3);
          background: rgba(13, 148, 136, 0.15);
        }

        .message-bubble-wrapper.user .message-avatar {
          border-color: rgba(245, 158, 11, 0.3);
          background: rgba(245, 158, 11, 0.15);
        }

        .message-bubble-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bubble-meta {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 500;
        }

        .message-bubble-wrapper.user .bubble-meta {
          text-align: right;
        }

        .bubble-text {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 0.85rem;
          color: #e2e8f0;
          line-height: 1.5;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .message-bubble-wrapper.agent .bubble-text {
          border-top-left-radius: 2px;
        }

        .message-bubble-wrapper.user .bubble-text {
          background: linear-gradient(135deg, rgba(20, 30, 55, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
          border-color: rgba(13, 148, 136, 0.15);
          color: #ffffff;
          border-top-right-radius: 2px;
        }

        .chat-error-bar {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          text-align: center;
        }

        /* 正在输入标志 */
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 12px;
          align-self: flex-start;
          width: fit-content;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #64748b;
          border-radius: 50%;
          animation: bounce 1.2s infinite;
        }

        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* 输入底栏 */
        .chat-input-wrapper {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 23, 42, 0.3);
          position: relative;
          display: block;
        }

        .chat-textarea {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 12px 58px 42px 14px;
          color: white;
          font-family: inherit;
          font-size: 0.85rem;
          line-height: 1.4;
          resize: none;
          width: 100%;
          min-height: 88px;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        .chat-textarea:focus {
          outline: none;
          border-color: #0d9488;
        }

        .input-toolbar {
          position: absolute;
          right: 1.6rem;
          bottom: 1.45rem;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .input-tip {
          font-size: 0.68rem;
          color: #64748b;
        }

        .btn-send-message {
          background: #0d9488;
          border: none;
          color: white;
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 999px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          pointer-events: auto;
        }

        .btn-send-message:hover:not(:disabled) {
          background: #0f766e;
          transform: translateY(-1px) scale(1.02);
        }

        .btn-send-message:disabled {
          background: rgba(148, 163, 184, 0.25);
          color: rgba(255, 255, 255, 0.55);
          cursor: not-allowed;
        }

        /* 右侧分栏 Tab 卡片 */
        .tabbed-container-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .tabs-header {
          display: flex;
          background: rgba(15, 23, 42, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 12px 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
        }

        .tab-btn:hover:not(:disabled) {
          color: #f1f5f9;
        }

        .tab-btn.active {
          color: #0d9488;
          border-bottom-color: #0d9488;
          background: rgba(255, 255, 255, 0.01);
        }

        .tab-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .tab-content-scroller {
          flex: 1;
          padding: 1rem 1.2rem;
          overflow-y: auto;
          box-sizing: border-box;
          min-width: 0;
        }

        /* 实时画像标签页 */
        .profile-intro {
          margin-bottom: 1rem;
        }

        .profile-intro h5 {
          margin: 0 0 4px 0;
          font-size: 0.85rem;
          color: #f1f5f9;
        }

        .profile-intro p {
          margin: 0;
          font-size: 0.7rem;
          color: #64748b;
        }

        .profile-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .profile-item-card {
          border-radius: 12px;
          padding: 10px 12px;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .profile-item-card.unknown {
          background: rgba(15, 23, 42, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .profile-item-card.known {
          background: rgba(13, 148, 136, 0.02);
          border: 1px solid rgba(13, 148, 136, 0.15);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.02);
        }

        .card-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-icon {
          font-size: 1.1rem;
        }

        .card-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .card-info h4 {
          margin: 0;
          font-size: 0.8rem;
          color: #e2e8f0;
        }

        .card-desc-placeholder {
          font-size: 0.65rem;
          color: #64748b;
          margin: 1px 0 0 0;
        }

        .status-badge {
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 4px;
          padding: 2px 6px;
        }

        .status-known {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-unknown {
          background: rgba(255, 255, 255, 0.02);
          color: #64748b;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .card-body-text {
          font-size: 0.75rem;
          color: #f1f5f9;
          line-height: 1.45;
          background: rgba(15, 23, 42, 0.4);
          padding: 8px 10px;
          border-radius: 6px;
        }

        .card-body-empty {
          font-size: 0.7rem;
          color: #64748b;
          font-style: italic;
          padding-left: 2px;
        }

        /* 未解锁报告状态 */
        .report-unlocked-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3rem 1.5rem;
        }

        .unlocked-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .report-unlocked-state h5 {
          font-size: 0.95rem;
          margin: 0 0 8px 0;
          color: #f1f5f9;
        }

        .report-unlocked-state p {
          font-size: 0.75rem;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 20px;
        }

        .unlocked-progress-bar {
          background: rgba(255, 255, 255, 0.04);
          height: 6px;
          border-radius: 10px;
          width: 80%;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .unlocked-progress-fill {
          background: #0d9488;
          height: 100%;
          transition: width 0.3s ease;
        }

        .report-unlocked-state span {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 500;
        }

        /* 诊断报告文档样式 */
        .report-doc-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 0 0.25rem 2rem;
          box-sizing: border-box;
        }

        .report-hero-card {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.06) 0%, rgba(15, 23, 42, 0.4) 100%);
          border: 1px solid rgba(13, 148, 136, 0.25);
          border-radius: 16px;
          padding: 1.25rem;
          text-align: center;
        }

        .maturity-score-gauge {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 8px;
        }

        .gauge-value {
          font-family: 'Outfit', sans-serif;
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1;
        }

        .gauge-label {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .maturity-level-desc {
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .report-summary-p {
          font-size: 0.75rem;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0;
          text-align: left;
          background: rgba(15, 23, 42, 0.5);
          padding: 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.02);
        }

        .report-section-block {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.25rem 0.25rem 0;
          min-width: 0;
        }

        .rep-sec-title {
          font-family: 'Outfit', sans-serif;
          font-size: 0.86rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 10px 0;
          letter-spacing: 0;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .pain-points-list-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pain-bullet {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: rgba(239, 68, 68, 0.03);
          border: 1px solid rgba(239, 68, 68, 0.1);
          padding: 8px 12px;
          border-radius: 8px;
          min-width: 0;
        }

        .pain-badge {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          align-self: flex-start;
          max-width: 100%;
          white-space: normal;
        }

        .pain-bullet p {
          margin: 0;
          font-size: 0.75rem;
          color: #e2e8f0;
          line-height: 1.45;
        }

        /* 机会地图表格 */
        .opp-map-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
          text-align: left;
        }

        .opp-map-table th {
          color: #64748b;
          font-weight: 600;
          padding: 6px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .opp-map-table td {
          padding: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: #cbd5e1;
        }

        .opp-title {
          font-weight: 600;
          color: #f1f5f9;
        }

        .eval-badge {
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 4px;
          padding: 2px 6px;
        }

        .eval-badge.val-高 { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .eval-badge.val-中 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .eval-badge.val-低 { background: rgba(255, 255, 255, 0.05); color: #94a3b8; }

        .eval-badge.cmp-低 { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .eval-badge.cmp-中 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .eval-badge.cmp-高 { background: rgba(239, 68, 68, 0.15); color: #f87171; }

        .pri-badge {
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .pri-badge.pri-P0 { color: #f87171; }
        .pri-badge.pri-P1 { color: #f59e0b; }
        .pri-badge.pri-P2 { color: #38bdf8; }

        /* Agents 设计推荐 */
        .agents-grid-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .agent-rec-card {
          background: rgba(13, 148, 136, 0.02);
          border: 1px solid rgba(13, 148, 136, 0.12);
          padding: 10px 12px;
          border-radius: 10px;
        }

        .agent-rec-card h5 {
          margin: 0 0 6px 0;
          font-size: 0.8rem;
          color: #2dd4bf;
          font-weight: 700;
        }

        .agent-desc-para, .agent-integ-para {
          margin: 0 0 4px 0;
          font-size: 0.72rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .agent-desc-para strong, .agent-integ-para strong {
          color: #e2e8f0;
          font-weight: 600;
        }

        /* 路线图时间轴 */
        .timeline-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          padding-left: 10px;
        }

        .timeline-container::before {
          content: '';
          position: absolute;
          left: 35px;
          top: 15px;
          bottom: 15px;
          width: 1px;
          background: rgba(255, 255, 255, 0.06);
        }

        .timeline-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .timeline-badge-day {
          width: 50px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(13, 148, 136, 0.3);
          color: #2dd4bf;
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 6px;
          padding: 3px 0;
          text-align: center;
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(13, 148, 136, 0.05);
        }

        .timeline-content-card {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          padding: 8px 12px;
          flex: 1;
        }

        .timeline-content-card h6 {
          margin: 0 0 4px 0;
          font-size: 0.78rem;
          color: #f1f5f9;
          font-weight: 600;
        }

        .timeline-content-card p {
          margin: 0;
          font-size: 0.72rem;
          color: #94a3b8;
          line-height: 1.45;
        }

        /* 列表元素 */
        .rep-bullet-ul {
          padding-left: 1.35rem;
          padding-right: 0.45rem;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          list-style-position: outside;
        }

        .rep-bullet-ul li {
          font-size: 0.75rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .rep-bullet-ul-accent {
          padding-left: 1.35rem;
          padding-right: 0.45rem;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          list-style-position: outside;
        }

        .rep-bullet-ul-accent li {
          font-size: 0.75rem;
          color: #f59e0b;
          line-height: 1.4;
        }

        /* 恢复会话提示横幅 */
        .restored-session-banner {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(13, 148, 136, 0.25);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .banner-icon {
          font-size: 1.4rem;
          background: rgba(13, 148, 136, 0.1);
          padding: 6px;
          border-radius: 8px;
          line-height: 1;
        }

        .banner-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-start;
        }

        .banner-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #2dd4bf;
        }

        .banner-desc {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0 0 8px 0;
          line-height: 1.4;
          text-align: left;
        }

        .banner-reset-btn {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 0.72rem;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .banner-reset-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
          color: #fca5a5;
        }

        /* 画像更新状态条 */
        .profile-status-banner {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.72rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          line-height: 1.4;
          text-align: left;
        }

        .profile-status-banner.updating {
          background: rgba(13, 148, 136, 0.08);
          border: 1px solid rgba(13, 148, 136, 0.2);
          color: #2dd4bf;
        }

        .profile-status-banner.failed {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .spinner-mini {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(45, 212, 191, 0.3);
          border-top-color: #2dd4bf;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          flex-shrink: 0;
        }

        /* 亮色主题：默认给企业用户更清爽、低压的工作台 */
        .app-container.theme-light,
        .theme-light .main-workspace-full {
          background: #f6f8fb;
          color: #0f172a;
        }

        .theme-light .welcome-badge {
          background: #dff7ef;
          border-color: #9ee7d1;
          color: #047857;
        }

        .theme-light .welcome-hero h1 {
          background: linear-gradient(135deg, #0f172a 20%, #0f766e 72%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .theme-light .welcome-description,
        .theme-light .goal-subtitle,
        .theme-light .usage-guide-card li,
        .theme-light .card-desc-placeholder,
        .theme-light .history-meta,
        .theme-light .chat-sub,
        .theme-light .input-tip,
        .theme-light .banner-desc,
        .theme-light .profile-intro p,
        .theme-light .timeline-content-card p,
        .theme-light .rep-bullet-ul li {
          color: #64748b;
        }

        .theme-light .goal-selection-card,
        .theme-light .usage-guide-card,
        .theme-light .history-card,
        .theme-light .sidebar-card,
        .theme-light .chat-container-card,
        .theme-light .tabbed-container-card {
          background: rgba(255, 255, 255, 0.88);
          border-color: rgba(15, 23, 42, 0.08);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        }

        .theme-light .login-required-banner {
          background: #fff7ed;
          border-color: #fed7aa;
          color: #9a3412;
        }

        .theme-light .goal-selection-card h2,
        .theme-light .usage-guide-card h2,
        .theme-light .usage-guide-card strong,
        .theme-light .history-header h3,
        .theme-light .section-title,
        .theme-light .chat-header h4,
        .theme-light .profile-intro h5,
        .theme-light .card-info h4,
        .theme-light .report-unlocked-state h5,
        .theme-light .timeline-content-card h6,
        .theme-light .rep-sec-title {
          color: #0f172a;
        }

        .theme-light .goal-btn-item,
        .theme-light .history-item,
        .theme-light .history-mini-item,
        .theme-light .message-bubble-content,
        .theme-light .state-badge-container,
        .theme-light .card-body-text,
        .theme-light .timeline-content-card,
        .theme-light .restored-session-banner {
          background: #ffffff;
          border-color: rgba(15, 23, 42, 0.08);
          color: #0f172a;
        }

        .theme-light .goal-btn-item:hover:not(:disabled),
        .theme-light .history-item:hover {
          background: #ecfdf5;
          border-color: #99f6e4;
          color: #0f172a;
        }

        .theme-light .goal-title-txt,
        .theme-light .history-title,
        .theme-light .bubble-text,
        .theme-light .percent-num,
        .theme-light .report-summary-p,
        .theme-light .pain-bullet p,
        .theme-light .agent-rec-card h5,
        .theme-light .agent-desc-para,
        .theme-light .agent-integ-para,
        .theme-light .opp-title {
          color: #0f172a;
        }

        .theme-light .goal-desc-txt,
        .theme-light .percent-label,
        .theme-light .state-label,
        .theme-light .missing-fields-list li,
        .theme-light .card-body-empty,
        .theme-light .bubble-meta {
          color: #64748b;
        }

        .theme-light .chat-header,
        .theme-light .tabs-header {
          background: #f8fafc;
          border-color: rgba(15, 23, 42, 0.08);
        }

        .theme-light .messages-scroller,
        .theme-light .tab-content-scroller {
          background: #f8fafc;
        }

        .theme-light .message-bubble-wrapper.user .message-bubble-content {
          background: linear-gradient(135deg, #e0f2fe 0%, #ccfbf1 100%);
          border-color: #bae6fd;
        }

        .theme-light .chat-textarea {
          background: #ffffff;
          color: #0f172a;
          border-color: rgba(15, 23, 42, 0.12);
        }

        .theme-light .chat-textarea::placeholder {
          color: #94a3b8;
        }

        .theme-light .chat-input-wrapper {
          background: #ffffff;
          border-color: rgba(15, 23, 42, 0.08);
        }

        .theme-light .profile-item-card.unknown {
          background: #f8fafc;
          border-color: rgba(15, 23, 42, 0.08);
        }

        .theme-light .profile-item-card.known,
        .theme-light .report-hero-card,
        .theme-light .report-section-block,
        .theme-light .agent-rec-card,
        .theme-light .pain-bullet {
          background: #ffffff;
          border-color: rgba(15, 23, 42, 0.08);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
        }

        .theme-light .opp-map-table th {
          background: #f1f5f9;
          color: #334155;
        }

        .theme-light .opp-map-table td {
          border-color: rgba(15, 23, 42, 0.08);
          color: #0f172a;
        }

        .theme-light .divider {
          background: rgba(15, 23, 42, 0.08);
        }

        .theme-light .progress-bg {
          stroke: rgba(15, 23, 42, 0.08);
        }

        .history-item {
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 8px;
        }

        .history-item-main,
        .history-mini-main {
          border: none;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          overflow: hidden;
        }

        .history-delete-btn,
        .history-mini-delete {
          border: 1px solid rgba(239, 68, 68, 0.16);
          background: rgba(239, 68, 68, 0.05);
          color: #ef4444;
          border-radius: 7px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .history-delete-btn {
          padding: 5px 8px;
          font-size: 0.68rem;
        }

        .history-mini-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 30px;
          align-items: center;
          gap: 6px;
        }

        .history-mini-delete {
          width: 30px;
          height: 28px;
          line-height: 22px;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          overflow: visible;
        }

        .history-delete-btn:hover,
        .history-mini-delete:hover {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.35);
        }

        .report-actions-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: -0.5rem;
        }

        .btn-download-report {
          border: 1px solid rgba(13, 148, 136, 0.24);
          background: rgba(13, 148, 136, 0.1);
          color: #0f766e;
          border-radius: 8px;
          padding: 7px 11px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-download-report:hover {
          background: rgba(13, 148, 136, 0.16);
        }

        .theme-light .chat-container-card {
          background: #ffffff;
          border-color: rgba(15, 23, 42, 0.08);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
        }

        .theme-light .messages-scroller {
          background: #ffffff;
          padding: 1.4rem 1.5rem;
          gap: 0.25rem;
        }

        .theme-light .message-bubble-wrapper {
          width: 100%;
          max-width: 100%;
          border-radius: 0;
          padding: 1rem 0;
          gap: 12px;
        }

        .theme-light .message-bubble-wrapper.agent {
          background: #ffffff;
        }

        .theme-light .message-bubble-wrapper.user {
          background: #f7f7f8;
          border-top: 1px solid rgba(15, 23, 42, 0.05);
          border-bottom: 1px solid rgba(15, 23, 42, 0.05);
          align-self: stretch;
          flex-direction: row;
          margin-left: -1.5rem;
          margin-right: -1.5rem;
          padding-left: 1.5rem;
          padding-right: 1.5rem;
        }

        .theme-light .message-avatar {
          width: 28px;
          height: 28px;
          font-size: 0.95rem;
          border-radius: 8px;
          background: #f1f5f9;
          border-color: rgba(15, 23, 42, 0.08);
        }

        .theme-light .message-bubble-content {
          background: transparent;
          border: none;
          box-shadow: none;
          flex: 1;
        }

        .theme-light .message-bubble-wrapper.user .message-bubble-content {
          background: transparent;
          border: none;
        }

        .theme-light .message-bubble-wrapper.user .bubble-meta {
          text-align: left;
        }

        .theme-light .bubble-text {
          background: transparent;
          border: none;
          padding: 0;
          border-radius: 0;
          color: #111827;
          font-size: 0.9rem;
          line-height: 1.7;
        }

        .theme-light .message-bubble-wrapper.user .bubble-text {
          background: transparent;
          border: none;
          color: #111827;
        }

        .theme-light .typing-indicator {
          background: transparent;
          padding: 4px 0;
        }

        .theme-light .typing-indicator span {
          background: #9ca3af;
        }

        .theme-light .chat-input-wrapper {
          background: #ffffff;
          padding: 0.9rem 1rem 1rem;
        }

        .theme-light .chat-textarea {
          border-radius: 16px;
          border-color: rgba(15, 23, 42, 0.14);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
          min-height: 88px;
        }

        @media (max-width: 992px) {
          .app-container.fixed-workbench {
            position: static;
            height: auto;
            min-height: 100vh;
            overflow: visible;
          }

          .app-container.fixed-workbench .main-workspace-full {
            height: auto;
            overflow: visible;
          }

          .welcome-container {
            padding: 2rem 1rem;
            justify-content: flex-start;
          }

          .welcome-hero {
            margin-bottom: 1.5rem;
          }

          .welcome-hero h1 {
            font-size: 2rem;
            line-height: 1.15;
          }

          .welcome-description {
            font-size: 0.92rem;
          }

          .goal-selection-card {
            padding: 1.25rem;
            border-radius: 16px;
          }

          .history-list {
            grid-template-columns: 1fr;
          }

          .workbench-layout {
            grid-template-columns: 1fr;
            height: auto;
            min-height: 0;
            padding: 0.85rem;
            gap: 0.85rem;
            overflow: visible;
          }

          .sidebar-card,
          .chat-container-card,
          .tabbed-container-card {
            border-radius: 14px;
          }

          .completeness-circle-container {
            width: 112px;
            height: 112px;
          }

          .chat-container-card {
            min-height: 68vh;
          }

          .messages-scroller {
            min-height: 42vh;
            max-height: none;
          }

          .profile-col {
            min-height: 60vh;
          }

          .message-bubble-wrapper {
            max-width: 96%;
          }

          .chat-header {
            align-items: flex-start;
            gap: 10px;
          }

          .btn-action-report {
            margin-left: 0;
            width: 100%;
            margin-top: 0.75rem;
          }
        }

        @media (max-width: 560px) {
          .welcome-container {
            padding: 1.35rem 0.8rem;
          }

          .welcome-hero h1 {
            font-size: 1.65rem;
          }

          .welcome-badge {
            font-size: 0.64rem;
            letter-spacing: 0.06em;
          }

          .goal-btn-item {
            padding: 0.9rem;
            align-items: flex-start;
          }

          .goal-btn-icon {
            font-size: 1.35rem;
            margin-right: 0.8rem;
          }

          .goal-title-txt {
            font-size: 0.86rem;
          }

          .goal-arrow {
            display: none;
          }

          .workbench-layout {
            padding: 0.6rem;
          }

          .sidebar-card,
          .chat-container-card,
          .tabbed-container-card {
            padding: 1rem;
          }

          .chat-container-card,
          .tabbed-container-card {
            padding: 0;
          }

          .chat-header,
          .chat-input-wrapper,
          .tabs-header {
            padding: 0.85rem;
          }

          .messages-scroller,
          .tab-content-scroller {
            padding: 0.85rem;
          }

          .message-avatar {
            width: 34px;
            height: 34px;
            font-size: 1rem;
          }

          .bubble-text,
          .card-body-text {
            font-size: 0.82rem;
          }

          .chat-textarea {
            min-height: 88px;
            font-size: 0.86rem;
          }

          .input-toolbar {
            right: 1.35rem;
            bottom: 1.3rem;
          }

          .btn-send-message {
            width: 34px;
            min-height: 0;
            height: 34px;
          }

          .tabs-header {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
