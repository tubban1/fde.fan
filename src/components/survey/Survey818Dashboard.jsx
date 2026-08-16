import { useState, useEffect } from "react";

export default function Survey818Dashboard() {
  const [data, setData] = useState({ submissions: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const fetchData = async () => {
    try {
      setError("");
      const res = await fetch("/api/survey/818/submissions?t=" + Date.now());
      if (!res.ok) throw new Error("获取数据失败");
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[Dashboard] Error fetching data:", err);
      setError(err.message || "无法连接后端获取诊断数据");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const exportCSV = () => {
    if (!data.submissions || data.submissions.length === 0) return;
    const headers = ["提交时间", "企业名称", "联系人", "职务", "手机号", "微信号", "赛道", "成熟度得分", "等级", "推荐项目"];
    const rows = data.submissions.map((s) => [
      s.createdAt ? new Date(s.createdAt).toLocaleString("zh-CN") : "",
      `"${(s.companyName || "").replace(/"/g, '""')}"`,
      `"${(s.contactName || "").replace(/"/g, '""')}"`,
      `"${(s.position || "").replace(/"/g, '""')}"`,
      `"${s.phone || ""}"`,
      `"${s.wechat || ""}"`,
      s.branch === "crossborder" ? "跨境出海" : "国内连锁",
      s.overallScore || 0,
      `"${(s.levelTitle || "").replace(/"/g, '""')}"`,
      `"${(s.recommendedProjects || []).join("; ").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `818_Beauty_AI_Leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSubmissions = (data.submissions || []).filter((item) => {
    const matchesSearch =
      !searchQuery ||
      (item.companyName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.contactName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.phone || "").includes(searchQuery);

    const matchesBranch = filterBranch === "all" || item.branch === filterBranch;
    return matchesSearch && matchesBranch;
  });

  const { stats = {} } = data;

  return (
    <div className="min-h-screen bg-[#05070d] text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>818 美妆大会 · 现场诊断实时数据大屏</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">美妆企业 AI 成熟度监控看板</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              实时追踪填写企业、算力成熟度分值与高意向 Lead 线索库
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                autoRefresh
                  ? "bg-cyan-500/10 border-cyan-400/50 text-cyan-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <span>{autoRefresh ? "🟢 自动刷新 (10s)" : "⚪️ 自动刷新关"}</span>
            </button>

            <button
              onClick={fetchData}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-all"
            >
              🔄 手动刷新
            </button>

            <button
              onClick={exportCSV}
              disabled={!data.submissions || data.submissions.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-lime-400 text-slate-950 font-extrabold text-xs hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/10"
            >
              <span>📥 导出线索 CSV</span>
            </button>
          </div>
        </div>

        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="text-xs text-slate-400 font-medium">总诊断企业数</div>
            <div className="text-3xl font-extrabold text-white mt-1">
              {stats.totalCount || 0} <span className="text-xs font-normal text-slate-400">家</span>
            </div>
            <div className="text-[11px] text-cyan-400 mt-2">实时提交落库档案</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="text-xs text-slate-400 font-medium">平均 AI 成熟度得分</div>
            <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-lime-300 mt-1">
              {stats.avgScore || 0} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">基准同业平均算力</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="text-xs text-slate-400 font-medium">高意向 Lead 数量 (得分≥60)</div>
            <div className="text-3xl font-extrabold text-lime-300 mt-1">
              {stats.highIntentCount || 0}{" "}
              <span className="text-xs font-normal text-slate-400">
                ({stats.highIntentRate || 0}%)
              </span>
            </div>
            <div className="text-[11px] text-lime-400 mt-2">重点跟进转化为 Agent 客户</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="text-xs text-slate-400 font-medium">数据最后更新时间</div>
            <div className="text-lg font-bold text-slate-200 mt-2">
              {lastRefreshed.toLocaleTimeString("zh-CN")}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">自动秒级接收 API</div>
          </div>
        </div>

        {/* Aggregate Data Statistics & Chart Distributions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 5-Dimension Benchmarks */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
              <span>📊 美妆企业五维能力平均基准</span>
              <span className="text-xs text-slate-400 font-normal">全量样本算力</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.avgDimensions || {}).map(([dimName, scoreVal]) => (
                <div key={dimName} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{dimName}</span>
                    <span className="text-cyan-300 font-bold">{scoreVal} 分</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-lime-400 rounded-full transition-all duration-500"
                      style={{ width: `${scoreVal}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Track Distribution & Maturity Levels */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-3">🏷️ 参会企业赛道分布</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <div className="text-xs text-slate-400">国内美妆连锁</div>
                  <div className="text-xl font-bold text-cyan-300 mt-1">
                    {stats.branchDistribution?.domestic || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <div className="text-xs text-slate-400">跨境电商出海</div>
                  <div className="text-xl font-bold text-pink-300 mt-1">
                    {stats.branchDistribution?.crossborder || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <div className="text-xs text-slate-400">供应链/品牌</div>
                  <div className="text-xl font-bold text-lime-300 mt-1">
                    {stats.branchDistribution?.supply_chain || 0}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-3">📈 成熟度等级 Level 占比</h3>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(stats.levelDistribution || {}).map(([lvlName, countVal]) => (
                  <div
                    key={lvlName}
                    className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-center"
                  >
                    <div className="text-[11px] text-slate-400">{lvlName}</div>
                    <div className="text-base font-bold text-white mt-0.5">{countVal}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Real-time Submissions List Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🏢</span> 实时填报企业明细与线索表
              <span className="text-xs font-normal text-slate-400">
                ({filteredSubmissions.length} 条数据)
              </span>
            </h3>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="搜索企业、姓名、手机号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors w-48 sm:w-64"
              />

              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="h-9 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
              >
                <option value="all">全部赛道</option>
                <option value="domestic">国内连锁</option>
                <option value="crossborder">跨境出海</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <span className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2"></span>
              正在拉取最新企业诊断记录...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
              暂无提交记录，大会现场用户提交后将实时在此刷新呈现
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-800/30">
                    <th className="py-3 px-3 font-semibold">提交时间</th>
                    <th className="py-3 px-3 font-semibold">企业 / 品牌</th>
                    <th className="py-3 px-3 font-semibold">联系人</th>
                    <th className="py-3 px-3 font-semibold">职务</th>
                    <th className="py-3 px-3 font-semibold">联系方式</th>
                    <th className="py-3 px-3 font-semibold">赛道</th>
                    <th className="py-3 px-3 font-semibold">成熟度分</th>
                    <th className="py-3 px-3 font-semibold">诊断等级</th>
                    <th className="py-3 px-3 font-semibold text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id || sub.submissionId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-white whitespace-nowrap">
                        {sub.companyName}
                      </td>
                      <td className="py-3.5 px-3 text-slate-200 whitespace-nowrap">{sub.contactName}</td>
                      <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">{sub.position}</td>
                      <td className="py-3.5 px-3 text-cyan-300 font-mono whitespace-nowrap">
                        {sub.phone}
                        {sub.wechat && <span className="text-slate-400 ml-1">({sub.wechat})</span>}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            sub.branch === "crossborder"
                              ? "bg-pink-500/20 text-pink-300 border border-pink-400/30"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          }`}
                        >
                          {sub.branch === "crossborder" ? "跨境出海" : "国内连锁"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-base text-lime-300 whitespace-nowrap">
                        {sub.overallScore}
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap">
                        {sub.levelTitle}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 hover:text-white hover:border-cyan-400 transition-colors"
                        >
                          查看档案
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Enterprise Full Diagnosis Card Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedSubmission(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-2">
                🏢 {selectedSubmission.companyName}
              </div>
              <h3 className="text-xl font-bold text-white">企业 AI 成熟度完整档案</h3>
              <p className="text-xs text-slate-400 mt-1">
                提交人：{selectedSubmission.contactName} ({selectedSubmission.position}) ｜ 电话：
                {selectedSubmission.phone}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-400">成熟度评级</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {selectedSubmission.levelTitle}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">AI Readiness 得分</div>
                <div className="text-3xl font-black text-cyan-300">
                  {selectedSubmission.overallScore} <span className="text-xs font-normal">分</span>
                </div>
              </div>
            </div>

            {/* 5 Dimensions Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                五维指标明细
              </h4>
              <div className="space-y-2">
                {Object.entries(selectedSubmission.dimensions || {}).map(([dK, dV]) => (
                  <div key={dK} className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{dK}</span>
                    <span className="text-cyan-300 font-bold">{dV} 分</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Projects */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                推荐 Top 项目
              </h4>
              <div className="space-y-1.5">
                {(selectedSubmission.recommendedProjects || []).map((p, i) => (
                  <div key={i} className="text-xs text-slate-200 bg-slate-800/40 p-2 rounded border border-slate-800">
                    #{i + 1} {p}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:text-white"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
