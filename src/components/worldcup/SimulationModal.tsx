import React, { useState, useEffect } from 'react';
import type { PredictionFeatures, SimulationResult } from '../../lib/worldcupPredictionEngine';
import GenericLoader from './GenericLoader';

interface SimulationModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any; // The prediction match object
    homeMeta: any;
    awayMeta: any;
    mode?: 'ai' | 'manual';
}

export default function SimulationModal({ isOpen, onClose, match, homeMeta, awayMeta, mode = 'manual' }: SimulationModalProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [activeMode, setActiveMode] = useState<'ai' | 'manual'>(mode);
    const isAiMode = activeMode === 'ai';
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
    const [shareLoading, setShareLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState("");
    const [shareStatus, setShareStatus] = useState("");
    const [shareError, setShareError] = useState("");
    
    useEffect(() => {
        if (isOpen) {
            setActiveMode(mode);
        }
    }, [isOpen, mode, match?.match_id]);

    useEffect(() => {
        if (isOpen && match) {
            runSimulation(features);
        }
        if (isOpen && activeMode === 'ai') {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen, features, match, activeMode]);
    
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
        setShareUrl("");
        setShareStatus("");
        setShareError("");
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

    const buildShareTitle = () => {
        const homeName = homeMeta.zh || homeMeta.en || match.home_team_id;
        const awayName = awayMeta.zh || awayMeta.en || match.away_team_id;
        return `${homeName} vs ${awayName} AI 预测分析`;
    };

    const buildShareSummary = (url = shareUrl) => {
        const homeName = homeMeta.zh || homeMeta.en || match.home_team_id;
        const awayName = awayMeta.zh || awayMeta.en || match.away_team_id;
        const winner =
            adjusted.home >= adjusted.draw && adjusted.home >= adjusted.away
                ? `${homeName}方向`
                : adjusted.away >= adjusted.home && adjusted.away >= adjusted.draw
                    ? `${awayName}方向`
                    : '平局方向';
        const basis = aiParsedData?.model_basis?.length ? `\n关键依据：${aiParsedData.model_basis.slice(0, 3).join('、')}` : '';
        const linkLine = url ? `\n完整分析：${url}` : '';
        return [
            `世界杯预测：${homeName} vs ${awayName}`,
            `模型倾向：${winner}`,
            `概率：主胜 ${(adjusted.home * 100).toFixed(1)}% / 平局 ${(adjusted.draw * 100).toFixed(1)}% / 客胜 ${(adjusted.away * 100).toFixed(1)}%`,
            aiPrompt ? `提问：${aiPrompt}` : '',
            basis,
            linkLine
        ].filter(Boolean).join('\n');
    };

    const handleCreateShareLink = async (): Promise<string> => {
        if (!aiAnswer.trim()) return "";
        setShareLoading(true);
        setShareError("");
        setShareStatus("");
        try {
            const res = await fetch('/api/worldcup/share-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    match_id: match.match_id,
                    title: buildShareTitle(),
                    home_team: homeMeta,
                    away_team: awayMeta,
                    question: aiPrompt,
                    answer: aiAnswer,
                    parsed_data: aiParsedData || {},
                    features,
                    baseline,
                    adjusted,
                    delta
                })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || '生成分享链接失败');
            setShareUrl(data.url);
            setShareStatus('分享链接已生成');
            await navigator.clipboard?.writeText(data.url).catch(() => undefined);
            return data.url;
        } catch (error: any) {
            setShareError(error.message || '生成分享链接失败');
            return "";
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopySummary = async () => {
        try {
            await navigator.clipboard.writeText(buildShareSummary());
            setShareStatus('分析摘要已复制');
        } catch {
            setShareError('复制失败，请手动复制');
        }
    };

    const stripMarkdown = (text: string) => text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^\s*[-*]\s+/gm, '• ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const drawWrappedText = (
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
        maxLines: number
    ) => {
        const chars = text.split('');
        let line = '';
        let lines = 0;
        for (const char of chars) {
            const testLine = line + char;
            if (ctx.measureText(testLine).width > maxWidth && line) {
                ctx.fillText(line, x, y);
                y += lineHeight;
                lines += 1;
                line = char;
                if (lines >= maxLines - 1) break;
            } else {
                line = testLine;
            }
        }
        if (line && lines < maxLines) {
            ctx.fillText(lines === maxLines - 1 && line.length < chars.length ? `${line}...` : line, x, y);
        }
        return y + lineHeight;
    };

    const loadQrImage = async (url: string): Promise<ImageBitmap | HTMLImageElement> => {
        const qrEndpoint = `https://quickchart.io/qr?size=360&margin=3&ecLevel=H&text=${encodeURIComponent(url)}`;
        const response = await fetch(qrEndpoint, { mode: 'cors', cache: 'no-store' });
        if (!response.ok) throw new Error('二维码生成服务暂时不可用');
        const blob = await response.blob();

        if ('createImageBitmap' in window) {
            return await createImageBitmap(blob);
        }

        return await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('二维码图片加载失败'));
            image.src = URL.createObjectURL(blob);
        });
    };

    const handleDownloadShareImage = async () => {
        if (!aiAnswer.trim()) return;

        let finalUrl = shareUrl;
        if (!finalUrl) {
            finalUrl = await handleCreateShareLink();
        }
        if (!finalUrl) {
            setShareError('请先生成分享链接，再生成二维码分享图');
            return;
        }

        let qrImage: ImageBitmap | HTMLImageElement;
        try {
            qrImage = await loadQrImage(finalUrl);
        } catch (error: any) {
            setShareError(error.message || '二维码生成失败，请稍后重试');
            return;
        }

        const homeName = homeMeta.zh || homeMeta.en || match.home_team_id;
        const awayName = awayMeta.zh || awayMeta.en || match.away_team_id;
        const winner =
            adjusted.home >= adjusted.draw && adjusted.home >= adjusted.away
                ? `${homeName}胜面更高`
                : adjusted.away >= adjusted.home && adjusted.away >= adjusted.draw
                    ? `${awayName}胜面更高`
                    : '平局概率不可忽视';
        const rawBasis = aiParsedData?.model_basis?.slice(0, 3) || [];
        const fallbackTakeaways = stripMarkdown(aiAnswer)
            .split(/[。；.!?\n]/)
            .map((item) => item.trim())
            .filter((item) => item.length > 10)
            .slice(0, 3);
        const takeaways = rawBasis.length > 0 ? rawBasis : fallbackTakeaways;

        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1500;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(0, 0, 1200, 1500);
        gradient.addColorStop(0, '#111b3f');
        gradient.addColorStop(0.5, '#20194f');
        gradient.addColorStop(1, '#060914');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1200, 1500);

        ctx.fillStyle = 'rgba(99, 102, 241, 0.18)';
        ctx.beginPath();
        ctx.arc(1020, 120, 260, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.beginPath();
        ctx.arc(80, 1450, 260, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 42px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('FDE FAN World Cup AI', 72, 92);

        ctx.fillStyle = '#a5b4fc';
        ctx.font = '800 26px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('预测结论卡 · 扫码查看完整分析', 72, 136);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 60px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
        drawWrappedText(ctx, `${homeName} vs ${awayName}`, 72, 250, 1050, 70, 2);

        ctx.fillStyle = '#c7d2fe';
        ctx.font = '900 36px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(winner, 72, 350);

        if (aiPrompt) {
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.fillRect(72, 382, 1056, 58);
            ctx.strokeStyle = 'rgba(165,180,252,0.18)';
            ctx.strokeRect(72, 382, 1056, 58);
            ctx.fillStyle = '#a5b4fc';
            ctx.font = '800 24px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
            drawWrappedText(ctx, `提问：${aiPrompt}`.slice(0, 58), 104, 419, 980, 30, 1);
        }

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(72, 470, 1056, 260);
        ctx.strokeStyle = 'rgba(165,180,252,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(72, 470, 1056, 260);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 42px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(`${homeMeta.flag || ''} ${homeName}`, 120, 565);
        ctx.fillStyle = '#64748b';
        ctx.font = '900 32px Arial, sans-serif';
        ctx.fillText('VS', 560, 565);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 42px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText(`${awayName} ${awayMeta.flag || ''}`, 670, 565);

        const barX = 120;
        const barY = 640;
        const barW = 960;
        const barH = 28;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(barX, barY, barW * adjusted.home, barH);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(barX + barW * adjusted.home, barY, barW * adjusted.draw, barH);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(barX + barW * (adjusted.home + adjusted.draw), barY, barW * adjusted.away, barH);

        ctx.font = '800 28px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#6ee7b7';
        ctx.fillText(`主胜 ${(adjusted.home * 100).toFixed(1)}%`, barX, 705);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`平局 ${(adjusted.draw * 100).toFixed(1)}%`, 500, 705);
        ctx.fillStyle = '#fda4af';
        ctx.fillText(`客胜 ${(adjusted.away * 100).toFixed(1)}%`, 835, 705);

        ctx.fillStyle = '#c7d2fe';
        ctx.font = '800 32px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('3 个关键依据', 72, 820);

        const cards = takeaways.length > 0 ? takeaways : ['模型基于排名、Elo 与近期状态形成基准判断', '人工输入的伤停、首发、天气和赔率会影响推演结果', '完整解释和数据依据请扫码查看'];
        cards.slice(0, 3).forEach((item: string, index: number) => {
            const y = 870 + index * 108;
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.fillRect(72, y, 1056, 78);
            ctx.strokeStyle = 'rgba(255,255,255,0.10)';
            ctx.strokeRect(72, y, 1056, 78);
            ctx.fillStyle = '#818cf8';
            ctx.font = '900 28px Arial, sans-serif';
            ctx.fillText(`0${index + 1}`, 108, y + 50);
            ctx.fillStyle = '#f8fafc';
            ctx.font = '700 28px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
            drawWrappedText(ctx, item.replace(/\s+/g, ' ').slice(0, 46), 170, y + 50, 880, 34, 1);
        });

        const qrText = finalUrl;
        const qrX = 830;
        const qrY = 1220;
        const qrBox = 252;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX, qrY, qrBox, qrBox);
        ctx.drawImage(qrImage, qrX, qrY, qrBox, qrBox);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 34px Arial, sans-serif';
        ctx.fillText('扫码查看完整分析', 72, 1248);
        ctx.fillStyle = '#a5b4fc';
        ctx.font = '700 26px Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
        drawWrappedText(ctx, qrText.replace(/^https?:\/\//, ''), 72, 1302, 680, 36, 3);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 30px Arial, sans-serif';
        ctx.fillText('fde.fan', 72, 1430);

        const link = document.createElement('a');
        link.download = `${match.match_id || 'worldcup'}-ai-analysis.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setShareStatus('分享图已生成');
    };

    const handleNativeShare = async () => {
        const url = shareUrl || window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: buildShareTitle(),
                    text: buildShareSummary(url),
                    url
                });
                return;
            } catch (error: any) {
                if (error?.name === 'AbortError') return;
            }
        }
        try {
            await navigator.clipboard.writeText(shareUrl || buildShareSummary());
            setShareStatus(shareUrl ? '分享链接已复制' : '摘要已复制');
        } catch {
            setShareError('当前浏览器不支持系统分享，请先生成链接后手动复制');
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

    const renderInlineMarkdown = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={index} className="rounded bg-slate-950/70 px-1.5 py-0.5 font-mono text-[0.9em] text-indigo-200">{part.slice(1, -1)}</code>;
            }
            return <React.Fragment key={index}>{part}</React.Fragment>;
        });
    };

    const renderMarkdown = (text: string) => {
        return (
            <div className="space-y-2">
                {text.split(/\r?\n/).map((line, index) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={index} className="h-2" />;
                    if (/^#{1,3}\s+/.test(trimmed)) {
                        return <div key={index} className="pt-1 text-base font-bold text-white">{renderInlineMarkdown(trimmed.replace(/^#{1,3}\s+/, ''))}</div>;
                    }
                    if (/^[-*]\s+/.test(trimmed)) {
                        return (
                            <div key={index} className="flex gap-2">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300" />
                                <span>{renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</span>
                            </div>
                        );
                    }
                    if (/^\d+\.\s+/.test(trimmed)) {
                        const marker = trimmed.match(/^\d+\./)?.[0] || '';
                        return (
                            <div key={index} className="flex gap-2">
                                <span className="shrink-0 font-mono text-indigo-300">{marker}</span>
                                <span>{renderInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</span>
                            </div>
                        );
                    }
                    return <p key={index}>{renderInlineMarkdown(trimmed)}</p>;
                })}
            </div>
        );
    };

    const getScenarioLabel = (value: string) => {
        const labels: Record<string, string> = {
            normal_assumption: '常规假设',
            rule_exception: '规则异常',
            data_gap: '数据缺口',
            needs_clarification: '需要补充信息'
        };
        return labels[value] || value.replace(/_/g, ' ');
    };

    const getDataQualityLabel = (value: string) => {
        const labels: Record<string, string> = {
            complete: '数据较完整',
            partial: '数据部分完整',
            weak: '数据较弱'
        };
        return labels[value] || value;
    };
    
    const ProgressBar = ({ pHome, pDraw, pAway }: { pHome: number, pDraw: number, pAway: number }) => (
        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${pHome * 100}%` }}></div>
            <div className="bg-slate-500 transition-all duration-500" style={{ width: `${pDraw * 100}%` }}></div>
            <div className="bg-rose-500 transition-all duration-500" style={{ width: `${pAway * 100}%` }}></div>
        </div>
    );

    const renderMatchHeader = () => (
        <div className="text-center flex justify-center items-center space-x-4 mb-6">
            <span className="text-2xl font-bold">{homeMeta.flag} <span className="zh">{homeMeta.zh}</span><span className="en">{homeMeta.en}</span></span>
            <span className="text-slate-500 font-bold">VS</span>
            <span className="text-2xl font-bold"><span className="zh">{awayMeta.zh}</span><span className="en">{awayMeta.en}</span> {awayMeta.flag}</span>
        </div>
    );

    const renderBaselineCard = () => (
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
    );

    const renderAiPanel = (prominent = false) => (
        <div className={`bg-gradient-to-br from-indigo-900/40 to-fuchsia-900/20 p-5 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.15)] relative overflow-hidden group ${prominent ? 'min-h-[420px]' : ''}`}>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
            
            <h4 className="font-bold text-indigo-300 mb-3 relative z-10 flex items-center gap-2">
                <span className="text-xl">✨</span>
                <span>
                    <span className="zh">{prominent ? 'Ask AI 预测分析师' : '一句话推演 (Ask AI)'}</span>
                    <span className="en">{prominent ? 'Ask AI Match Analyst' : 'Ask AI Simulator'}</span>
                </span>
            </h4>
            {prominent && (
                <p className="relative z-10 text-sm text-indigo-100/70 mb-4 leading-relaxed">
                    <span className="zh">用自然语言提问：伤停、首发、盘口、天气、弃赛或数据不完整时，AI 会解释预测依据并给出可选动作。</span>
                    <span className="en">Ask about injuries, lineups, odds, weather, exceptions, or missing data. The analyst explains the prediction basis and suggests actions.</span>
                </p>
            )}
            <div className="flex gap-2 relative z-10">
                <input 
                    ref={inputRef}
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
                    <span className="font-bold mr-2">错误:</span>
                    {aiError}
                </div>
            )}

            {aiAnswer && (
                <div className="mt-4 pt-4 border-t border-indigo-500/30 relative z-10">
                    <div className="text-xs text-indigo-300 font-bold mb-2 flex items-center gap-1">
                        <span>AI</span>
                        <span className="zh">分析师解读：</span>
                        <span className="en">Analysis:</span>
                    </div>
                    <div className="text-sm text-indigo-100/90 whitespace-pre-wrap leading-relaxed">
                        {renderMarkdown(aiAnswer)}
                    </div>
                    
                    {aiParsedData && (
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-wider">
                            {aiParsedData.scenario_judgement && (
                                <span className={`px-2 py-1 rounded bg-slate-800 border ${aiParsedData.scenario_judgement === 'rule_exception' ? 'border-red-500/50 text-red-400' : 'border-indigo-500/50 text-indigo-400'}`}>
                                    {getScenarioLabel(aiParsedData.scenario_judgement)}
                                </span>
                            )}
                            {aiParsedData.data_quality && (
                                <span className={`px-2 py-1 rounded bg-slate-800 border ${aiParsedData.data_quality === 'weak' ? 'border-amber-500/50 text-amber-400' : 'border-emerald-500/50 text-emerald-400'}`}>
                                    数据质量：{getDataQualityLabel(aiParsedData.data_quality)}
                                </span>
                            )}
                        </div>
                    )}

                    {aiParsedData?.model_basis && aiParsedData.model_basis.length > 0 && (
                        <div className="mt-3">
                            <div className="text-[11px] text-indigo-400 mb-1 font-bold">预测依据：</div>
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
                                            setActiveMode('manual');
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

                    <div className="mt-4 rounded-xl border border-indigo-400/20 bg-slate-950/40 p-3">
                        <div className="mb-2 text-[11px] font-bold text-indigo-300">
                            <span className="zh">分享这次分析：</span>
                            <span className="en">Share this analysis:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={handleCreateShareLink}
                                disabled={shareLoading}
                                className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {shareLoading ? '生成中...' : '生成分享链接'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCopySummary}
                                className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
                            >
                                复制摘要
                            </button>
                            <button
                                type="button"
                                onClick={handleNativeShare}
                                className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/20"
                            >
                                手机系统分享
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadShareImage}
                                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-500/20"
                            >
                                保存分享图
                            </button>
                        </div>
                        {shareUrl && (
                            <a href={shareUrl} target="_blank" rel="noreferrer" className="mt-3 block truncate rounded-md border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200 hover:text-white">
                                {shareUrl}
                            </a>
                        )}
                        {shareStatus && <div className="mt-2 text-xs text-emerald-300">{shareStatus}</div>}
                        {shareError && <div className="mt-2 text-xs text-rose-300">{shareError}</div>}
                    </div>

                    {aiParsedData?.follow_up_questions && aiParsedData.follow_up_questions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-indigo-500/20">
                            <div className="text-[11px] text-slate-400 mb-1.5 font-bold">你还可以问：</div>
                            <div className="flex flex-col gap-1.5">
                                {aiParsedData.follow_up_questions.map((q: string, i: number) => (
                                    <button 
                                        key={i} 
                                        onClick={() => { setAiPrompt(q); handleAskAI(); }}
                                        className="text-left text-xs text-indigo-300 hover:text-white transition-colors flex items-start gap-1.5"
                                    >
                                        <span className="text-indigo-500">-&gt;</span> {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className={`bg-slate-900 border border-slate-700 rounded-2xl w-full ${isAiMode ? 'max-w-2xl' : 'max-w-4xl'} max-h-[90vh] flex flex-col shadow-2xl`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/95 z-10 rounded-t-2xl">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        {isAiMode ? '✨' : '🧪'} <span className="zh">{isAiMode ? 'Ask AI 预测分析师' : '推演实验室'}</span><span className="en">{isAiMode ? 'Ask AI Analyst' : 'Prediction Lab'}</span>
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-xl px-2">&times;</button>
                </div>
                
                {isAiMode ? (
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {renderMatchHeader()}
                        {renderBaselineCard()}
                        {renderAiPanel(true)}
                    </div>
                ) : (
                <div className="p-6 overflow-y-auto flex-1 grid md:grid-cols-2 gap-8">
                    {/* Left: Probabilities & Explanations */}
                    <div className="space-y-8">
                        {renderMatchHeader()}
                        
                        {renderBaselineCard()}
                        
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
                )}
            </div>
        </div>
    );
}
