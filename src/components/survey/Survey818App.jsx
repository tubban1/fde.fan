import { useState } from "react";

const DOMESTIC_QUESTIONS = [
  {
    id: "business_type",
    title: "1. 您的企业模式与门店数量规模？",
    subtitle: "用于匹配同规模连锁企业的平均水平",
    type: "single",
    options: [
      { label: "1-10 家门店（区域初创/精品店）", score: { data: 30, org: 40 } },
      { label: "11-50 家门店（区域成长型连锁）", score: { data: 50, org: 60 } },
      { label: "51-100 家门店（中型连锁/直营品牌）", score: { data: 70, org: 80 } },
      { label: "100+ 家门店（大型加盟/全国连锁）", score: { data: 90, org: 95 } },
    ],
  },
  {
    id: "data_foundation",
    title: "2. SKU产品资料、导购话术与客户数据资产情况？",
    subtitle: "评估企业的数据与知识结构化程度",
    type: "single",
    options: [
      { label: "分散在纸质/微信聊天记录中，未做系统整理", score: { data: 20 } },
      { label: "有 Excel/Word 整理的 SKU 卖点与培训资料", score: { data: 50 } },
      { label: "已建立导购 SOP 手册与标准话术库", score: { data: 75 } },
      { label: "已使用 CRM / 知识库系统做结构化管理", score: { data: 95 } },
    ],
  },
  {
    id: "ai_maturity",
    title: "3. 企业目前 AI 工具的应用成熟度？",
    subtitle: "评估团队的实际 AI 渗透率",
    type: "single",
    options: [
      { label: "Level 1｜基本没有使用过 AI 工具", score: { maturity: 15 } },
      { label: "Level 2｜老板/个别员工偶尔使用 ChatGPT/文心一言", score: { maturity: 40 } },
      { label: "Level 3｜部分部门已经在日常工作中使用 AI", score: { maturity: 65 } },
      { label: "Level 4｜已建立标准化 AI 工作流程 / 使用 Agent", score: { maturity: 85 } },
      { label: "Level 5｜已深入业务系统定制专属 AI 体系", score: { maturity: 98 } },
    ],
  },
  {
    id: "ai_coverage",
    title: "4. 目前 AI 主要应用在哪些业务环节？",
    subtitle: "可多选",
    type: "multi",
    options: [
      { label: "门店导购话术 / SKU 推荐 / 客户咨询", score: { process: 25 } },
      { label: "小红书 / 抖音短视频文案与素材生成", score: { process: 25 } },
      { label: "私域会员运营 / 复购跟进 / 客服", score: { process: 25 } },
      { label: "经营数据分析 / 门店巡检 / 管理决策", score: { process: 25 } },
      { label: "暂时未应用在业务环节", score: { process: 0 } },
    ],
  },
  {
    id: "store_pain",
    title: "5. 门店销售与导购端，最希望 AI 解决什么痛点？",
    subtitle: "最多选择 2 项",
    type: "multi",
    maxSelect: 2,
    options: [
      { label: "导购不知道如何根据客人体质/肤质精准推荐 SKU", tag: "肤质推荐" },
      { label: "新品上市频繁，导购掌握卖点与培训速度慢", tag: "新品培训" },
      { label: "金牌导购优秀话术无法复制标准化到其他门店", tag: "话术复制" },
      { label: "导购无法快速回答成分、功效及孕妇/敏感肌禁忌", tag: "成分禁忌" },
    ],
  },
  {
    id: "content_pain",
    title: "6. 内容营销与私域运营，最大的瓶颈是什么？",
    subtitle: "最多选择 2 项",
    type: "multi",
    maxSelect: 2,
    options: [
      { label: "小红书/抖音等图文短视频需求量大，生产跟不上", tag: "内容产能" },
      { label: "营销文案存在功效宣称违规、违禁词踩坑罚款风险", tag: "合规审查" },
      { label: "私域客户缺乏千人千面跟进，沉睡会员不知道如何激活", tag: "沉睡激活" },
      { label: "多 SKU 卖点提炼与活动文案撰写耗时过长", tag: "卖点提炼" },
    ],
  },
  {
    id: "talent_status",
    title: "7. 企业目前是否有专门负责 AI 的人才储备？",
    subtitle: "评估 AI 人才与落地支撑力",
    type: "single",
    options: [
      { label: "目前无人负责，大家各自零散摸索", score: { talent: 15 } },
      { label: "有员工兼职负责关注 AI 工具和探索", score: { talent: 45 } },
      { label: "有专门的 AI / 数字化负责人", score: { talent: 75 } },
      { label: "已建立专职 AI 实施团队 / 计划培养 FDE", score: { talent: 95 } },
    ],
  },
  {
    id: "preferred_entry",
    title: "8. 如果开展企业 AI 升级，您最倾向从哪里切入？",
    subtitle: "寻找最佳落地杠杆点",
    type: "single",
    options: [
      { label: "老板与管理层先参加 AI 战略高管营", score: { org: 60 } },
      { label: "培养 1-2 名内部 AI 实施工程师 (FDE)，搭建业务 Agent", score: { talent: 90, org: 85 } },
      { label: "直接采购/定制企业专属 AI Agent 系统", score: { process: 85, org: 90 } },
      { label: "组织全员 AI 工具基础技能提升培训", score: { talent: 70 } },
    ],
  },
  {
    id: "timeline",
    title: "9. 您预计企业推进 AI 项目的时间窗口？",
    subtitle: "帮助匹配落地节奏",
    type: "single",
    options: [
      { label: "立即推进（已有预算与意向）", score: { org: 95 } },
      { label: "1 个月内推进", score: { org: 80 } },
      { label: "1-3 个月内观望评估", score: { org: 60 } },
      { label: "暂时没有明确计划", score: { org: 30 } },
    ],
  },
];

const CROSSBORDER_QUESTIONS = [
  {
    id: "cb_mode",
    title: "1. 您的跨境出海模式与主要市场？",
    subtitle: "选择主要经营渠道",
    type: "single",
    options: [
      { label: "Amazon / 多平台卖家（欧美市场为主）", score: { data: 60, org: 70 } },
      { label: "TikTok Shop / 社交电商（东南亚/美区为主）", score: { data: 65, org: 75 } },
      { label: "独立站品牌出海（DTC 全球市场）", score: { data: 80, org: 85 } },
      { label: "美妆跨境代运营 / 传统出口转型", score: { data: 50, org: 60 } },
    ],
  },
  {
    id: "cb_maturity",
    title: "2. 团队目前 AI 工具的使用渗透率？",
    subtitle: "评估出海团队的 AI 化程度",
    type: "single",
    options: [
      { label: "Level 1｜仅偶用 ChatGPT 做基础翻译", score: { maturity: 20 } },
      { label: "Level 2｜使用 AI 生成部分 Listing 和社媒文案", score: { maturity: 45 } },
      { label: "Level 3｜使用 AI 批量生成广告图片与视频素材", score: { maturity: 70 } },
      { label: "Level 4｜已建立多语言 AI 客服与数据分析 Agent", score: { maturity: 90 } },
    ],
  },
  {
    id: "cb_pain",
    title: "3. 跨境业务中，当前最头疼的经营问题？",
    subtitle: "最多选择 2 项",
    type: "multi",
    maxSelect: 2,
    options: [
      { label: "多语种本土化文案与社媒种草内容产能跟不上", tag: "出海内容" },
      { label: "TikTok / Meta 广告短视频素材消耗极快，制作成本高", tag: "广告素材" },
      { label: "海外客服存在时差、语言障碍，响应慢导致弃购", tag: "海外客服" },
      { label: "海外市场热点与竞品卖点分析缺乏深度洞察", tag: "市场洞察" },
    ],
  },
  {
    id: "cb_talent",
    title: "4. 企业是否有具备 AI 出海落地能力的人员？",
    type: "single",
    options: [
      { label: "尚无专人，依赖运营人员兼职摸索", score: { talent: 25 } },
      { label: "有 1 名核心成员尝试搭建工作流", score: { talent: 60 } },
      { label: "计划培养 1-2 名 FDE 出海 AI 架构师", score: { talent: 90 } },
      { label: "已有成熟的数字化/AI 团队", score: { talent: 95 } },
    ],
  },
];

export default function Survey818App() {
  const [branch, setBranch] = useState(null); // 'domestic' | 'crossborder' | 'general'
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);

  const getQuestions = () => {
    if (branch === "crossborder") return CROSSBORDER_QUESTIONS;
    return DOMESTIC_QUESTIONS;
  };

  const questions = getQuestions();

  const handleSelectBranch = (selectedBranch) => {
    setBranch(selectedBranch);
    setCurrentStep(0);
    setAnswers({});
    setIsCompleted(false);
  };

  const handleSingleSelect = (questionId, optionIndex) => {
    const newAnswers = { ...answers, [questionId]: optionIndex };
    setAnswers(newAnswers);
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleMultiSelectToggle = (questionId, optionIndex, maxSelect = 99) => {
    const currentList = answers[questionId] || [];
    let updated;
    if (currentList.includes(optionIndex)) {
      updated = currentList.filter((i) => i !== optionIndex);
    } else {
      if (currentList.length >= maxSelect) {
        updated = [...currentList.slice(1), optionIndex];
      } else {
        updated = [...currentList, optionIndex];
      }
    }
    setAnswers({ ...answers, [questionId]: updated });
  };

  const calculateResults = () => {
    let maturity = 40;
    let data = 45;
    let process = 40;
    let talent = 35;
    let org = 50;

    const qList = getQuestions();
    qList.forEach((q) => {
      const ans = answers[q.id];
      if (ans === undefined) return;

      if (q.type === "single") {
        const selectedOpt = q.options[ans];
        if (selectedOpt && selectedOpt.score) {
          if (selectedOpt.score.maturity !== undefined) maturity = selectedOpt.score.maturity;
          if (selectedOpt.score.data !== undefined) data = selectedOpt.score.data;
          if (selectedOpt.score.process !== undefined) process = selectedOpt.score.process;
          if (selectedOpt.score.talent !== undefined) talent = selectedOpt.score.talent;
          if (selectedOpt.score.org !== undefined) org = selectedOpt.score.org;
        }
      } else if (q.type === "multi" && Array.isArray(ans)) {
        ans.forEach((optIdx) => {
          const opt = q.options[optIdx];
          if (opt && opt.score) {
            if (opt.score.process !== undefined) process += opt.score.process;
          }
        });
      }
    });

    process = Math.min(100, Math.max(10, process));

    const overallScore = Math.round(
      maturity * 0.2 + data * 0.2 + process * 0.25 + talent * 0.15 + org * 0.2
    );

    const percentile = Math.min(96, Math.max(35, Math.round(overallScore * 0.85 + 15)));

    let levelTitle = "Level 2｜应用探索期";
    if (overallScore >= 75) levelTitle = "Level 4｜系统深度融合期";
    else if (overallScore >= 60) levelTitle = "Level 3｜流程局部增效期";
    else if (overallScore < 35) levelTitle = "Level 1｜AI 认知起步期";

    const topProjects = [];
    if (branch === "crossborder") {
      topProjects.push("多语种美妆爆款文案与社媒 Agent");
      topProjects.push("TikTok / Meta 广告素材批产 Agent");
      topProjects.push("全天候 7×24 多语言跨境客服 Agent");
    } else {
      topProjects.push("AI 导购知识与成分/功效答疑 Agent");
      topProjects.push("新品上市 48 小时导购训战 Agent");
      topProjects.push("小红书爆款文案与合规审核 Agent");
    }

    return {
      overallScore,
      percentile,
      levelTitle,
      dimensions: {
        "AI应用成熟度": maturity,
        "数据/知识基础": data,
        "流程AI化程度": process,
        "AI人才能力": talent,
        "组织落地能力": org,
      },
      topProjects,
    };
  };

  const results = isCompleted ? calculateResults() : null;

  return (
    <div className="min-h-screen bg-[#05070d] text-[#f8fbff] py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Banner Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold tracking-wide uppercase mb-3">
            <span>✨ 818 美妆大会现场专属</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            2026 中国美妆企业 AI 成熟度指数 · 现场诊断
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            3 分钟评估企业 AI 数字化成熟度、核心落地瓶颈与 90 天高 ROI 项目建议
          </p>
        </div>

        {/* Step 0: Branch Choice */}
        {!branch && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">第 1 步：请选择您的主营业务方向</h2>
            <p className="text-slate-400 text-xs sm:text-sm mb-6">
              系统将根据不同的业务路径，自动匹配专属于您领域的诊断题目与建议模版
            </p>
            <div className="grid gap-4">
              <button
                onClick={() => handleSelectBranch("domestic")}
                className="group relative flex items-center justify-between p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-cyan-400/60 transition-all text-left"
              >
                <div>
                  <div className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                    ① 国内美妆连锁 / 门店经营
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    适用于区域美妆连锁、加盟店、品牌直营店、集合店及代理商
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                  →
                </div>
              </button>

              <button
                onClick={() => handleSelectBranch("crossborder")}
                className="group relative flex items-center justify-between p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-pink-400/60 transition-all text-left"
              >
                <div>
                  <div className="font-bold text-white text-base group-hover:text-pink-300 transition-colors">
                    ② 跨境电商 / 品牌出海
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    适用于 Amazon、TikTok Shop、独立站及出海美妆品牌
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-400/30 flex items-center justify-center text-pink-300 group-hover:scale-110 transition-transform">
                  →
                </div>
              </button>

              <button
                onClick={() => handleSelectBranch("domestic")}
                className="group relative flex items-center justify-between p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-lime-400/60 transition-all text-left"
              >
                <div>
                  <div className="font-bold text-white text-base group-hover:text-lime-300 transition-colors">
                    ③ 供应链 / OEM / ODM / 产品企业
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    适用于美妆工厂、研发中心、产品品牌及综合供应链企业
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-lime-500/10 border border-lime-400/30 flex items-center justify-center text-lime-300 group-hover:scale-110 transition-transform">
                  →
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Survey Question Steps */}
        {branch && !isCompleted && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs font-semibold text-cyan-400">
                题目 {currentStep + 1} / {questions.length}
              </div>
              <button
                onClick={() => setBranch(null)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                重新选择赛道
              </button>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mb-8 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-pink-500 to-lime-400 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              ></div>
            </div>

            {/* Question Title */}
            {(() => {
              const q = questions[currentStep];
              const selectedVal = answers[q.id];

              return (
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">{q.title}</h3>
                  {q.subtitle && <p className="text-xs sm:text-sm text-slate-400 mb-6">{q.subtitle}</p>}

                  {/* Options */}
                  <div className="grid gap-3 mb-8">
                    {q.options.map((opt, idx) => {
                      const isSelected =
                        q.type === "single"
                          ? selectedVal === idx
                          : Array.isArray(selectedVal) && selectedVal.includes(idx);

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (q.type === "single") {
                              handleSingleSelect(q.id, idx);
                            } else {
                              handleMultiSelectToggle(q.id, idx, q.maxSelect || 99);
                            }
                          }}
                          className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-cyan-500/10 border-cyan-400 text-white shadow-lg shadow-cyan-500/10"
                              : "bg-slate-800/40 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                          }`}
                        >
                          <span className="text-sm font-medium pr-3">{opt.label}</span>
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${
                              isSelected
                                ? "border-cyan-400 bg-cyan-400 text-slate-950 font-bold"
                                : "border-slate-600 bg-slate-900/50"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <button
                      disabled={currentStep === 0}
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ← 上一题
                    </button>

                    {q.type === "multi" && (
                      <button
                        onClick={() => {
                          if (currentStep < questions.length - 1) {
                            setCurrentStep(currentStep + 1);
                          } else {
                            setIsCompleted(true);
                          }
                        }}
                        className="px-6 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 shadow-lg shadow-cyan-400/20 transition-all"
                      >
                        {currentStep === questions.length - 1 ? "完成诊断，生成报告" : "下一题 →"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Diagnosis Results Screen */}
        {isCompleted && results && (
          <div className="space-y-6">
            {/* Header Score Card (简洁版) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-0"></div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="text-center sm:text-left">
                  <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold mb-2">
                    {results.levelTitle}
                  </div>
                  <h2 className="text-2xl font-bold text-white">美妆企业 AI 成熟度诊断结果</h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    击败现场 <span className="text-cyan-300 font-bold text-base">{results.percentile}%</span> 的同业参会企业
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/80 border border-cyan-500/30 min-w-[140px]">
                  <span className="text-xs text-slate-400 font-medium">AI Readiness</span>
                  <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-lime-300">
                    {results.overallScore}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">满分 100 分</span>
                </div>
              </div>

              {/* 5-Dimension Radar/Bar Progress */}
              <div className="mt-8 pt-6 border-t border-slate-800 grid gap-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  五维能力诊断指标
                </h4>
                {Object.entries(results.dimensions).map(([dimName, scoreVal]) => (
                  <div key={dimName} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{dimName}</span>
                      <span className="text-cyan-300">{scoreVal} 分</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-lime-400 rounded-full transition-all duration-500"
                        style={{ width: `${scoreVal}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Opportunity Map & Key Projects (简洁版) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <span>🗺️</span> AI Opportunity Map (优先落地建议)
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                基于您的企业规模与核心痛点，推演出的 90 天最佳切入路线：
              </p>

              <div className="grid gap-3 mb-6">
                {results.topProjects.map((proj, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3.5 p-4 rounded-xl border border-cyan-500/20 bg-slate-800/40"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      #{i + 1}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{proj}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        建议启动 30 天试点测试，重点验证培训时间缩短与导购问答准确率
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-300">
                <span className="font-bold">⚠️ 当前阶段不建议尝试：</span>{" "}
                自建大模型/大规模自研平台（研发周期长、ROI 极低，建议直接采用框架微调及通用 Agent 架构）。
              </div>
            </div>

            {/* Complete Report Gate with QR Code (完整版领取区) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/60 border-2 border-cyan-400/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="text-center max-w-lg mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-300 text-xs font-bold mb-3">
                  <span>📄 解锁 6 页完整 PDF 诊断报告</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                  扫描微信二维码，免费获取完整诊断书
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
                  以上为《简版 AI 诊断结果》。如需获取包含同行基准对比、30天实施SOP及1对1专家解读的
                  <span className="text-cyan-300 font-bold">《完整企业 AI 诊断报告书 (PDF)》</span>，请扫码加群：
                </p>

                {/* QR Code Container */}
                <div className="inline-block p-4 rounded-2xl bg-white/95 shadow-2xl border border-slate-200 mb-4 transition-transform hover:scale-105">
                  <img
                    src="/images/qrcode_818.jpg"
                    alt="FDE 联盟 www.fde.fan 微信群二维码"
                    className="w-56 h-auto mx-auto rounded-lg object-contain"
                  />
                  <div className="mt-2 text-slate-900 text-xs font-bold tracking-tight">
                    群聊：FDE 联盟 www.fde.fan
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  <p className="font-medium text-cyan-300">
                    💡 扫码/长按保存二维码加入群聊
                  </p>
                  <p>工作人员将在群内为您提供 1 对 1 专家解读与 PDF 完整报告发送服务</p>
                </div>
              </div>
            </div>

            {/* Restart Diagnosis Button */}
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setBranch(null);
                  setCurrentStep(0);
                  setAnswers({});
                  setIsCompleted(false);
                }}
                className="px-6 py-2.5 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-all"
              >
                ↺ 重新诊断
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
