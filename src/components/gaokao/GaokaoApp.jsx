import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import GaokaoThreeIntro from './GaokaoThreeIntro.jsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldLabels = {
  province: '省份',
  examYear: '年份',
  candidateTrack: '科类',
  subjectCombo: '选科',
  totalScore: '总分',
  provinceRank: '全省位次',
  applicationType: '批次类型'
};

function FactGrid({ facts }) {
  const rows = ['province', 'examYear', 'candidateTrack', 'subjectCombo', 'totalScore', 'provinceRank', 'applicationType'];
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(key => (
        <div key={key} className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] text-slate-500">{fieldLabels[key]}</div>
          <div className="mt-1 min-h-5 text-sm font-semibold text-slate-900">{facts?.[key] || '待补充'}</div>
        </div>
      ))}
    </div>
  );
}

function PreferencePanel({ preferences = {} }) {
  const renderList = (items) => Array.isArray(items) && items.length ? items.join('、') : '待补充';
  return (
    <div className="space-y-2 text-sm">
      <div><span className="text-slate-500">城市：</span>{renderList(preferences.preferredCities)}</div>
      <div><span className="text-slate-500">专业：</span>{renderList(preferences.preferredMajors)}</div>
      <div><span className="text-slate-500">优先级：</span>{preferences.priority || '待补充'}</div>
      <div><span className="text-slate-500">风险偏好：</span>{preferences.riskPreference || '待补充'}</div>
      <div><span className="text-slate-500">预算：</span>{preferences.annualBudgetCny ? `${preferences.annualBudgetCny} 元/年` : '待补充'}</div>
    </div>
  );
}

function RecommendationPanel({ report }) {
  if (!report) {
    return <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">画像完整度达到 65% 后，可以生成第一版志愿建议。</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">总体判断</div>
        <p className="mt-2 text-sm leading-6 text-slate-800">{report.summary}</p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">策略</div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          <div><span className="text-slate-500">风险：</span>{report.strategy?.riskPreference || 'balanced'}</div>
          <div><span className="text-slate-500">比例：</span>{report.strategy?.rushStableSafeRatio || '3:4:3'}</div>
          <div><span className="text-slate-500">权衡：</span>{report.strategy?.mainTradeoff || '待补充'}</div>
        </div>
      </div>

      <div className="space-y-2">
        {(report.recommendations || []).length ? report.recommendations.map((item, index) => (
          <div key={`${item.institution}-${index}`} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-teal-700">{item.riskBand || '待定'} · 第 {item.order || index + 1} 志愿</div>
                <div className="mt-1 text-base font-bold text-slate-950">{item.institution || '院校待定'}</div>
                <div className="text-sm text-slate-600">{[item.majorGroup, item.major].filter(Boolean).join(' / ') || '专业待定'}</div>
              </div>
              <div className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.probabilityRange || '待评估'}</div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{item.reason}</p>
            {Array.isArray(item.risks) && item.risks.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-rose-700">
                {item.risks.map((risk, riskIndex) => <li key={riskIndex}>{risk}</li>)}
              </ul>
            ) : null}
          </div>
        )) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">暂无可推荐志愿项。请先导入当年招生计划和近 3-5 年录取位次。</div>
        )}
      </div>

      {Array.isArray(report.nextDataNeeded) && report.nextDataNeeded.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-950">下一步需要补齐的数据</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {report.nextDataNeeded.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function GaokaoApp() {
  const [showIntro, setShowIntro] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState('none');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [knownFacts, setKnownFacts] = useState({});
  const [missingFields, setMissingFields] = useState([]);
  const [completeness, setCompleteness] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecommendLoading, setIsRecommendLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [activePanel, setActivePanel] = useState('profile');
  const [toast, setToast] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('fde_gaokao_email');
    const storedPassword = localStorage.getItem('fde_gaokao_password');
    const storedVerified = localStorage.getItem('fde_gaokao_verified') === 'true';
    const storedSession = localStorage.getItem('gaokao_session_id');
    if (storedEmail && storedPassword && storedVerified) {
      setEmail(storedEmail);
      setPassword(storedPassword);
      setEmailStatus('verified');
      if (storedSession) loadSession(storedSession, storedEmail, storedPassword);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: isChatLoading ? 'auto' : 'smooth' });
  }, [messages, isChatLoading]);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3200);
  };

  const verifyEmail = async () => {
    if (!EMAIL_REGEX.test(email)) return showToast('请输入有效邮箱');
    if (!password) return showToast('请输入密码');
    setIsCheckingEmail(true);
    try {
      const res = await axios.post('/api/diagnosis-auth/pre-check', { email, password });
      if (res.data?.success) {
        setEmailStatus('verified');
        localStorage.setItem('fde_gaokao_email', email);
        localStorage.setItem('fde_gaokao_password', password);
        localStorage.setItem('fde_gaokao_verified', 'true');
        showToast(res.data.isNewUser ? '账号已创建，可以开始填报访谈' : '登录成功');
      }
    } catch (err) {
      showToast(err.response?.data?.error || '登录失败');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const startSession = async () => {
    if (emailStatus !== 'verified') return showToast('请先登录');
    setIsChatLoading(true);
    try {
      const res = await axios.post('/api/gaokao/start', { email, password });
      if (res.data?.success) {
        setSessionId(res.data.sessionId);
        setMessages([{ sender: 'agent', content: res.data.welcomeText, created_at: new Date().toISOString() }]);
        setKnownFacts(res.data.knownFacts || {});
        setMissingFields(res.data.missingFields || []);
        setCompleteness(res.data.completeness || 0);
        setReport(null);
        setActivePanel('profile');
        localStorage.setItem('gaokao_session_id', res.data.sessionId);
      }
    } catch (err) {
      showToast(err.response?.data?.error || '启动失败');
    } finally {
      setIsChatLoading(false);
    }
  };

  const loadSession = async (sid, emailToUse = email, passwordToUse = password) => {
    try {
      const res = await axios.post('/api/gaokao/session', { id: sid, email: emailToUse, password: passwordToUse });
      if (res.data?.success) {
        setSessionId(res.data.session.id);
        setMessages(res.data.messages || []);
        setKnownFacts(res.data.knownFacts || {});
        setMissingFields(res.data.missingFields || []);
        setCompleteness(res.data.session.completeness || 0);
        setReport(res.data.report || null);
        setActivePanel(res.data.report ? 'report' : 'profile');
      }
    } catch {
      localStorage.removeItem('gaokao_session_id');
    }
  };

  const refreshSession = async () => {
    if (sessionId && email && password) await loadSession(sessionId);
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    const text = inputText.trim();
    if (!text || isChatLoading) return;
    if (!sessionId) return showToast('请先开始访谈');

    setInputText('');
    setIsChatLoading(true);
    const tempId = `agent_${Date.now()}`;
    setMessages(prev => [...prev, { sender: 'user', content: text }, { id: tempId, sender: 'agent', content: '' }]);

    try {
      const response = await fetch('/api/gaokao/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text, email, password })
      });
      if (!response.ok || !response.body) throw new Error('发送失败');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let agentText = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        agentText += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, content: agentText } : msg));
      }
      await refreshSession();
    } catch (err) {
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, content: '发送失败，请稍后再试。' } : msg));
    } finally {
      setIsChatLoading(false);
    }
  };

  const generateRecommendation = async () => {
    if (!sessionId) return showToast('请先开始访谈');
    setIsRecommendLoading(true);
    try {
      const res = await axios.post('/api/gaokao/recommend', { sessionId, email, password, force: completeness >= 55 });
      if (res.data?.success) {
        setReport(res.data.report);
        setActivePanel('report');
        await refreshSession();
      }
    } catch (err) {
      showToast(err.response?.data?.error || '生成失败');
    } finally {
      setIsRecommendLoading(false);
    }
  };

  const quickSamples = [
    '广东 2026 物化生，623 分，位次 18000，想去深圳广州，计算机优先，稳一点',
    '浙江 2026 综合改革，610 分，位次 45000，城市优先，想读法学或金融，可以冲',
    '四川 2026 理科，590 分，位次 26000，不接受民办，专业比城市重要'
  ];

  return (
    <>
    {showIntro ? <GaokaoThreeIntro onDone={() => setShowIntro(false)} /> : null}
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <style>{`
        .gaokao-opening {
          position: relative;
          display: flex;
          min-height: 360px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 8px;
          background: radial-gradient(circle at 50% 42%, #202633 0%, #111827 38%, #05070b 100%);
          padding: 48px 24px;
          isolation: isolate;
        }
        .gaokao-opening::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(circle at center, black 0%, transparent 72%);
          pointer-events: none;
        }
        .gaokao-explosion-canvas {
          position: absolute;
          inset: 0;
          z-index: 1;
          height: 100%;
          width: 100%;
          pointer-events: none;
        }
        .gaokao-blast-ring {
          position: absolute;
          z-index: 1;
          left: 50%;
          top: 46%;
          height: 44px;
          width: 44px;
          border: 2px solid rgba(255, 75, 75, 0.68);
          border-radius: 999px;
          transform: translate(-50%, -50%);
          animation: shockwave 3600ms cubic-bezier(.1,.72,.18,1) infinite;
          pointer-events: none;
        }
        .gaokao-blast-ring-two {
          border-color: rgba(255, 255, 255, 0.46);
          animation-delay: 260ms;
        }
        .gaokao-sparks {
          position: absolute;
          z-index: 4;
          left: 50%;
          top: 43%;
          height: 1px;
          width: 1px;
          pointer-events: none;
        }
        .gaokao-sparks span {
          position: absolute;
          left: 0;
          top: 0;
          height: var(--size);
          width: calc(var(--size) * 2.8);
          border-radius: 999px;
          opacity: 0;
          transform-origin: 0 50%;
          animation: spark-flight 2400ms cubic-bezier(.08,.82,.18,1) var(--delay) infinite;
        }
        .spark-red {
          background: linear-gradient(90deg, #ff4b4b, rgba(255,75,75,0));
          box-shadow: 0 0 18px rgba(255,75,75,.8);
        }
        .spark-white {
          background: linear-gradient(90deg, #fff, rgba(255,255,255,0));
          box-shadow: 0 0 16px rgba(255,255,255,.7);
        }
        .spark-gold {
          background: linear-gradient(90deg, #ffd166, rgba(255,209,102,0));
          box-shadow: 0 0 16px rgba(255,209,102,.72);
        }
        .gaokao-opening-logo {
          position: relative;
          z-index: 2;
          width: min(78vw, 560px);
          max-width: 100%;
          filter:
            drop-shadow(0 18px 34px rgba(0,0,0,0.45))
            drop-shadow(0 0 26px rgba(255,75,75,0.22));
          transform-style: preserve-3d;
          animation: logo-explosion-settle 1500ms cubic-bezier(.08,.9,.18,1) both, logo-float 4200ms ease-in-out 1600ms infinite;
        }
        .gaokao-opening-logo .logo-stroke,
        .gaokao-opening-logo .logo-red {
          transform-origin: center;
          animation: shard-snap 1100ms cubic-bezier(.08,.9,.18,1) both;
        }
        .gaokao-opening-logo .logo-dot-one {
          animation-delay: 90ms;
        }
        .gaokao-opening-logo .logo-dot-two {
          animation-delay: 170ms;
        }
        .gaokao-popup {
          position: relative;
          z-index: 3;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.06em;
          margin-top: 28px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          background: rgba(8, 13, 23, 0.68);
          box-shadow:
            0 22px 50px rgba(0,0,0,0.34),
            inset 0 0 0 1px rgba(255,255,255,0.08),
            0 0 42px rgba(255,75,75,0.22);
          color: #fff;
          font-size: clamp(24px, 5vw, 52px);
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1.15;
          padding: 18px 24px;
          text-align: center;
          text-shadow: 0 0 22px rgba(255, 75, 75, 0.52);
          animation: popup-shell 820ms cubic-bezier(.08,.9,.18,1) 420ms both;
        }
        .gaokao-popup span {
          display: inline-block;
          opacity: 0;
          animation: glyph-burst 860ms cubic-bezier(.08,.9,.18,1) both;
        }
        @keyframes shockwave {
          0% { opacity: .9; transform: translate(-50%, -50%) scale(.2); }
          55% { opacity: .22; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(12); }
        }
        @keyframes spark-flight {
          0% { opacity: 0; transform: rotate(var(--angle)) translateX(0) scaleX(.2); }
          8% { opacity: 1; }
          38% { opacity: .92; transform: rotate(var(--angle)) translateX(var(--distance)) scaleX(1); }
          78%, 100% { opacity: 0; transform: rotate(var(--angle)) translateX(calc(var(--distance) + 62px)) scaleX(.12); }
        }
        @keyframes logo-explosion-settle {
          0% { opacity: 0; transform: perspective(700px) translate3d(0, 40px, -220px) rotateX(68deg) rotateZ(-10deg) scale(.38); }
          48% { opacity: 1; transform: perspective(700px) translate3d(0, -8px, 70px) rotateX(-10deg) rotateZ(2deg) scale(1.12); }
          72% { transform: perspective(700px) translate3d(0, 3px, 12px) rotateX(2deg) rotateZ(-1deg) scale(.97); }
          100% { opacity: 1; transform: perspective(700px) translate3d(0, 0, 0) rotateX(0) rotateZ(0) scale(1); }
        }
        @keyframes logo-float {
          0%, 100% { transform: perspective(700px) translate3d(0, 0, 0) rotateX(0deg); }
          50% { transform: perspective(700px) translate3d(0, -8px, 18px) rotateX(3deg); }
        }
        @keyframes shard-snap {
          0% { opacity: 0; transform: translate3d(calc((50% - 240px) * -1), -140px, 0) rotate(-28deg) scale(.42); filter: blur(8px); }
          42% { opacity: 1; filter: blur(0); }
          68% { transform: translate3d(8px, -6px, 0) rotate(3deg) scale(1.08); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) rotate(0) scale(1); filter: blur(0); }
        }
        @keyframes popup-shell {
          0% { opacity: 0; transform: translateY(24px) scale(.78); }
          62% { opacity: 1; transform: translateY(-3px) scale(1.06); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes glyph-burst {
          0% { opacity: 0; transform: translate3d(var(--x, 0), 36px, 0) rotate(16deg) scale(.3); filter: blur(7px); }
          58% { opacity: 1; transform: translate3d(0, -5px, 0) rotate(-2deg) scale(1.16); filter: blur(0); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) rotate(0) scale(1); filter: blur(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gaokao-explosion-canvas,
          .gaokao-blast-ring,
          .gaokao-sparks {
            display: none;
          }
          .gaokao-opening-logo,
          .gaokao-opening-logo .logo-stroke,
          .gaokao-opening-logo .logo-red,
          .gaokao-popup,
          .gaokao-popup span {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">FDE FAN Agent</div>
            <h1 className="mt-1 text-2xl font-bold">高考志愿填报智能体</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={verifyEmail} disabled={isCheckingEmail}>
              {emailStatus === 'verified' ? '已登录' : isCheckingEmail ? '验证中' : '登录'}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-h-[calc(100vh-130px)] flex-col rounded-md border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">访谈采集</div>
              <div className="text-xs text-slate-500">用自然语言补齐分数、位次、选科和偏好</div>
            </div>
            <button className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={startSession} disabled={emailStatus !== 'verified' || isChatLoading}>
              新建访谈
            </button>
          </div>

          {!sessionId ? (
            <div className="flex flex-1 flex-col px-4 py-4">
              <div className="mx-auto mt-5 w-full max-w-2xl">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">先从一句话开始</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">智能体会把考生信息和偏好结构化，后续结合招生计划、历年位次和省份规则生成冲稳保建议。</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {quickSamples.map(sample => (
                    <button key={sample} className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:border-teal-400" onClick={() => setInputText(sample)}>
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                {messages.map((msg, index) => (
                  <div key={msg.id || index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] whitespace-pre-wrap rounded-md px-4 py-3 text-sm leading-6 ${msg.sender === 'user' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-900'}`}>
                      {msg.content || (msg.sender === 'agent' && isChatLoading ? '正在思考...' : '')}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            </div>
          )}

          <form onSubmit={sendMessage} className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <textarea
                className="min-h-[48px] flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                placeholder="输入考生信息、偏好或补充说明"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
              />
              <button className="w-20 rounded-md bg-slate-900 text-sm font-semibold text-white disabled:opacity-50" disabled={isChatLoading || !inputText.trim()}>
                发送
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">信息完整度</div>
                <div className="text-xs text-slate-500">最低可用版需要 6 项核心信息</div>
              </div>
              <div className="text-2xl font-bold text-teal-700">{completeness}%</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-teal-700" style={{ width: `${Math.min(100, completeness)}%` }} />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-2">
            <div className="grid grid-cols-2 gap-2">
              <button className={`rounded-md px-3 py-2 text-sm font-semibold ${activePanel === 'profile' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActivePanel('profile')}>考生画像</button>
              <button className={`rounded-md px-3 py-2 text-sm font-semibold ${activePanel === 'report' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActivePanel('report')}>志愿建议</button>
            </div>
          </div>

          {activePanel === 'profile' ? (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <FactGrid facts={knownFacts} />
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-semibold">偏好</div>
                <PreferencePanel preferences={knownFacts.preferences} />
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold">还差什么</div>
                {!sessionId ? (
                  <p className="mt-2 text-sm text-slate-600">请先新建访谈。</p>
                ) : missingFields.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {missingFields.map(item => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-teal-700">核心信息已齐，可以生成志愿建议。</p>
                )}
              </div>
              <button className="w-full rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" onClick={generateRecommendation} disabled={!sessionId || isRecommendLoading}>
                {isRecommendLoading ? '生成中' : '生成志愿建议'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button className="w-full rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" onClick={generateRecommendation} disabled={!sessionId || isRecommendLoading}>
                {isRecommendLoading ? '生成中' : '重新生成志愿建议'}
              </button>
              <RecommendationPanel report={report} />
            </div>
          )}
        </aside>
      </section>

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </main>
    </>
  );
}
