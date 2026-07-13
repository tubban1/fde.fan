import type { APIRoute } from 'astro';
import { simulatePrediction, type PredictionFeatures } from '../../../lib/worldcupPredictionEngine';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const match_id = body.match_id;
        const features = body.features as PredictionFeatures;

        if (!match_id || !features) {
            return new Response(JSON.stringify({ error: 'Missing match_id or features' }), { status: 400 });
        }

        const apiUrl =
            import.meta.env.PREDICT_API_URL ||
            import.meta.env.PUBLIC_PREDICT_API_URL ||
            process.env.PREDICT_API_URL ||
            process.env.PUBLIC_PREDICT_API_URL ||
            'https://wihaha-worldcup-api.hf.space';
        const normalizedApiUrl = String(apiUrl).trim().replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(normalizedApiUrl)) {
            return new Response(JSON.stringify({ error: `Invalid prediction API URL: ${normalizedApiUrl}` }), { status: 500 });
        }
        const res = await fetch(`${normalizedApiUrl}/api/predict`, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) {
            return new Response(JSON.stringify({ error: 'Failed to fetch baseline predictions' }), { status: 502 });
        }
        const data = await res.json();
        
        const matchData = data.predictions.find((p: any) => p.match_id === match_id);
        if (!matchData) {
            return new Response(JSON.stringify({ error: `Match ${match_id} not found in active predictions` }), { status: 404 });
        }

        const baseline = {
            home: matchData.prob_home_win,
            draw: matchData.prob_draw,
            away: matchData.prob_away_win
        };

        const result = simulatePrediction(baseline, features);

        return new Response(JSON.stringify({
            match_id,
            ...result
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
