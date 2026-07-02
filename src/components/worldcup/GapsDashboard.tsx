import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, Edit2, Link as LinkIcon, FileText } from 'lucide-react';

interface Gap {
    gap_id: string;
    team_id: string;
    field_name: string;
    status: string;
    reason: string;
}

interface MatchFeatures {
    odds_1x2_home: string | number | null;
    odds_1x2_draw: string | number | null;
    odds_1x2_away: string | number | null;
    odds_provider?: string | null;
    odds_market?: string | null;
    odds_captured_at?: string | null;
    injury_impact_home: string | number | null;
    injury_impact_away: string | number | null;
    lineup_strength_home: string | number | null;
    lineup_strength_away: string | number | null;
    source_url: string;
    notes: string;
}

interface MatchGaps {
    match_id: string;
    home_team_id: string;
    away_team_id: string;
    stage: string;
    gaps: Gap[];
    features: MatchFeatures;
}

export default function GapsDashboard() {
    const [matches, setMatches] = useState<MatchGaps[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('open');
    
    // Edit state
    const [editingMatch, setEditingMatch] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchGaps();
    }, []);

    const fetchGaps = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/worldcup/gaps');
            const data = await res.json();
            setMatches(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (match: MatchGaps) => {
        setEditingMatch(match.match_id);
        setEditForm({ ...match.features });
    };

    const handleSave = async (match_id: string) => {
        setSaving(true);
        try {
            const res = await fetch('/api/worldcup/manual-features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ match_id, features: editForm })
            });
            
            if (res.ok) {
                // Refresh data
                await fetchGaps();
                setEditingMatch(null);
            } else {
                const errData = await res.json();
                alert(`Failed to save features: ${errData.error || 'Unknown error'}`);
            }
        } catch (err: any) {
            console.error(err);
            alert(`Error saving: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Derived counts
    const totalGaps = matches.reduce((acc, m) => acc + m.gaps.length, 0);
    const openGaps = matches.reduce((acc, m) => acc + m.gaps.filter(g => g.status === 'open').length, 0);
    
    const filteredMatches = matches.filter(m => {
        if (filterStatus === 'all') return true;
        const hasOpen = m.gaps.some(g => g.status === 'open');
        return filterStatus === 'open' ? hasOpen : !hasOpen;
    });

    if (loading) {
        return <div className="p-8 text-slate-400 animate-pulse">加载缺口数据中...</div>;
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 text-slate-200">
            <div className="flex justify-between items-end mb-8 border-b border-slate-700 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">数据缺口控制台</h1>
                    <p className="text-slate-400 text-sm">管理并录入缺失的比赛特征，以大幅提升模型预测精度。</p>
                </div>
                <div className="flex space-x-6 text-sm">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-rose-400">{openGaps}</div>
                        <div className="text-slate-500 font-medium">待处理项</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400">{totalGaps - openGaps}</div>
                        <div className="text-slate-500 font-medium">已解决</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-slate-300">{matches.length}</div>
                        <div className="text-slate-500 font-medium">受影响场次</div>
                    </div>
                </div>
            </div>

            <div className="flex space-x-2 mb-6">
                <button 
                    onClick={() => setFilterStatus('open')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterStatus === 'open' ? 'bg-rose-900/50 text-rose-300 border border-rose-700/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    待处理
                </button>
                <button 
                    onClick={() => setFilterStatus('resolved')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterStatus === 'resolved' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    已解决
                </button>
                <button 
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filterStatus === 'all' ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    所有场次
                </button>
            </div>

            <div className="space-y-6">
                {filteredMatches.length === 0 && (
                    <div className="text-center py-12 text-slate-500 border border-slate-800 rounded-xl bg-slate-900/30">
                        当前筛选条件下没有匹配的场次。
                    </div>
                )}

                {filteredMatches.map(match => {
                    const isEditing = editingMatch === match.match_id;
                    const hasOpen = match.gaps.some(g => g.status === 'open');

                    return (
                        <div key={match.match_id} className={`border rounded-xl bg-slate-900/50 overflow-hidden transition-all ${hasOpen ? 'border-rose-900/50 shadow-[0_0_15px_rgba(225,29,72,0.05)]' : 'border-slate-700/50'}`}>
                            {/* Header */}
                            <div className="flex justify-between items-center px-6 py-4 bg-slate-800/30 border-b border-slate-700/50">
                                <div className="flex items-center space-x-4">
                                    {hasOpen ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                    <div>
                                        <div className="text-lg font-bold text-white uppercase tracking-wide">
                                            {match.home_team_id} <span className="text-slate-500 mx-2 text-sm">VS</span> {match.away_team_id}
                                        </div>
                                        <div className="text-xs text-slate-400 uppercase tracking-widest mt-0.5 flex space-x-2">
                                            <span>{match.match_id}</span>
                                            <span>&bull;</span>
                                            <span>{match.stage}</span>
                                            <span>&bull;</span>
                                            <span className="text-rose-400">{match.gaps.length} 项缺口</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    {!isEditing ? (
                                        <button 
                                            onClick={() => handleEdit(match)}
                                            className="flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4 mr-2" /> 编辑特征
                                        </button>
                                    ) : (
                                        <div className="flex space-x-2">
                                            <button 
                                                onClick={() => setEditingMatch(null)}
                                                className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-sm"
                                            >
                                                取消
                                            </button>
                                            <button 
                                                onClick={() => handleSave(match.match_id)}
                                                disabled={saving}
                                                className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded shadow-lg transition-colors"
                                            >
                                                <Save className="w-4 h-4 mr-2" /> {saving ? '保存中...' : '保存并标记解决'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Gaps List */}
                            <div className="px-6 py-3 bg-slate-900/80 text-sm flex flex-wrap gap-2 border-b border-slate-800">
                                <span className="text-slate-500 font-medium py-1">缺失标记：</span>
                                {match.gaps.map(g => (
                                    <span key={g.gap_id} className={`px-2 py-1 rounded text-xs ${g.status === 'open' ? 'bg-rose-900/30 text-rose-300 border border-rose-800' : 'bg-emerald-900/30 text-emerald-300 border border-emerald-800'}`}>
                                        {g.team_id && `${g.team_id.substring(0,3).toUpperCase()}:`} {g.field_name}
                                    </span>
                                ))}
                            </div>

                            {/* Features Editor */}
                            <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Odds */}
                                <div className="space-y-4 lg:col-span-3">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center mb-3">
                                        <span className="w-1.5 h-4 bg-amber-500 rounded-sm mr-2"></span> 赔率信息 (Odds)
                                    </h4>
                                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">主胜 (1)</label>
                                                <input 
                                                    type="number" step="0.01" 
                                                    disabled={!isEditing}
                                                    value={isEditing ? (editForm.odds_1x2_home || '') : (match.features.odds_1x2_home || '-')}
                                                    onChange={e => setEditForm({...editForm, odds_1x2_home: e.target.value})}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">平局 (X)</label>
                                                <input 
                                                    type="number" step="0.01" 
                                                    disabled={!isEditing}
                                                    value={isEditing ? (editForm.odds_1x2_draw || '') : (match.features.odds_1x2_draw || '-')}
                                                    onChange={e => setEditForm({...editForm, odds_1x2_draw: e.target.value})}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">客胜 (2)</label>
                                                <input 
                                                    type="number" step="0.01" 
                                                    disabled={!isEditing}
                                                    value={isEditing ? (editForm.odds_1x2_away || '') : (match.features.odds_1x2_away || '-')}
                                                    onChange={e => setEditForm({...editForm, odds_1x2_away: e.target.value})}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-700/50 pt-4">
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">数据来源平台</label>
                                                <select
                                                    disabled={!isEditing}
                                                    value={isEditing ? (editForm.odds_provider || '') : (match.features.odds_provider || '')}
                                                    onChange={e => setEditForm({...editForm, odds_provider: e.target.value})}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                                                >
                                                    <option value="">请选择平台...</option>
                                                    <option value="Pinnacle">Pinnacle (平博)</option>
                                                    <option value="Bet365">Bet365</option>
                                                    <option value="Market Average">Market Average (百家平均)</option>
                                                    <option value="Betfair Exchange">Betfair Exchange (必发)</option>
                                                    <option value="Other">Other (其他)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">盘口类型</label>
                                                <select
                                                    disabled={!isEditing}
                                                    value={isEditing ? (editForm.odds_market || '') : (match.features.odds_market || '')}
                                                    onChange={e => setEditForm({...editForm, odds_market: e.target.value})}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                                                >
                                                    <option value="">请选择盘口...</option>
                                                    <option value="1x2_full_time">1X2 全场 (90分钟)</option>
                                                    <option value="1x2_first_half">1X2 半场</option>
                                                    <option value="to_qualify">晋级概率 (To Qualify)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">采集时间快照</label>
                                                <input 
                                                    type="datetime-local" 
                                                    disabled={!isEditing}
                                                    value={isEditing ? (editForm.odds_captured_at || '') : (match.features.odds_captured_at || '')}
                                                    onChange={e => setEditForm({...editForm, odds_captured_at: e.target.value})}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Injuries & Suspensions */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        <span className="w-1.5 h-4 bg-rose-500 rounded-sm mr-2"></span> 伤停影响 (-0.1 至 0)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1 uppercase truncate">{match.home_team_id}</label>
                                            <input 
                                                type="number" step="0.01" max="0"
                                                disabled={!isEditing}
                                                value={isEditing ? (editForm.injury_impact_home || '') : (match.features.injury_impact_home || '-')}
                                                onChange={e => setEditForm({...editForm, injury_impact_home: e.target.value})}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="例: -0.05"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1 uppercase truncate">{match.away_team_id}</label>
                                            <input 
                                                type="number" step="0.01" max="0"
                                                disabled={!isEditing}
                                                value={isEditing ? (editForm.injury_impact_away || '') : (match.features.injury_impact_away || '-')}
                                                onChange={e => setEditForm({...editForm, injury_impact_away: e.target.value})}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="例: -0.02"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Lineups */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        <span className="w-1.5 h-4 bg-emerald-500 rounded-sm mr-2"></span> 首发强度 (0.8 至 1.2)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1 uppercase truncate">{match.home_team_id}</label>
                                            <input 
                                                type="number" step="0.01"
                                                disabled={!isEditing}
                                                value={isEditing ? (editForm.lineup_strength_home || '') : (match.features.lineup_strength_home || '-')}
                                                onChange={e => setEditForm({...editForm, lineup_strength_home: e.target.value})}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="例: 1.05"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1 uppercase truncate">{match.away_team_id}</label>
                                            <input 
                                                type="number" step="0.01"
                                                disabled={!isEditing}
                                                value={isEditing ? (editForm.lineup_strength_away || '') : (match.features.lineup_strength_away || '-')}
                                                onChange={e => setEditForm({...editForm, lineup_strength_away: e.target.value})}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 disabled:opacity-50 disabled:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="例: 0.95"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Meta */}
                            <div className="px-6 py-4 bg-slate-800/20 border-t border-slate-700/50 flex space-x-4">
                                <div className="flex-1 flex items-center space-x-2">
                                    <LinkIcon className="w-4 h-4 text-slate-500" />
                                    <input 
                                        type="text" 
                                        disabled={!isEditing}
                                        value={isEditing ? (editForm.source_url || '') : (match.features.source_url || '')}
                                        onChange={e => setEditForm({...editForm, source_url: e.target.value})}
                                        className="w-full bg-transparent border-none text-sm text-blue-400 placeholder-slate-600 focus:ring-0 px-0 disabled:opacity-60"
                                        placeholder="参考数据源链接 (如 transfermarkt, oddsportal)"
                                    />
                                </div>
                                <div className="flex-1 flex items-center space-x-2">
                                    <FileText className="w-4 h-4 text-slate-500" />
                                    <input 
                                        type="text" 
                                        disabled={!isEditing}
                                        value={isEditing ? (editForm.notes || '') : (match.features.notes || '')}
                                        onChange={e => setEditForm({...editForm, notes: e.target.value})}
                                        className="w-full bg-transparent border-none text-sm text-slate-300 placeholder-slate-600 focus:ring-0 px-0 disabled:opacity-60"
                                        placeholder="内部备注/人工修正说明"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
