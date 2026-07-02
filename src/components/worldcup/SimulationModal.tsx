import React, { useState, useEffect } from 'react';
import type { PredictionFeatures, SimulationResult } from '../../lib/worldcupPredictionEngine';
import GenericLoader from './GenericLoader';

interface SimulationModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any; // The prediction match object
    homeMeta: any;
    awayMeta: any;
}

export default function SimulationModal({ isOpen, onClose, match, homeMeta, awayMeta }: SimulationModalProps) {
    const [features, setFeatures] = useState<PredictionFeatures>({
        injury_impact_home: 0,
        injury_impact_away: 0,
        lineup_strength_home: 1,
        lineup_strength_away: 1,
        weather_impact_style: 'neutral',
        rain_level: 'none'
    });
    
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [loading, setLoading] = useState(false);
    
    // AI State
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiAnswer, setAiAnswer] = useState("");
    const [aiParsedData, setAiParsedData] = useState<any>(null);
    const [aiSuggestedActions, setAiSuggestedActions] = useState<any[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    
    useEffect(() => {
        if (isOpen && match) {
            runSimulation(features);
        }
    }, [isOpen, features, match]);
    
    const runSimulation = async (currentFeatures: PredictionFeatures) => {
        setLoading(true);
        try {
            const res = await fetch('/api/worldcup/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ match_id: match.match_id, features: currentFeatures })
            });
            if (res.ok) {
                const data = await res.json();
                setResult(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    
    const handleAskAI = async () => {
        if (!aiPrompt.trim()) return;
        setAiLoading(true);
        setAiAnswer("");
        setAiParsedData(null);
        setAiSuggestedActions([]);
        setAiError("");
        try {
            const res = await fetch('/api/worldcup/ai-match-chat', {
                method: 'POST',
                body: JSON.stringify({ 
                    match_id: match.match_id, 
                    user_message: aiPrompt, 
                    match: match,
                    baseline: baseline,
                    features: match.features,
                    current_scenario: features
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.error || `AI 服务暂时不可用 (${res.status})，请稍后重试。`);
            }
            if (!res.body) throw new Error("No readable stream");
            
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                
                const parts = fullText.split('```json');
                const answer = parts[0].trim();
                
                if (answer) {
                    setAiAnswer(answer);
                }

                if (parts.length > 1 && fullText.endsWith('}')) {
                    try {
                        const jsonStr = parts[1].split('```')[0].trim();
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.suggested_actions) {
                             setAiSuggestedActions(parsed.suggested_actions);
                        }
                        setAiParsedData(parsed);
                    } catch(e) {}
                }
            }
            
            // Final parse pass to ensure we got it
            const finalParts = fullText.split('```json');
            if (finalParts.length > 1) {
                try {
                     const parsed = JSON.parse(finalParts[1].split('```')[0].trim());
                     if (parsed.suggested_actions) {
                         setAiSuggestedActions(parsed.suggested_actions);
                     }
                     setAiParsedData(parsed);
                } catch(e) {}
            }
        } catch(e: any) {
            console.error(e);
            setAiError(e.message || "请求异常");
        } finally {
            setAiLoading(false);
        }
    };
    
    const handleSave = async () => {
        try {
            await fetch('/api/worldcup/scenarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    match_id: match.match_id,
                    scenario_name: 'Custom Sim',
                    user_id: 'guest',
                    features
                })
            });
            alert('Scenario saved!');
            onClose();
        } catch (e) {
            alert('Save failed');
        }
    };
    
    if (!isOpen || !match) return null;
    
    const baseline = result?.baseline || { home: match.prob_home_win, draw: match.prob_draw, away: match.prob_away_win };
    const adjusted = result?.adjusted || baseline;
    const delta = result?.delta || { home: 0, draw: 0, away: 0 };
    
    const renderDelta = (d: number) => {
        if (Math.abs(d) < 0.001) return <span className="text-slate-500">-</span>;
        return d > 0 ? <span className="text-emerald-400">+{ (d*100).toFixed(1) }%</span> : <span className="text-rose-400">{ (d*100).toFixed(1) }%</span>;
    };
    
    const ProgressBar = ({ pHome, pDraw, pAway }: { pHome: number, pDraw: number, pAway: number }) => (
        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${pHome * 100}%` }}></div>
            <div className="bg-slate-500 transition-all duration-500" style={{ width: `${pDraw * 100}%` }}></div>
            <div className="bg-rose-500 transition-all duration-500" style={{ width: `${pAway * 100}%` }}></div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/95 z-10 rounded-t-2xl">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        🧪 <span className="zh">推演实验室</span><span className="en">Prediction Lab</span>
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-xl px-2">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 grid md:grid-cols-2 gap-8">
                    {/* Left: Probabilities & Explanations */}
                    <div className="space-y-8">
                        <div className="text-center flex justify-center items-center space-x-4 mb-6">
                            <span className="text-2xl font-bold">{homeMeta.flag} <span className="zh">{homeMeta.zh}</span><span className="en">{homeMeta.en}</span></span>
                            <span className="text-slate-500 font-bold">VS</span>
                            <span className="text-2xl font-bold"><span className="zh">{awayMeta.zh}</span><span className="en">{awayMeta.en}</span> {awayMeta.flag}</span>
                        </div>
                        
                        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                            <div className="text-sm text-slate-400 mb-2 font-bold tracking-widest uppercase">
                                <span className="zh">基准预测 (Baseline)</span>
                                <span className="en">Baseline</span>
                            </div>
                            <ProgressBar pHome={baseline.home} pDraw={baseline.draw} pAway={baseline.away} />
                            <div className="flex justify-between text-xs mt-2 text-slate-400">
                                <span>{(baseline.home*100).toFixed(1)}%</span>
                                <span>{(baseline.draw*100).toFixed(1)}%</span>
                                <span>{(baseline.away*100).toFixed(1)}%</span>
                            </div>
                        </div>
                        
                        <div className="bg-indigo-900/20 p-5 rounded-xl border border-indigo-500/30">
                            <div className="text-sm text-indigo-300 mb-2 font-bold tracking-widest uppercase flex justify-between">
                                <span>
                                    <span className="zh">推演结果 (Adjusted)</span>
                                    <span className="en">Adjusted</span>
                                </span>
                                {loading && <span className="animate-pulse">...</span>}
                            </div>
                            <ProgressBar pHome={adjusted.home} pDraw={adjusted.draw} pAway={adjusted.away} />
                            <div className="flex justify-between text-xs mt-2 font-bold">
                                <div><span className="text-emerald-400">{(adjusted.home*100).toFixed(1)}%</span> <span className="text-[10px] ml-1">{renderDelta(delta.home)}</span></div>
                                <div><span className="text-slate-300">{(adjusted.draw*100).toFixed(1)}%</span> <span className="text-[10px] ml-1">{renderDelta(delta.draw)}</span></div>
                                <div><span className="text-rose-400">{(adjusted.away*100).toFixed(1)}%</span> <span className="text-[10px] ml-1">{renderDelta(delta.away)}</span></div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-800/30 p-4 rounded-xl text-sm text-slate-300 min-h-[150px] relative overflow-hidden">
                            {/* Loading Overlay */}
                            {loading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] transition-all duration-300">
                                    <GenericLoader className="h-[80px] w-[80px]" />
                                </div>
                            )}

                            <h4 className="font-bold text-slate-400 mb-4 relative z-0 border-b border-slate-700/50 pb-2">
                                <span className="zh">影响因子分析：</span>
                                <span className="en">Impact Factors Analysis:</span>
                            </h4>
                            
                            <ul className="list-disc pl-5 space-y-3 relative z-0 text-slate-300">
                                <li>
                                    <span className="text-indigo-400 font-bold mr-2">[基准模型 Baseline]</span>
                                    {baseline.home - baseline.away > 0.3 && (
                                        <span>
                                            <span className="zh">主队胜率达 {(baseline.home*100).toFixed(1)}%，在 Elo 积分与近期战绩上呈碾压性优势。</span>
                                            <span className="en">Home team has a {(baseline.home*100).toFixed(1)}% win prob, showing an overwhelming Elo and form advantage.</span>
                                        </span>
                                    )}
                                    {baseline.away - baseline.home > 0.3 && (
                                        <span>
                                            <span className="zh">客队胜率达 {(baseline.away*100).toFixed(1)}%，在 Elo 积分与近期战绩上呈碾压性优势。</span>
                                            <span className="en">Away team has a {(baseline.away*100).toFixed(1)}% win prob, showing an overwhelming Elo and form advantage.</span>
                                        </span>
                                    )}
                                    {Math.abs(baseline.home - baseline.away) <= 0.1 && (
                                        <span>
                                            <span className="zh">双方胜率差不足 10%，数据模型表明这将是一场势均力敌的硬仗。</span>
                                            <span className="en">Win prob diff under 10%. Model indicates a highly evenly matched game.</span>
                                        </span>
                                    )}
                                    {baseline.home - baseline.away > 0.1 && baseline.home - baseline.away <= 0.3 && (
                                        <span>
                                            <span className="zh">主队纸面实力略占上风，但差距并未拉开，存在不小的爆冷空间。</span>
                                            <span className="en">Home team has a slight edge on paper, but an upset remains very possible.</span>
                                        </span>
                                    )}
                                    {baseline.away - baseline.home > 0.1 && baseline.away - baseline.home <= 0.3 && (
                                        <span>
                                            <span className="zh">客队纸面实力略占上风，但差距并未拉开，存在不小的爆冷空间。</span>
                                            <span className="en">Away team has a slight edge on paper, but an upset remains very possible.</span>
                                        </span>
                                    )}
                                </li>

                                {result?.explanations && result.explanations.map((exp: any, i: number) => (
                                    <li key={i} className="text-emerald-300">
                                        <span className="font-bold mr-2">[动态推演 Adjusted]</span>
                                        <span className="zh">{exp.zh}</span>
                                        <span className="en">{exp.en}</span>
                                    </li>
                                ))}

                                {(!result?.explanations || result.explanations.length === 0) && (
                                    <li className="text-slate-500 italic list-none -ml-5 pt-4 text-center border-t border-slate-700/30 mt-4">
                                        <div className="zh">调整右侧参数，在此观测 AI 动态推演过程...</div>
                                        <div className="en">Adjust parameters to see dynamic simulation explanations...</div>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                    
                    {/* Right: Controls */}
                    <div className="space-y-6">
                        
                        {/* Ask AI Box */}
                        <div className="bg-gradient-to-br from-indigo-900/40 to-fuchsia-900/20 p-5 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.15)] relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                            
                            <h4 className="font-bold text-indigo-300 mb-3 relative z-10 flex items-center gap-2">
                                <span className="text-xl">✨</span>
                                <span>
                                    <span className="zh">一句话推演 (Ask AI)</span>
                                    <span className="en">Ask AI Simulator</span>
                                </span>
                            </h4>
                            <div className="flex gap-2 relative z-10">
                                <input 
                                    type="text" 
                                    className="flex-1 bg-slate-950/80 border border-indigo-500/50 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-inner"
                                    placeholder="比如：“主队核心缺阵，而且会下雨”"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                                />
                                <button 
                                    onClick={handleAskAI}
                                    disabled={aiLoading || !aiPrompt.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-lg whitespace-nowrap"
                                >
                                    {aiLoading ? <span className="animate-pulse tracking-widest">...</span> : <span className="zh">发送</span>}
                                    {!aiLoading && <span className="en hidden">Send</span>}
                                </button>
                            </div>

                            {aiError && (
                                <div className="mt-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
                                    <span className="font-bold mr-2">❌ 错误:</span>
                                    {aiError}
                                </div>
                            )}

                            {aiAnswer && (
                                <div className="mt-4 pt-4 border-t border-indigo-500/30 relative z-10">
                                    <div className="text-xs text-indigo-300 font-bold mb-2 flex items-center gap-1">
                                        <span>🤖</span>
                                        <span className="zh">AI 分析师解读：</span>
                                        <span className="en">AI Analysis:</span>
                                    </div>
                                    <div className="text-sm text-indigo-100/90 whitespace-pre-wrap leading-relaxed">
                                        {aiAnswer}
                                    </div>
                                    
                                    {aiParsedData && (
                                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-wider">
                                            {aiParsedData.scenario_judgement && (
                                                <span className={`px-2 py-1 rounded bg-slate-800 border ${aiParsedData.scenario_judgement === 'rule_exception' ? 'border-red-500/50 text-red-400' : 'border-indigo-500/50 text-indigo-400'}`}>
                                                    {aiParsedData.scenario_judgement.replace('_', ' ')}
                                                </span>
                                            )}
                                            {aiParsedData.data_quality && (
                                                <span className={`px-2 py-1 rounded bg-slate-800 border ${aiParsedData.data_quality === 'weak' ? 'border-amber-500/50 text-amber-400' : 'border-emerald-500/50 text-emerald-400'}`}>
                                                    Data Quality: {aiParsedData.data_quality}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {aiParsedData?.model_basis && aiParsedData.model_basis.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-[11px] text-indigo-400 mb-1 font-bold">Model Basis:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {aiParsedData.model_basis.map((basis: string, i: number) => (
                                                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-200">{basis}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {aiSuggestedActions.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {aiSuggestedActions.map((action, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        if (action.action === 'apply_features' && action.features) {
                                                            setFeatures((prev: PredictionFeatures) => ({ ...prev, ...action.features }));
                                                        } else if (action.action === 'set_match_status_exception') {
                                                            alert('已标记异常，常规模型暂停适用。');
                                                        }
                                                    }}
                                                    className={`border text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-lg ${
                                                        action.action === 'set_match_status_exception' 
                                                        ? 'bg-rose-600/50 hover:bg-rose-500 border-rose-400' 
                                                        : 'bg-indigo-600/50 hover:bg-indigo-500 border-indigo-400'
                                                    }`}
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {aiParsedData?.follow_up_questions && aiParsedData.follow_up_questions.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-indigo-500/20">
                                            <div className="text-[11px] text-slate-400 mb-1.5 font-bold">Try asking:</div>
                                            <div className="flex flex-col gap-1.5">
                                                {aiParsedData.follow_up_questions.map((q: string, i: number) => (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => { setAiPrompt(q); handleAskAI(); }}
                                                        className="text-left text-xs text-indigo-300 hover:text-white transition-colors flex items-start gap-1.5"
                                                    >
                                                        <span className="text-indigo-500">→</span> {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                            <h4 className="font-bold text-white mb-4">
                                <span className="zh">首发强度 (Lineup Strength)</span>
                                <span className="en">Lineup Strength</span>
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 flex justify-between mb-1">
                                        <span><span className="zh">主队</span><span className="en">Home</span> ({homeMeta.flag} <span className="zh">{homeMeta.zh}</span><span className="en">{homeMeta.en}</span>)</span>
                                        <span className="font-mono text-indigo-300">{features.lineup_strength_home?.toFixed(2)}</span>
                                    </label>
                                    <input type="range" min="0.8" max="1.2" step="0.05" 
                                        value={features.lineup_strength_home || 1} 
                                        onChange={e => setFeatures({...features, lineup_strength_home: parseFloat(e.target.value)})}
                                        className="w-full accent-indigo-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 flex justify-between mb-1">
                                        <span><span className="zh">客队</span><span className="en">Away</span> (<span className="zh">{awayMeta.zh}</span><span className="en">{awayMeta.en}</span> {awayMeta.flag})</span>
                                        <span className="font-mono text-indigo-300">{features.lineup_strength_away?.toFixed(2)}</span>
                                    </label>
                                    <input type="range" min="0.8" max="1.2" step="0.05" 
                                        value={features.lineup_strength_away || 1} 
                                        onChange={e => setFeatures({...features, lineup_strength_away: parseFloat(e.target.value)})}
                                        className="w-full accent-indigo-500" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                            <h4 className="font-bold text-white mb-4">
                                <span className="zh">伤病停赛 (Injury Impact)</span>
                                <span className="en">Injury Impact</span>
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 flex justify-between mb-1">
                                        <span><span className="zh">主队</span><span className="en">Home</span> ({homeMeta.flag} <span className="zh">{homeMeta.zh}</span><span className="en">{homeMeta.en}</span>)</span>
                                        <span className="font-mono text-rose-400">{features.injury_impact_home?.toFixed(2)}</span>
                                    </label>
                                    <input type="range" min="-0.1" max="0" step="0.01" 
                                        value={features.injury_impact_home || 0} 
                                        onChange={e => setFeatures({...features, injury_impact_home: parseFloat(e.target.value)})}
                                        className="w-full accent-rose-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 flex justify-between mb-1">
                                        <span><span className="zh">客队</span><span className="en">Away</span> (<span className="zh">{awayMeta.zh}</span><span className="en">{awayMeta.en}</span> {awayMeta.flag})</span>
                                        <span className="font-mono text-rose-400">{features.injury_impact_away?.toFixed(2)}</span>
                                    </label>
                                    <input type="range" min="-0.1" max="0" step="0.01" 
                                        value={features.injury_impact_away || 0} 
                                        onChange={e => setFeatures({...features, injury_impact_away: parseFloat(e.target.value)})}
                                        className="w-full accent-rose-500" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                            <h4 className="font-bold text-white mb-4">
                                <span className="zh">赔率干预 (Market Odds)</span>
                                <span className="en">Market Odds</span>
                            </h4>
                            <div className="flex gap-3">
                                <input type="number" step="0.01" placeholder="主胜" className="w-1/3 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm"
                                    value={features.odds_1x2_home || ''} onChange={e => setFeatures({...features, odds_1x2_home: parseFloat(e.target.value)})} />
                                <input type="number" step="0.01" placeholder="平局" className="w-1/3 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm"
                                    value={features.odds_1x2_draw || ''} onChange={e => setFeatures({...features, odds_1x2_draw: parseFloat(e.target.value)})} />
                                <input type="number" step="0.01" placeholder="客胜" className="w-1/3 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm"
                                    value={features.odds_1x2_away || ''} onChange={e => setFeatures({...features, odds_1x2_away: parseFloat(e.target.value)})} />
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                            <h4 className="font-bold text-white mb-4">
                                <span className="zh">天气 (Weather)</span>
                                <span className="en">Weather Impact</span>
                            </h4>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-400 block mb-1">影响风格</label>
                                    <select className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                                        value={features.weather_impact_style || 'neutral'} 
                                        onChange={e => setFeatures({...features, weather_impact_style: e.target.value as any})}>
                                        <option value="neutral">中立 / 无影响</option>
                                        <option value="slow_tempo">慢节奏 / 闷战</option>
                                        <option value="high_variance">高变数 / 爆冷温床</option>
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="text-xs text-slate-400 block mb-1">雨雪</label>
                                    <select className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                                        value={features.rain_level || 'none'} 
                                        onChange={e => setFeatures({...features, rain_level: e.target.value as any})}>
                                        <option value="none">无</option>
                                        <option value="light">小</option>
                                        <option value="heavy">大</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-4 flex justify-end">
                            {/* Save Scenario hidden temporarily due to missing migrations 
                            <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg">
                                <span className="zh">保存推演方案 (Save Scenario)</span>
                                <span className="en">Save Scenario</span>
                            </button>
                            */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
