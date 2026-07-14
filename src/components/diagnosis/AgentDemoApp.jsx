import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowLeft,
  History,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck
} from 'lucide-react';

const GENERATION_STAGES = [
  '正在读取诊断方案',
  '正在生成模拟业务数据',
  '正在构建交互流程',
  '正在检查安全边界',
  '正在准备预览'
];

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
};

const ensureArray = (value) => Array.isArray(value) ? value : value ? [value] : [];

export default function AgentDemoApp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demo, setDemo] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRevising, setIsRevising] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState('');
  const [revisionInstruction, setRevisionInstruction] = useState('');
  const [frameKey, setFrameKey] = useState(0);
  const [mobileView, setMobileView] = useState('preview');

  useEffect(() => {
    const timer = isInitialLoading
      ? window.setInterval(() => setLoadingStage(stage => Math.min(stage + 1, GENERATION_STAGES.length - 1)), 1400)
      : null;
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isInitialLoading]);

  useEffect(() => {
    const storedEmail = localStorage.getItem('fde_diagnosis_email') || '';
    const storedPassword = localStorage.getItem('fde_diagnosis_password') || '';
    const isVerified = localStorage.getItem('fde_diagnosis_verified') === 'true';
    setEmail(storedEmail);
    setPassword(storedPassword);

    if (!storedEmail || !storedPassword || !isVerified) {
      setError('登录信息已失效，请返回诊断页面重新登录。');
      setIsInitialLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const demoId = params.get('demoId');
    const sessionId = params.get('sessionId');
    const agentIndex = params.get('agentIndex');

    const initialize = async () => {
      try {
        const endpoint = demoId
          ? '/api/diagnosis/agent-demo/get'
          : '/api/diagnosis/agent-demo/create';
        const payload = demoId
          ? { demoId, email: storedEmail, password: storedPassword }
          : { sessionId, agentIndex, email: storedEmail, password: storedPassword };
        const response = await axios.post(endpoint, payload);
        if (!response.data?.success || !response.data?.demo) {
          throw new Error(response.data?.error || 'Demo 加载失败');
        }
        setDemo(response.data.demo);
        setError('');
        window.history.replaceState({}, '', `/agent-demo?demoId=${encodeURIComponent(response.data.demo.id)}`);
      } catch (requestError) {
        setError(requestError.response?.data?.error || requestError.message || 'Demo 加载失败，请重试。');
      } finally {
        setIsInitialLoading(false);
      }
    };

    initialize();
  }, []);

  const spec = demo?.spec || {};
  const scenarios = useMemo(() => ensureArray(spec.mockScenarios), [spec.mockScenarios]);

  const reloadDemo = () => setFrameKey(value => value + 1);

  const reloadFromServer = async () => {
    if (!demo?.id || !email || !password) return;
    setError('');
    try {
      const response = await axios.post('/api/diagnosis/agent-demo/get', {
        demoId: demo.id,
        email,
        password
      });
      if (response.data?.demo) {
        setDemo(response.data.demo);
        reloadDemo();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || '刷新失败，请稍后重试。');
    }
  };

  const submitRevision = async (event) => {
    event.preventDefault();
    const instruction = revisionInstruction.trim();
    if (!demo?.id || instruction.length < 3 || isRevising || isRestoring) return;
    setIsRevising(true);
    setError('');
    try {
      const response = await axios.post('/api/diagnosis/agent-demo/revise', {
        demoId: demo.id,
        instruction,
        email,
        password
      });
      if (!response.data?.success || !response.data?.demo) {
        throw new Error(response.data?.error || '修改失败');
      }
      setDemo(response.data.demo);
      setRevisionInstruction('');
      reloadDemo();
      setMobileView('preview');
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || '修改失败，原版本已保留。');
    } finally {
      setIsRevising(false);
    }
  };

  const restoreVersion = async (version) => {
    if (!demo?.id || version === demo.currentVersion || isRevising || isRestoring) return;
    if (!window.confirm(`确认将 v${version} 恢复为一个新的当前版本吗？`)) return;
    setIsRestoring(true);
    setError('');
    try {
      const response = await axios.post('/api/diagnosis/agent-demo/restore', {
        demoId: demo.id,
        version,
        email,
        password
      });
      if (!response.data?.success || !response.data?.demo) {
        throw new Error(response.data?.error || '恢复失败');
      }
      setDemo(response.data.demo);
      reloadDemo();
      setMobileView('preview');
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || '版本恢复失败。');
    } finally {
      setIsRestoring(false);
    }
  };

  if (isInitialLoading) {
    return (
      <main className="agent-demo-page loading-page">
        <div className="generation-status">
          <div className="generation-spinner" aria-hidden="true"></div>
          <p className="generation-eyebrow">FDE SIMULATION BUILDER</p>
          <h1>正在生成模拟智能体 Demo</h1>
          <div className="generation-stages">
            {GENERATION_STAGES.map((stage, index) => (
              <div key={stage} className={index <= loadingStage ? 'done' : ''}>
                <span>{index < loadingStage ? '完成' : index === loadingStage ? '进行中' : '等待'}</span>
                <p>{stage}</p>
              </div>
            ))}
          </div>
          <small>通常需要几十秒，请保持页面打开。</small>
        </div>
        <style>{styles}</style>
      </main>
    );
  }

  if (!demo) {
    return (
      <main className="agent-demo-page error-page">
        <div className="error-panel">
          <h1>Demo 暂时无法打开</h1>
          <p>{error || '没有找到对应的模拟智能体 Demo。'}</p>
          <a href="/diagnosis"><ArrowLeft size={16} />返回诊断报告</a>
        </div>
        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="agent-demo-page">
      <header className="demo-header">
        <a href="/diagnosis" className="header-back" title="返回诊断报告" aria-label="返回诊断报告">
          <ArrowLeft size={18} />
        </a>
        <div className="header-title">
          <span className="simulation-badge"><ShieldCheck size={14} />模拟 Demo</span>
          <h1>{demo.agentName}</h1>
        </div>
        <div className="header-actions">
          <span>v{demo.currentVersion}</span>
          <button type="button" onClick={reloadDemo} title="重新加载预览" aria-label="重新加载预览">
            <RefreshCw size={17} />
          </button>
          <button type="button" onClick={reloadFromServer} title="同步最新版本" aria-label="同步最新版本">
            <History size={17} />
          </button>
        </div>
      </header>

      {error && <div className="workspace-error">{error}</div>}

      <nav className="mobile-tabs" aria-label="Demo 工作台视图">
        <button className={mobileView === 'spec' ? 'active' : ''} onClick={() => setMobileView('spec')}>方案</button>
        <button className={mobileView === 'preview' ? 'active' : ''} onClick={() => setMobileView('preview')}>预览</button>
        <button className={mobileView === 'revise' ? 'active' : ''} onClick={() => setMobileView('revise')}>修改</button>
      </nav>

      <div className="demo-workbench">
        <aside className={`spec-panel ${mobileView === 'spec' ? 'mobile-active' : ''}`}>
          <div className="panel-heading">
            <span>方案定义</span>
            <small>来自诊断报告</small>
          </div>
          <div className="spec-scroll">
            <section>
              <h2>业务目标</h2>
              <p>{spec.businessProblem || spec.description || '验证推荐智能体的核心业务流程。'}</p>
            </section>
            <section>
              <h2>目标用户</h2>
              <p>{spec.targetUser || '相关业务人员'}</p>
            </section>
            <section>
              <h2>输入</h2>
              <ul>{ensureArray(spec.inputs).map((item, index) => <li key={index}>{item}</li>)}</ul>
            </section>
            <section>
              <h2>工作流</h2>
              <ol>{ensureArray(spec.workflow).map((item, index) => <li key={index}>{item}</li>)}</ol>
            </section>
            <section>
              <h2>输出</h2>
              <ul>{ensureArray(spec.outputs).map((item, index) => <li key={index}>{item}</li>)}</ul>
            </section>
            <section>
              <h2>模拟场景</h2>
              <div className="scenario-list">
                {scenarios.map((scenario, index) => (
                  <div key={index}>
                    <strong>{scenario.name || `场景 ${index + 1}`}</strong>
                    <p>{scenario.input || '使用预置模拟数据'}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>

        <section className={`preview-panel ${mobileView === 'preview' ? 'mobile-active' : ''}`}>
          <div className="panel-heading preview-heading">
            <div>
              <span>交互预览</span>
              <small>隔离运行，不访问外部网络</small>
            </div>
            <button type="button" onClick={reloadDemo} title="重置预览" aria-label="重置预览">
              <RotateCcw size={15} />
            </button>
          </div>
          <div className="iframe-shell">
            <iframe
              key={frameKey}
              title={`${demo.agentName} 模拟 Demo`}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              srcDoc={demo.html}
            />
          </div>
        </section>

        <aside className={`revision-panel ${mobileView === 'revise' ? 'mobile-active' : ''}`}>
          <div className="panel-heading">
            <span>调整 Demo</span>
            <small>每次修改都会保存新版本</small>
          </div>
          <form className="revision-form" onSubmit={submitRevision}>
            <label htmlFor="revision-instruction">描述希望改变的交互或内容</label>
            <textarea
              id="revision-instruction"
              value={revisionInstruction}
              onChange={event => setRevisionInstruction(event.target.value)}
              maxLength={1200}
              placeholder="例如：增加审批人确认步骤，并在拒绝后展示原因输入框。"
              disabled={isRevising || isRestoring}
            />
            <div className="revision-submit-row">
              <small>{revisionInstruction.length} / 1200</small>
              <button type="submit" disabled={revisionInstruction.trim().length < 3 || isRevising || isRestoring}>
                <Send size={15} />{isRevising ? '正在生成新版本' : '应用修改'}
              </button>
            </div>
          </form>

          <div className="version-heading">
            <h2>版本记录</h2>
            <span>{demo.versions?.length || 0} 个版本</span>
          </div>
          <div className="version-list">
            {demo.versions?.map(item => {
              const isCurrent = item.version === demo.currentVersion;
              return (
                <div key={item.version} className={isCurrent ? 'current' : ''}>
                  <div>
                    <strong>v{item.version}{isCurrent ? ' · 当前' : ''}</strong>
                    <time>{formatTime(item.createdAt)}</time>
                    <p>{item.changeRequest || '版本更新'}</p>
                  </div>
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => restoreVersion(item.version)}
                      disabled={isRevising || isRestoring}
                      title={`恢复 v${item.version}`}
                      aria-label={`恢复 v${item.version}`}
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  :root { color-scheme: light; }
  body { margin: 0; background: #edf1f3; }
  button, textarea { font: inherit; }
  .agent-demo-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: #edf1f3;
    color: #15211f;
    font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  .demo-header {
    height: 58px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    background: #ffffff;
    border-bottom: 1px solid #d8dfdf;
  }
  .header-back, .header-actions button, .preview-heading button, .version-list button {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #d6dddd;
    background: #ffffff;
    color: #31504a;
    cursor: pointer;
  }
  .header-back:hover, .header-actions button:hover, .preview-heading button:hover, .version-list button:hover {
    border-color: #16877a;
    color: #0f766e;
  }
  .header-title { min-width: 0; display: flex; align-items: center; gap: 10px; }
  .header-title h1 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; letter-spacing: 0; }
  .simulation-badge { display: inline-flex; align-items: center; gap: 5px; color: #9a3412; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .header-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
  .header-actions > span { color: #60716e; font: 700 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
  .workspace-error { padding: 8px 16px; background: #fff1f2; border-bottom: 1px solid #fecdd3; color: #be123c; font-size: 12px; }
  .demo-workbench {
    height: calc(100vh - 58px);
    height: calc(100dvh - 58px);
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(230px, 270px) minmax(420px, 1fr) minmax(280px, 330px);
    gap: 1px;
    background: #d8dfdf;
  }
  .workspace-error + .mobile-tabs + .demo-workbench { height: calc(100dvh - 94px); }
  .spec-panel, .preview-panel, .revision-panel { min-width: 0; min-height: 0; background: #ffffff; }
  .spec-panel, .revision-panel { display: flex; flex-direction: column; }
  .preview-panel { display: flex; flex-direction: column; background: #e7ecee; }
  .panel-heading {
    min-height: 54px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 9px 14px;
    border-bottom: 1px solid #e0e6e5;
    background: #ffffff;
  }
  .panel-heading > span, .panel-heading > div > span { color: #1c302c; font-size: 13px; font-weight: 800; }
  .panel-heading small { margin-top: 2px; color: #778582; font-size: 10px; }
  .preview-heading { flex-direction: row; align-items: center; justify-content: space-between; }
  .preview-heading > div { display: flex; flex-direction: column; }
  .spec-scroll { overflow-y: auto; padding: 0 14px 24px; }
  .spec-scroll section { padding: 14px 0; border-bottom: 1px solid #edf0ef; }
  .spec-scroll h2, .version-heading h2 { margin: 0 0 7px; color: #64736f; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0; }
  .spec-scroll p, .spec-scroll li { margin: 0; color: #344743; font-size: 12px; line-height: 1.6; }
  .spec-scroll ul, .spec-scroll ol { margin: 0; padding-left: 18px; }
  .spec-scroll li + li { margin-top: 5px; }
  .scenario-list { display: flex; flex-direction: column; gap: 8px; }
  .scenario-list > div { padding-left: 9px; border-left: 2px solid #55a99c; }
  .scenario-list strong { display: block; margin-bottom: 2px; font-size: 11px; }
  .scenario-list p { color: #71807d; font-size: 10px; }
  .iframe-shell { flex: 1; min-height: 0; padding: 14px; }
  .iframe-shell iframe { width: 100%; height: 100%; display: block; box-sizing: border-box; border: 1px solid #cfd8d7; background: #ffffff; box-shadow: 0 8px 24px rgba(25, 47, 43, 0.08); }
  .revision-form { padding: 14px; border-bottom: 1px solid #e0e6e5; }
  .revision-form label { display: block; margin-bottom: 7px; color: #344743; font-size: 11px; font-weight: 700; }
  .revision-form textarea { width: 100%; height: 108px; resize: vertical; box-sizing: border-box; padding: 10px; border: 1px solid #cad5d3; background: #f9fbfa; color: #1c302c; font-size: 12px; line-height: 1.5; outline: none; }
  .revision-form textarea:focus { border-color: #16877a; box-shadow: 0 0 0 2px rgba(22, 135, 122, 0.12); }
  .revision-submit-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; }
  .revision-submit-row small { color: #889592; font-size: 10px; }
  .revision-submit-row button { min-height: 34px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 11px; border: 1px solid #0f766e; background: #0f766e; color: #ffffff; font-size: 11px; font-weight: 800; cursor: pointer; }
  .revision-submit-row button:disabled { border-color: #bdc8c6; background: #bdc8c6; cursor: not-allowed; }
  .version-heading { display: flex; align-items: center; justify-content: space-between; padding: 13px 14px 8px; }
  .version-heading h2 { margin: 0; }
  .version-heading span { color: #7b8986; font-size: 10px; }
  .version-list { min-height: 0; overflow-y: auto; padding: 0 10px 18px; }
  .version-list > div { display: flex; align-items: flex-start; gap: 8px; padding: 10px 5px; border-bottom: 1px solid #edf0ef; }
  .version-list > div.current { background: #f0fdfa; }
  .version-list > div > div { min-width: 0; flex: 1; }
  .version-list strong { display: block; color: #25413b; font-size: 11px; }
  .version-list time { display: block; margin-top: 2px; color: #899693; font-size: 9px; }
  .version-list p { margin: 5px 0 0; color: #60716e; font-size: 10px; line-height: 1.4; overflow-wrap: anywhere; }
  .version-list button { width: 28px; height: 28px; flex: 0 0 auto; }
  .mobile-tabs { display: none; }
  .loading-page, .error-page { display: grid; place-items: center; padding: 24px; box-sizing: border-box; }
  .generation-status, .error-panel { width: min(480px, 100%); padding: 30px; box-sizing: border-box; background: #ffffff; border: 1px solid #d8dfdf; }
  .generation-spinner { width: 32px; height: 32px; border: 3px solid #d7e5e2; border-top-color: #0f766e; border-radius: 50%; animation: demo-spin 0.8s linear infinite; }
  @keyframes demo-spin { to { transform: rotate(360deg); } }
  .generation-eyebrow { margin: 20px 0 5px; color: #0f766e; font-size: 10px; font-weight: 800; }
  .generation-status h1, .error-panel h1 { margin: 0 0 18px; font-size: 22px; letter-spacing: 0; }
  .generation-stages { border-top: 1px solid #e5eae9; }
  .generation-stages > div { display: flex; align-items: center; gap: 12px; min-height: 42px; border-bottom: 1px solid #e5eae9; color: #98a3a1; }
  .generation-stages > div.done { color: #24443e; }
  .generation-stages span { width: 42px; font-size: 9px; font-weight: 800; }
  .generation-stages p { margin: 0; font-size: 12px; }
  .generation-status > small { display: block; margin-top: 14px; color: #7a8885; font-size: 10px; }
  .error-panel p { color: #5e6e6b; line-height: 1.6; }
  .error-panel a { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; color: #0f766e; font-size: 12px; font-weight: 800; text-decoration: none; }
  @media (max-width: 900px) {
    .demo-header { height: 54px; padding: 0 10px; }
    .header-title { gap: 7px; }
    .header-title h1 { max-width: 42vw; font-size: 13px; }
    .simulation-badge { font-size: 9px; }
    .header-actions > span { display: none; }
    .mobile-tabs { height: 42px; display: grid; grid-template-columns: repeat(3, 1fr); background: #ffffff; border-bottom: 1px solid #d8dfdf; }
    .mobile-tabs button { border: 0; border-bottom: 2px solid transparent; background: #ffffff; color: #687874; font-size: 11px; font-weight: 800; }
    .mobile-tabs button.active { border-bottom-color: #0f766e; color: #0f766e; }
    .demo-workbench, .workspace-error + .mobile-tabs + .demo-workbench { display: block; height: calc(100dvh - 96px); background: #ffffff; }
    .workspace-error + .mobile-tabs + .demo-workbench { height: calc(100dvh - 132px); }
    .spec-panel, .preview-panel, .revision-panel { display: none; height: 100%; }
    .spec-panel.mobile-active, .revision-panel.mobile-active { display: flex; }
    .preview-panel.mobile-active { display: flex; }
    .iframe-shell { padding: 8px; }
  }
`;
