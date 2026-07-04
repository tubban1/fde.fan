import { useState, useEffect } from 'react';
import SimulationModal from './SimulationModal';
import WorldCupLoader from './WorldCupLoader';

interface Prediction {
    match_id: string;
    home_team_id: string;
    away_team_id: string;
    prob_home_win: number;
    prob_draw: number;
    prob_away_win: number;
    manual_features_applied?: boolean;
    odds?: OddsSnapshot[];
    weather?: WeatherSnapshot | null;
}

interface OddsSnapshot {
    bookmaker_key?: string | null;
    bookmaker_title?: string | null;
    market_key?: string | null;
    market_title?: string | null;
    home_odds?: number | null;
    draw_odds?: number | null;
    away_odds?: number | null;
    last_update?: string | null;
}

interface WeatherSnapshot {
    forecast_time?: string | null;
    temperature_c?: number | null;
    apparent_temperature_c?: number | null;
    humidity_pct?: number | null;
    precipitation_probability_pct?: number | null;
    precipitation_mm?: number | null;
    wind_speed_kmh?: number | null;
    wind_gusts_kmh?: number | null;
    weather_code?: number | null;
}

interface SkippedMatch {
    match_id: string;
    reason: string;
}

interface PredictionData {
    predictions: Prediction[];
    skipped: SkippedMatch[];
    predictions_count: number;
    skipped_count: number;
}

const TEAM_METADATA: Record<string, { zh: string, en: string, flag: string }> = {
    "canada": { zh: "加拿大", en: "Canada", flag: "🇨🇦" },
    "mexico": { zh: "墨西哥", en: "Mexico", flag: "🇲🇽" },
    "usa": { zh: "美国", en: "USA", flag: "🇺🇸" },
    "argentina": { zh: "阿根廷", en: "Argentina", flag: "🇦🇷" },
    "brazil": { zh: "巴西", en: "Brazil", flag: "🇧🇷" },
    "colombia": { zh: "哥伦比亚", en: "Colombia", flag: "🇨🇴" },
    "uruguay": { zh: "乌拉圭", en: "Uruguay", flag: "🇺🇾" },
    "ecuador": { zh: "厄瓜多尔", en: "Ecuador", flag: "🇪🇨" },
    "paraguay": { zh: "巴拉圭", en: "Paraguay", flag: "🇵🇾" },
    "france": { zh: "法国", en: "France", flag: "🇫🇷" },
    "germany": { zh: "德国", en: "Germany", flag: "🇩🇪" },
    "spain": { zh: "西班牙", en: "Spain", flag: "🇪🇸" },
    "england": { zh: "英格兰", en: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    "portugal": { zh: "葡萄牙", en: "Portugal", flag: "🇵🇹" },
    "netherlands": { zh: "荷兰", en: "Netherlands", flag: "🇳🇱" },
    "belgium": { zh: "比利时", en: "Belgium", flag: "🇧🇪" },
    "italy": { zh: "意大利", en: "Italy", flag: "🇮🇹" },
    "croatia": { zh: "克罗地亚", en: "Croatia", flag: "🇭🇷" },
    "switzerland": { zh: "瑞士", en: "Switzerland", flag: "🇨🇭" },
    "denmark": { zh: "丹麦", en: "Denmark", flag: "🇩🇰" },
    "sweden": { zh: "瑞典", en: "Sweden", flag: "🇸🇪" },
    "serbia": { zh: "塞尔维亚", en: "Serbia", flag: "🇷🇸" },
    "poland": { zh: "波兰", en: "Poland", flag: "🇵🇱" },
    "wales": { zh: "威尔士", en: "Wales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
    "scotland": { zh: "苏格兰", en: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
    "czech-republic": { zh: "捷克", en: "Czech Republic", flag: "🇨🇿" },
    "austria": { zh: "奥地利", en: "Austria", flag: "🇦🇹" },
    "norway": { zh: "挪威", en: "Norway", flag: "🇳🇴" },
    "japan": { zh: "日本", en: "Japan", flag: "🇯🇵" },
    "iran": { zh: "伊朗", en: "Iran", flag: "🇮🇷" },
    "south-korea": { zh: "韩国", en: "South Korea", flag: "🇰🇷" },
    "australia": { zh: "澳大利亚", en: "Australia", flag: "🇦🇺" },
    "saudi-arabia": { zh: "沙特阿拉伯", en: "Saudi Arabia", flag: "🇸🇦" },
    "qatar": { zh: "卡塔尔", en: "Qatar", flag: "🇶🇦" },
    "iraq": { zh: "伊拉克", en: "Iraq", flag: "🇮🇶" },
    "uzbekistan": { zh: "乌兹别克斯坦", en: "Uzbekistan", flag: "🇺🇿" },
    "jordan": { zh: "约旦", en: "Jordan", flag: "🇯🇴" },
    "senegal": { zh: "塞内加尔", en: "Senegal", flag: "🇸🇳" },
    "morocco": { zh: "摩洛哥", en: "Morocco", flag: "🇲🇦" },
    "tunisia": { zh: "突尼斯", en: "Tunisia", flag: "🇹🇳" },
    "algeria": { zh: "阿尔及利亚", en: "Algeria", flag: "🇩🇿" },
    "egypt": { zh: "埃及", en: "Egypt", flag: "🇪🇬" },
    "nigeria": { zh: "尼日利亚", en: "Nigeria", flag: "🇳🇬" },
    "cameroon": { zh: "喀麦隆", en: "Cameroon", flag: "🇨🇲" },
    "ghana": { zh: "加纳", en: "Ghana", flag: "🇬🇭" },
    "ivory-coast": { zh: "科特迪瓦", en: "Ivory Coast", flag: "🇨🇮" },
    "dr-congo": { zh: "刚果(金)", en: "DR Congo", flag: "🇨🇩" },
    "mali": { zh: "马里", en: "Mali", flag: "🇲🇱" },
    "south-africa": { zh: "南非", en: "South Africa", flag: "🇿🇦" },
    "cape-verde": { zh: "佛得角", en: "Cape Verde", flag: "🇨🇻" },
    "panama": { zh: "巴拿马", en: "Panama", flag: "🇵🇦" },
    "costa-rica": { zh: "哥斯达黎加", en: "Costa Rica", flag: "🇨🇷" },
    "jamaica": { zh: "牙买加", en: "Jamaica", flag: "🇯🇲" },
    "honduras": { zh: "洪都拉斯", en: "Honduras", flag: "🇭🇳" },
    "el-salvador": { zh: "萨尔瓦多", en: "El Salvador", flag: "🇸🇻" },
    "haiti": { zh: "海地", en: "Haiti", flag: "🇭🇹" },
    "cura-ao": { zh: "库拉索", en: "Curacao", flag: "🇨🇼" },
    "new-zealand": { zh: "新西兰", en: "New Zealand", flag: "🇳🇿" },
    "fiji": { zh: "斐济", en: "Fiji", flag: "🇫🇯" },
    "bosnia-herzegovina": { zh: "波黑", en: "Bosnia & Herz.", flag: "🇧🇦" },
    "turkey": { zh: "土耳其", en: "Turkey", flag: "🇹🇷" },
};

const getTeamMeta = (id: string) => {
    if (!id) return { zh: "未知", en: "Unknown", flag: "🏳️" };
    const meta = TEAM_METADATA[id];
    if (meta) return meta;
    const title = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { zh: title, en: title, flag: "🏳️" };
};

const MARKET_LABELS: Record<string, { zh: string; en: string }> = {
    h2h: { zh: '胜平负', en: '1X2' },
    spreads: { zh: '让球', en: 'Handicap' },
    totals: { zh: '大小球', en: 'Totals' },
    outrights: { zh: '冠军/晋级', en: 'Outrights' },
};

const BOOKMAKER_LABELS: Record<string, string> = {
    pinnacle: 'Pinnacle',
    bet365: 'Bet365',
    williamhill: 'William Hill',
    unibet: 'Unibet',
    betfair: 'Betfair',
    matchbook: 'Matchbook',
    draftkings: 'DraftKings',
    fanduel: 'FanDuel',
    betmgm: 'BetMGM',
    caesars: 'Caesars',
};

const getMarketLabel = (key?: string | null, title?: string | null) => {
    const label = key ? MARKET_LABELS[key] : null;
    if (label) return label;
    return { zh: title || key || '盘口', en: title || key || 'Market' };
};

const getBookmakerLabel = (key?: string | null, title?: string | null) => {
    if (key && BOOKMAKER_LABELS[key]) return BOOKMAKER_LABELS[key];
    return title || key || 'Bookmaker';
};

const getWeatherSummary = (weather?: WeatherSnapshot | null) => {
    if (!weather) return null;
    const parts = [];
    if (typeof weather.temperature_c === 'number') parts.push(`${weather.temperature_c.toFixed(0)}°C`);
    if (typeof weather.precipitation_probability_pct === 'number') parts.push(`降雨 ${weather.precipitation_probability_pct.toFixed(0)}%`);
    if (typeof weather.wind_speed_kmh === 'number') parts.push(`风 ${weather.wind_speed_kmh.toFixed(0)}km/h`);
    return parts.length ? parts.join(' · ') : null;
};

const mockData: PredictionData = {
    predictions: [
        { match_id: "match-86", home_team_id: "argentina", away_team_id: "cape-verde", prob_home_win: 0.92, prob_draw: 0.06, prob_away_win: 0.02, manual_features_applied: true },
        { match_id: "match-89", home_team_id: "paraguay", away_team_id: "france", prob_home_win: 0.05, prob_draw: 0.13, prob_away_win: 0.82, manual_features_applied: false },
        { match_id: "match-91", home_team_id: "brazil", away_team_id: "norway", prob_home_win: 0.62, prob_draw: 0.23, prob_away_win: 0.15, manual_features_applied: true },
        { match_id: "match-80", home_team_id: "england", away_team_id: "dr-congo", prob_home_win: 0.79, prob_draw: 0.15, prob_away_win: 0.06, manual_features_applied: false },
        { match_id: "match-81", home_team_id: "usa", away_team_id: "bosnia-herzegovina", prob_home_win: 0.73, prob_draw: 0.18, prob_away_win: 0.09, manual_features_applied: false },
        { match_id: "match-82", home_team_id: "belgium", away_team_id: "senegal", prob_home_win: 0.50, prob_draw: 0.27, prob_away_win: 0.23, manual_features_applied: false },
        { match_id: "match-83", home_team_id: "portugal", away_team_id: "croatia", prob_home_win: 0.41, prob_draw: 0.28, prob_away_win: 0.31, manual_features_applied: false },
        { match_id: "match-84", home_team_id: "spain", away_team_id: "austria", prob_home_win: 0.68, prob_draw: 0.21, prob_away_win: 0.11, manual_features_applied: false },
        { match_id: "match-85", home_team_id: "switzerland", away_team_id: "algeria", prob_home_win: 0.42, prob_draw: 0.28, prob_away_win: 0.30, manual_features_applied: false },
        { match_id: "match-87", home_team_id: "colombia", away_team_id: "ghana", prob_home_win: 0.80, prob_draw: 0.14, prob_away_win: 0.06, manual_features_applied: false },
        { match_id: "match-88", home_team_id: "australia", away_team_id: "egypt", prob_home_win: 0.33, prob_draw: 0.28, prob_away_win: 0.39, manual_features_applied: false },
        { match_id: "match-90", home_team_id: "canada", away_team_id: "morocco", prob_home_win: 0.19, prob_draw: 0.25, prob_away_win: 0.56, manual_features_applied: false },
    ],
    skipped: [
        { match_id: "match-92", reason: "missing_team_placeholder" },
        { match_id: "match-93", reason: "missing_team_placeholder" }
    ],
    predictions_count: 12,
    skipped_count: 13
};

const ProgressBar = ({ pHome, pDraw, pAway }: { pHome: number, pDraw: number, pAway: number }) => {
    return (
        <div className="w-full h-3 bg-gray-800/50 rounded-full overflow-hidden flex shadow-inner">
            <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out relative group" 
                style={{ width: `${pHome * 100}%` }}
            >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div 
                className="h-full bg-gradient-to-r from-slate-500 to-slate-400 transition-all duration-1000 ease-out relative group" 
                style={{ width: `${pDraw * 100}%` }}
            >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div 
                className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-1000 ease-out relative group" 
                style={{ width: `${pAway * 100}%` }}
            >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
        </div>
    );
};

export default function SchedulePrediction() {
    const [data, setData] = useState<PredictionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMock, setIsMock] = useState(false);
    const [simulateMatch, setSimulateMatch] = useState<any>(null);
    const [simulationMode, setSimulationMode] = useState<'ai' | 'manual'>('manual');

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                // Fetch from environment variable URL or default to localhost
                const apiUrl = import.meta.env.PUBLIC_PREDICT_API_URL || 'http://127.0.0.1:8000';
                const res = await fetch(`${apiUrl}/api/predict`, { signal: AbortSignal.timeout(15000) });
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.warn('API fetch failed, falling back to mock data. Error:', err);
                // Fallback to mock data to ensure UI preview is active
                setData(mockData);
                setIsMock(true);
            } finally {
                setLoading(false);
            }
        };

        fetchPredictions();
    }, []);

    if (loading) {
        return <WorldCupLoader />;
    }

    if (!data) return (
        <div className="text-center py-20 text-slate-400">
            <span className="zh">无法加载数据。</span>
            <span className="en">Failed to load data.</span>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto p-4 md:p-8 font-sans text-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-baseline mb-8">
                <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 mb-4 font-display">
                    <span className="zh">2026 世界杯赛事预测</span>
                    <span className="en">2026 World Cup Predictions</span>
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    <span className="zh">基于 AI 与 Bradley-Terry 模型驱动，融合动态 Elo 积分与最新战况。</span>
                    <span className="en">Powered by AI & Bradley-Terry model, integrating dynamic Elo & recent form.</span>
                </p>
            </div>
                
                <div className="flex space-x-6">
                    <div className="text-center">
                        <div className="text-3xl font-black text-white">{data.predictions.length}</div>
                        <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">
                            <span className="zh">活跃</span>
                            <span className="en">Active</span>
                        </div>
                    </div>
                    <div className="w-px bg-slate-700/50"></div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-slate-400">{data.skipped.length}</div>
                        <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">
                            <span className="zh">待定</span>
                            <span className="en">Pending</span>
                        </div>
                    </div>
                </div>
            </div>

            {isMock && (
                <div className="mb-8 p-4 bg-rose-900/20 border border-rose-500/30 rounded-xl flex items-start space-x-3 max-w-3xl mx-auto">
                    <div className="w-5 h-5 text-rose-400 shrink-0 mt-0.5">⚠️</div>
                    <div>
                        <h4 className="text-rose-300 font-bold text-sm">
                            <span className="zh">API 连接失败</span>
                            <span className="en">API Connection Failed</span>
                        </h4>
                        <p className="text-rose-400/80 text-sm mt-1">
                            <span className="zh">无法访问预测接口。正在展示静态预览数据。请检查网络。</span>
                            <span className="en">Unable to reach the prediction endpoint. Showing static preview data. Please check connection.</span>
                        </p>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {data.predictions.map((match: Prediction) => {
                    const isHomeFav = match.prob_home_win > match.prob_away_win && match.prob_home_win > match.prob_draw;
                    const isAwayFav = match.prob_away_win > match.prob_home_win && match.prob_away_win > match.prob_draw;
                    
                    return (
                        <div key={match.match_id} className="group relative bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 md:p-6 hover:bg-slate-800/60 hover:border-slate-600 transition-all duration-300 shadow-xl overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                <span className="font-mono text-4xl font-black">{match.match_id.replace('match-', '#')}</span>
                            </div>
                            
                            {match.manual_features_applied && (
                                <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-b border-r border-amber-500/20 text-amber-400 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-br-lg flex items-center z-20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2 animate-pulse"></span>
                                    <span className="zh">专家干预</span>
                                    <span className="en">Expert Enhanced</span>
                                </div>
                            )}
                            
                            <div className={`flex justify-between items-center mb-4 relative z-10 ${match.manual_features_applied ? 'mt-6' : ''}`}>
                                <div className={`text-xl md:text-2xl font-bold tracking-wide flex-1 flex justify-end items-center ${isHomeFav ? 'text-white' : 'text-slate-400'}`}>
                                    <span className="uppercase">
                                        <span className="zh">{getTeamMeta(match.home_team_id).zh}</span>
                                        <span className="en">{getTeamMeta(match.home_team_id).en}</span>
                                    </span>
                                    <span className="text-2xl md:text-3xl ml-3" style={{ lineHeight: 1 }}>{getTeamMeta(match.home_team_id).flag}</span>
                                </div>
                                <div className="px-4 text-sm font-black text-slate-600">VS</div>
                                <div className={`text-xl md:text-2xl font-bold tracking-wide flex-1 flex justify-start items-center ${!isHomeFav ? 'text-white' : 'text-slate-400'}`}>
                                    <span className="text-2xl md:text-3xl mr-3" style={{ lineHeight: 1 }}>{getTeamMeta(match.away_team_id).flag}</span>
                                    <span className="uppercase">
                                        <span className="zh">{getTeamMeta(match.away_team_id).zh}</span>
                                        <span className="en">{getTeamMeta(match.away_team_id).en}</span>
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mb-2 relative z-10">
                                <ProgressBar 
                                    pHome={match.prob_home_win} 
                                    pDraw={match.prob_draw} 
                                    pAway={match.prob_away_win} 
                                />
                            </div>
                            
                            <div className="flex justify-between text-xs font-bold mt-2">
                                <div className="text-blue-400/80 w-1/3 text-left">
                                    <span className="zh">主胜</span><span className="en">Home</span> {(match.prob_home_win * 100).toFixed(1)}%
                                </div>
                                <div className="text-slate-500 w-1/3 text-center">
                                    <span className="zh">平局</span><span className="en">Draw</span> {(match.prob_draw * 100).toFixed(1)}%
                                </div>
                                <div className="text-indigo-400/80 w-1/3 text-right">
                                    <span className="zh">客胜</span><span className="en">Away</span> {(match.prob_away_win * 100).toFixed(1)}%
                                </div>
                            </div>

                            {(match.weather || (match.odds && match.odds.length > 0)) && (
                                <div className="relative z-10 mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-300">
                                    {match.weather && getWeatherSummary(match.weather) && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-sky-200">
                                            <span>☁️</span>
                                            <span className="zh">{getWeatherSummary(match.weather)}</span>
                                            <span className="en">{getWeatherSummary(match.weather)}</span>
                                        </span>
                                    )}
                                    {match.odds && match.odds.length > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                                            <span>📈</span>
                                            <span className="zh">
                                                {getMarketLabel(match.odds[0].market_key, match.odds[0].market_title).zh}
                                                {' · '}
                                                {match.odds.length} 家赔率
                                            </span>
                                            <span className="en">
                                                {getMarketLabel(match.odds[0].market_key, match.odds[0].market_title).en}
                                                {' · '}
                                                {match.odds.length} books
                                            </span>
                                        </span>
                                    )}
                                    {match.odds?.slice(0, 2).map((odds) => (
                                        <span key={`${match.match_id}-${odds.bookmaker_key}`} className="hidden rounded-full border border-slate-600/50 bg-slate-800/70 px-2.5 py-1 text-slate-400 md:inline-flex">
                                            {getBookmakerLabel(odds.bookmaker_key, odds.bookmaker_title)}
                                            {typeof odds.home_odds === 'number' && typeof odds.draw_odds === 'number' && typeof odds.away_odds === 'number'
                                                ? ` ${odds.home_odds.toFixed(2)}/${odds.draw_odds.toFixed(2)}/${odds.away_odds.toFixed(2)}`
                                                : ''}
                                        </span>
                                    ))}
                                </div>
                            )}
                            
                            <div className="relative z-30 mt-4 grid grid-cols-2 gap-2 md:absolute md:top-2 md:right-2 md:mt-0 md:flex md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
                            <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSimulateMatch(match); setSimulationMode('ai'); }}
                                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-indigo-400/30 bg-indigo-600/90 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 backdrop-blur-md transition-colors hover:bg-indigo-500 md:min-h-9 md:px-4"
                            >
                                <span>✨</span>
                                <span>Ask AI</span>
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSimulateMatch(match); setSimulationMode('manual'); }}
                                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md bg-slate-700/80 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-slate-600 md:min-h-9 md:px-4"
                            >
                                🧪 <span className="zh">推演实验室</span><span className="en">Simulate</span>
                            </button>
                        </div>
                        </div>
                    );
                })}

                {data.skipped_count > 0 && (
                    <div className="mt-8 flex items-center justify-center p-6 border border-dashed border-slate-700/50 rounded-2xl bg-slate-900/20">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-400 mb-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h3 className="text-slate-300 font-medium mb-1">
                                <span className="zh">等待晋级球队</span>
                                <span className="en">Awaiting Qualification</span>
                            </h3>
                            <p className="text-slate-500 text-sm">
                                <span className="zh">有 {data.skipped_count} 场淘汰赛正在等待对手落位。</span>
                                <span className="en">{data.skipped_count} knockout matches awaiting opponents.</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
            
            <SimulationModal 
                isOpen={!!simulateMatch} 
                onClose={() => setSimulateMatch(null)} 
                match={simulateMatch} 
                homeMeta={simulateMatch ? getTeamMeta(simulateMatch.home_team_id) : {}} 
                awayMeta={simulateMatch ? getTeamMeta(simulateMatch.away_team_id) : {}} 
                mode={simulationMode}
            />
        </div>
    );
}
