import { useState, useEffect } from 'react';
import WorldCupLoader from './WorldCupLoader';
import SimulationModal from './SimulationModal';

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

interface ScoreProbability {
    score: string;
    probability: number;
    label_zh?: string;
}

interface ScoreAnalysis {
    match_id?: string;
    status: string;
    model?: string;
    predicted_score?: string;
    score_probabilities?: ScoreProbability[];
    summary_zh?: string;
    reasoning_md?: string;
    basis?: { main_factors?: string[]; data_quality?: string };
    updated_at?: string;
}

type ScoreAnalysisState = Record<string, {
    loading?: boolean;
    error?: string;
    unavailable?: string;
    source?: string;
    analysis?: ScoreAnalysis;
}>;

interface ShareState {
    loading?: boolean;
    imageLoading?: boolean;
    url?: string;
    error?: string;
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

const isDataCompleteForScoreAnalysis = (match: Prediction) => {
    const hasWeather = Boolean(match.weather);
    const hasCompleteOdds = Boolean(match.odds?.some((odds) =>
        typeof odds.home_odds === 'number' &&
        typeof odds.draw_odds === 'number' &&
        typeof odds.away_odds === 'number'
    ));
    return hasWeather && hasCompleteOdds;
};

const renderReasoningMarkdown = (text?: string) => {
    if (!text) return null;
    return text.split(/\n+/).map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('###')) {
            return <h4 key={index} className="mt-4 text-sm font-black text-white">{trimmed.replace(/^#+\s*/, '')}</h4>;
        }
        if (trimmed.startsWith('##')) {
            return <h3 key={index} className="mt-5 text-base font-black text-white">{trimmed.replace(/^#+\s*/, '')}</h3>;
        }
        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
            return <li key={index} className="ml-5 list-disc text-sm leading-6 text-slate-300">{trimmed.replace(/^[-•]\s*/, '')}</li>;
        }
        return <p key={index} className="text-sm leading-6 text-slate-300">{trimmed.replace(/\*\*/g, '')}</p>;
    });
};

const stripMarkdown = (text?: string) => {
    if (!text) return '';
    return text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*•]\s+/gm, '')
        .replace(/\*\*/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
};

const loadCanvasImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('image load failed'));
        image.src = src;
    });

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
    const [scoreAnalyses, setScoreAnalyses] = useState<ScoreAnalysisState>({});
    const [reasoningMatch, setReasoningMatch] = useState<Prediction | null>(null);
    const [shareStates, setShareStates] = useState<Record<string, ShareState>>({});
    const [simulationMatch, setSimulationMatch] = useState<Prediction | null>(null);
    const [simulationMode, setSimulationMode] = useState<'ai' | 'manual'>('ai');

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

    useEffect(() => {
        if (!data || isMock) return;
        for (const match of data.predictions) {
            if (!isDataCompleteForScoreAnalysis(match)) continue;
            if (scoreAnalyses[match.match_id]) continue;

            setScoreAnalyses(prev => ({
                ...prev,
                [match.match_id]: { loading: true }
            }));

            fetch('/api/worldcup/score-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    match_id: match.match_id,
                    baseline: {
                        home_win: match.prob_home_win,
                        draw: match.prob_draw,
                        away_win: match.prob_away_win,
                    }
                })
            })
                .then(async (res) => {
                    const json = await res.json().catch(() => ({}));
                    if (res.status === 409) {
                        setScoreAnalyses(prev => ({
                            ...prev,
                            [match.match_id]: { loading: false, unavailable: json.reason || 'data_incomplete' }
                        }));
                        return;
                    }
                    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
                    setScoreAnalyses(prev => ({
                        ...prev,
                        [match.match_id]: { loading: false, source: json.source, analysis: json.analysis }
                    }));
                })
                .catch((err) => {
                    setScoreAnalyses(prev => ({
                        ...prev,
                        [match.match_id]: { loading: false, error: err.message || 'score analysis failed' }
                    }));
                });
        }
    }, [data, isMock, scoreAnalyses]);

    const saveScoreShare = async (match: Prediction, analysis: ScoreAnalysis) => {
        const existing = shareStates[match.match_id]?.url;
        if (existing) return existing;

        setShareStates(prev => ({
            ...prev,
            [match.match_id]: { ...prev[match.match_id], loading: true, error: undefined }
        }));

        try {
            const home = getTeamMeta(match.home_team_id);
            const away = getTeamMeta(match.away_team_id);
            const response = await fetch('/api/worldcup/share-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    match_id: match.match_id,
                    title: `${home.zh} vs ${away.zh} 比分预测`,
                    home_team: home,
                    away_team: away,
                    question: '比分预测与推理依据',
                    answer: analysis.reasoning_md || analysis.summary_zh || `${analysis.predicted_score || ''}`,
                    parsed_data: {
                        analysis,
                        predicted_score: analysis.predicted_score,
                        score_probabilities: analysis.score_probabilities || [],
                        summary_zh: analysis.summary_zh,
                        reasoning_md: analysis.reasoning_md,
                        basis: analysis.basis || {},
                        weather: match.weather || null,
                        odds: match.odds || [],
                        match,
                    },
                    features: {
                        weather: match.weather || null,
                        odds: match.odds || [],
                    },
                    baseline: {
                        home: match.prob_home_win,
                        draw: match.prob_draw,
                        away: match.prob_away_win,
                    },
                    adjusted: {
                        home: match.prob_home_win,
                        draw: match.prob_draw,
                        away: match.prob_away_win,
                    },
                    delta: {},
                }),
            });

            const json = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(json.error || '生成分享链接失败');
            const url = new URL(json.url, window.location.origin).toString();
            setShareStates(prev => ({
                ...prev,
                [match.match_id]: { ...prev[match.match_id], loading: false, url }
            }));
            return url;
        } catch (error: any) {
            setShareStates(prev => ({
                ...prev,
                [match.match_id]: { ...prev[match.match_id], loading: false, error: error.message || '生成分享链接失败' }
            }));
            throw error;
        }
    };

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
            const test = line + char;
            if (ctx.measureText(test).width > maxWidth && line) {
                ctx.fillText(line, x, y);
                y += lineHeight;
                lines += 1;
                line = char;
                if (lines >= maxLines - 1) break;
            } else {
                line = test;
            }
        }
        if (line && lines < maxLines) {
            const suffix = chars.join('').length > line.length && lines >= maxLines - 1 ? '…' : '';
            ctx.fillText(line + suffix, x, y);
        }
        return y + lineHeight;
    };

    const downloadScoreShareImage = async (match: Prediction, analysis: ScoreAnalysis) => {
        setShareStates(prev => ({
            ...prev,
            [match.match_id]: { ...prev[match.match_id], imageLoading: true, error: undefined }
        }));

        try {
            const shareUrl = await saveScoreShare(match, analysis);
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 1500;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('无法创建图片画布');

            const home = getTeamMeta(match.home_team_id);
            const away = getTeamMeta(match.away_team_id);
            const factors = analysis.basis?.main_factors?.slice(0, 3) || [];
            const topScores = analysis.score_probabilities?.slice(0, 3) || [];
            const weatherText = getWeatherSummary(match.weather) || '暂无天气快照';
            const firstOdds = match.odds?.[0];
            const oddsText = firstOdds
                ? `${getBookmakerLabel(firstOdds.bookmaker_key, firstOdds.bookmaker_title)} · ${getMarketLabel(firstOdds.market_key, firstOdds.market_title).zh} ${firstOdds.home_odds?.toFixed(2)}/${firstOdds.draw_odds?.toFixed(2)}/${firstOdds.away_odds?.toFixed(2)}`
                : '暂无赔率快照';
            const reasoning = stripMarkdown(analysis.reasoning_md || analysis.summary_zh).slice(0, 310);

            ctx.fillStyle = '#0B0F19';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const gradient = ctx.createRadialGradient(1040, 120, 80, 1040, 120, 420);
            gradient.addColorStop(0, '#4338ca66');
            gradient.addColorStop(1, '#0B0F1900');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const bottomGlow = ctx.createRadialGradient(90, 1410, 40, 90, 1410, 320);
            bottomGlow.addColorStop(0, '#0ea5e944');
            bottomGlow.addColorStop(1, '#0B0F1900');
            ctx.fillStyle = bottomGlow;
            ctx.fillRect(0, 1050, 520, 450);

            ctx.fillStyle = '#ffffff';
            ctx.font = '800 44px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText('FDE FAN World Cup AI', 72, 92);
            ctx.fillStyle = '#a5b4fc';
            ctx.font = '800 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText('比分预测卡 · 扫码查看完整依据', 72, 132);

            ctx.fillStyle = '#ffffff';
            ctx.font = '900 58px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText(`${home.zh} vs ${away.zh}`, 72, 238);
            ctx.fillStyle = '#c7d2fe';
            ctx.font = '800 34px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText(`推荐比分 ${analysis.predicted_score || '-'}`, 72, 308);

            ctx.strokeStyle = '#818cf855';
            ctx.lineWidth = 2;
            ctx.strokeRect(72, 370, 1056, 270);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 40px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText(`${home.flag} ${home.zh}`, 120, 455);
            ctx.fillStyle = '#64748b';
            ctx.font = '900 32px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText('VS', 570, 455);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 40px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText(`${away.zh} ${away.flag}`, 690, 455);

            const barX = 120;
            const barY = 535;
            const barW = 960;
            const barH = 28;
            ctx.fillStyle = '#10b981';
            ctx.fillRect(barX, barY, barW * match.prob_home_win, barH);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(barX + barW * match.prob_home_win, barY, barW * match.prob_draw, barH);
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(barX + barW * (match.prob_home_win + match.prob_draw), barY, barW * match.prob_away_win, barH);
            ctx.font = '800 25px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = '#6ee7b7';
            ctx.fillText(`主胜 ${(match.prob_home_win * 100).toFixed(1)}%`, 120, 610);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(`平局 ${(match.prob_draw * 100).toFixed(1)}%`, 495, 610);
            ctx.fillStyle = '#fda4af';
            ctx.fillText(`客胜 ${(match.prob_away_win * 100).toFixed(1)}%`, 835, 610);

            ctx.fillStyle = '#c7d2fe';
            ctx.font = '900 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText('最可能比分', 72, 720);
            topScores.forEach((item, index) => {
                const y = 775 + index * 70;
                ctx.fillStyle = '#312e8166';
                ctx.fillRect(72, y - 38, 500, 52);
                ctx.fillStyle = '#93c5fd';
                ctx.font = '900 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillText(`0${index + 1}`, 104, y);
                ctx.fillStyle = '#ffffff';
                ctx.font = '900 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillText(`${item.score} · ${(item.probability * 100).toFixed(1)}%`, 170, y);
                ctx.fillStyle = '#cbd5e1';
                ctx.font = '700 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillText(item.label_zh || '', 360, y);
            });

            ctx.fillStyle = '#c7d2fe';
            ctx.font = '900 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText('主要依据', 72, 980);
            factors.forEach((factor, index) => {
                ctx.fillStyle = '#818cf8';
                ctx.font = '900 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillText(`0${index + 1}`, 108, 1046 + index * 58);
                ctx.fillStyle = '#ffffff';
                ctx.font = '800 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillText(factor, 170, 1046 + index * 58);
            });

            ctx.fillStyle = '#dbeafe';
            ctx.font = '700 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            drawWrappedText(ctx, reasoning, 72, 1220, 680, 34, 4);
            ctx.fillStyle = '#a5b4fc';
            ctx.font = '800 21px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText(`天气：${weatherText}`, 72, 1380);
            ctx.fillText(`盘口：${oddsText}`, 72, 1420);

            try {
                const qr = await loadCanvasImage(`https://quickchart.io/qr?size=360&margin=3&ecLevel=H&text=${encodeURIComponent(shareUrl)}`);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(830, 1128, 250, 250);
                ctx.drawImage(qr, 840, 1138, 230, 230);
            } catch {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(830, 1128, 250, 250);
                ctx.fillStyle = '#111827';
                ctx.font = '800 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillText('扫码查看', 900, 1255);
            }

            ctx.fillStyle = '#ffffff';
            ctx.font = '900 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText('扫码查看完整分析', 820, 1110);
            ctx.fillStyle = '#a5b4fc';
            ctx.font = '700 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            drawWrappedText(ctx, shareUrl.replace(/^https?:\/\//, ''), 72, 1462, 700, 26, 1);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText('fde.fan', 930, 1440);

            const link = document.createElement('a');
            link.download = `${match.match_id}-score-analysis.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            setShareStates(prev => ({
                ...prev,
                [match.match_id]: { ...prev[match.match_id], imageLoading: false, url: shareUrl }
            }));
        } catch (error: any) {
            setShareStates(prev => ({
                ...prev,
                [match.match_id]: { ...prev[match.match_id], imageLoading: false, error: error.message || '生成分享图失败' }
            }));
        }
    };

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
                    const scoreState = scoreAnalyses[match.match_id];
                    
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

                            {scoreState && (
                                <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-300">
                                    {scoreState?.loading && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-violet-200">
                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300"></span>
                                            <span className="zh">比分推理准备中</span>
                                            <span className="en">Score analysis loading</span>
                                        </span>
                                    )}
                                    {scoreState?.analysis && (
                                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                                            <span className="zh">比分 {scoreState.analysis.predicted_score}</span>
                                            <span className="en">Score {scoreState.analysis.predicted_score}</span>
                                            {scoreState.analysis.score_probabilities?.[0]?.probability != null && (
                                                <span className="text-emerald-100/70">
                                                    {(scoreState.analysis.score_probabilities[0].probability * 100).toFixed(1)}%
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setReasoningMatch(match)}
                                                className="rounded-full border border-emerald-300/20 px-1.5 py-0.5 text-[10px] text-emerald-100 transition hover:bg-emerald-300/10"
                                            >
                                                <span className="zh">依据</span>
                                                <span className="en">Why</span>
                                            </button>
                                        </span>
                                    )}
                                    {scoreState?.error && (
                                        <span className="inline-flex rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-rose-200">
                                            <span className="zh">比分分析暂不可用</span>
                                            <span className="en">Score analysis unavailable</span>
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="relative z-10 mt-4 flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSimulationMatch(match);
                                        setSimulationMode('ai');
                                    }}
                                    className="rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-100 transition hover:bg-indigo-500/20"
                                >
                                    <span className="zh">询问 AI</span>
                                    <span className="en">Ask AI</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSimulationMatch(match);
                                        setSimulationMode('manual');
                                    }}
                                    className="rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2 text-xs font-black text-slate-100 transition hover:bg-slate-700"
                                >
                                    <span className="zh">推演实验室</span>
                                    <span className="en">Lab</span>
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

            {reasoningMatch && scoreAnalyses[reasoningMatch.match_id]?.analysis && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setReasoningMatch(null)}>
                    <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-xl font-black text-white">
                                    <span className="zh">比分预测依据</span>
                                    <span className="en">Score Reasoning</span>
                                </h3>
                                <p className="mt-1 text-sm text-slate-400">
                                    {getTeamMeta(reasoningMatch.home_team_id).zh} vs {getTeamMeta(reasoningMatch.away_team_id).zh}
                                </p>
                            </div>
                            <button type="button" onClick={() => setReasoningMatch(null)} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800">
                                <span className="zh">关闭</span>
                                <span className="en">Close</span>
                            </button>
                        </div>

                        {(() => {
                            const analysis = scoreAnalyses[reasoningMatch.match_id].analysis!;
                            const shareState = shareStates[reasoningMatch.match_id] || {};
                            return (
                                <div className="space-y-5">
                                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                                        <div className="text-sm font-bold text-emerald-200">
                                            <span className="zh">推荐比分</span>
                                            <span className="en">Predicted Score</span>
                                        </div>
                                        <div className="mt-2 text-3xl font-black text-white">{analysis.predicted_score}</div>
                                        <p className="mt-2 text-sm leading-6 text-emerald-100/80">{analysis.summary_zh}</p>
                                    </div>

                                    <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <h4 className="text-sm font-black text-indigo-100">
                                                    <span className="zh">分享这次预测</span>
                                                    <span className="en">Share This Prediction</span>
                                                </h4>
                                                <p className="mt-1 text-xs text-indigo-100/70">
                                                    <span className="zh">生成可访问链接，或保存带二维码的预测卡图片。</span>
                                                    <span className="en">Create a public link or save a QR share card.</span>
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => saveScoreShare(reasoningMatch, analysis)}
                                                    disabled={shareState.loading}
                                                    className="rounded-lg border border-indigo-300/25 bg-indigo-400/10 px-3 py-2 text-xs font-black text-indigo-100 transition hover:bg-indigo-300/20 disabled:opacity-60"
                                                >
                                                    {shareState.loading ? '生成中...' : '生成链接'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadScoreShareImage(reasoningMatch, analysis)}
                                                    disabled={shareState.imageLoading}
                                                    className="rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100 transition hover:bg-emerald-300/20 disabled:opacity-60"
                                                >
                                                    {shareState.imageLoading ? '生成图片中...' : '保存分享图'}
                                                </button>
                                            </div>
                                        </div>
                                        {shareState.url && (
                                            <p className="mt-3 break-all rounded-lg bg-slate-950/50 px-3 py-2 text-xs text-indigo-100/80">
                                                {shareState.url}
                                            </p>
                                        )}
                                        {shareState.error && (
                                            <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                                                {shareState.error}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="mb-2 text-sm font-bold text-slate-200">
                                            <span className="zh">比分概率</span>
                                            <span className="en">Score Probabilities</span>
                                        </h4>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {analysis.score_probabilities?.map((item) => (
                                                <div key={item.score} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm">
                                                    <span className="font-bold text-white">{item.score}</span>
                                                    <span className="text-slate-300">{item.label_zh}</span>
                                                    <span className="font-bold text-emerald-300">{(item.probability * 100).toFixed(1)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-4">
                                            <h4 className="text-sm font-bold text-sky-200">
                                                <span className="zh">天气数据</span>
                                                <span className="en">Weather</span>
                                            </h4>
                                            <p className="mt-2 text-sm text-slate-200">{getWeatherSummary(reasoningMatch.weather) || '暂无'}</p>
                                        </div>
                                        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
                                            <h4 className="text-sm font-bold text-amber-200">
                                                <span className="zh">赔率数据</span>
                                                <span className="en">Odds</span>
                                            </h4>
                                            <div className="mt-2 space-y-1 text-sm text-slate-200">
                                                {reasoningMatch.odds?.slice(0, 6).map((odds) => (
                                                    <div key={`${odds.bookmaker_key}-${odds.last_update}`} className="flex justify-between gap-3">
                                                        <span>{getBookmakerLabel(odds.bookmaker_key, odds.bookmaker_title)} · {getMarketLabel(odds.market_key, odds.market_title).zh}</span>
                                                        <span className="text-amber-100">{odds.home_odds?.toFixed(2)}/{odds.draw_odds?.toFixed(2)}/{odds.away_odds?.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                                        <h4 className="mb-3 text-sm font-bold text-slate-200">
                                            <span className="zh">数据推理过程</span>
                                            <span className="en">Data Reasoning</span>
                                        </h4>
                                        <div className="space-y-1">{renderReasoningMarkdown(analysis.reasoning_md)}</div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {simulationMatch && (
                <SimulationModal
                    isOpen={Boolean(simulationMatch)}
                    onClose={() => setSimulationMatch(null)}
                    match={simulationMatch}
                    homeMeta={getTeamMeta(simulationMatch.home_team_id)}
                    awayMeta={getTeamMeta(simulationMatch.away_team_id)}
                    mode={simulationMode}
                />
            )}
        </div>
    );
}
