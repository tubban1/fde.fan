export interface PredictionFeatures {
  odds_1x2_home?: number;
  odds_1x2_draw?: number;
  odds_1x2_away?: number;
  injury_impact_home?: number; // -0.1 to 0
  injury_impact_away?: number; // -0.1 to 0
  lineup_strength_home?: number; // 0.8 to 1.2
  lineup_strength_away?: number; // 0.8 to 1.2
  temperature_c?: number;
  humidity_pct?: number;
  rain_level?: 'none' | 'light' | 'heavy';
  weather_impact_style?: 'neutral' | 'slow_tempo' | 'high_variance';
}

export interface Probabilities {
  home: number;
  draw: number;
  away: number;
}

export interface Explanation {
  zh: string;
  en: string;
}

export interface SimulationResult {
  baseline: Probabilities;
  adjusted: Probabilities;
  delta: Probabilities;
  explanations: Explanation[];
}

export function simulatePrediction(baseline: Probabilities, features: PredictionFeatures): SimulationResult {
  let { home, draw, away } = baseline;
  const explanations: Explanation[] = [];

  // 1. Odds Blend
  if (features.odds_1x2_home && features.odds_1x2_draw && features.odds_1x2_away) {
    const invH = 1 / features.odds_1x2_home;
    const invD = 1 / features.odds_1x2_draw;
    const invA = 1 / features.odds_1x2_away;
    const margin = invH + invD + invA;
    
    const impliedH = invH / margin;
    const impliedD = invD / margin;
    const impliedA = invA / margin;
    
    // Blend with baseline (weight 0.5)
    home = (home + impliedH) / 2;
    draw = (draw + impliedD) / 2;
    away = (away + impliedA) / 2;
    explanations.push({
        zh: "融合了用户输入的赔率隐含概率 (权重 0.5)",
        en: "Blended with user-input implied odds (0.5 weight)"
    });
  }

  // 2. Injury Impact
  if (features.injury_impact_home && features.injury_impact_home < 0) {
    const shift = Math.abs(features.injury_impact_home) * 0.3; // max -0.1 means -3% prob
    home = Math.max(0, home - shift);
    draw += shift / 2;
    away += shift / 2;
    explanations.push({
        zh: `主队伤停影响降低主胜约 ${(shift*100).toFixed(1)}%`,
        en: `Home team injury impact reduced home win prob by ~${(shift*100).toFixed(1)}%`
    });
  }
  if (features.injury_impact_away && features.injury_impact_away < 0) {
    const shift = Math.abs(features.injury_impact_away) * 0.3;
    away = Math.max(0, away - shift);
    draw += shift / 2;
    home += shift / 2;
    explanations.push({
        zh: `客队伤停影响降低客胜约 ${(shift*100).toFixed(1)}%`,
        en: `Away team injury impact reduced away win prob by ~${(shift*100).toFixed(1)}%`
    });
  }

  // 3. Lineup Strength
  if (features.lineup_strength_home && features.lineup_strength_home !== 1) {
    const shift = (features.lineup_strength_home - 1) * 0.2; // 1.2 -> +4%
    home += shift;
    draw -= shift / 2;
    away -= shift / 2;
    if (shift > 0) explanations.push({
        zh: `主队首发增强提高主胜约 ${(shift*100).toFixed(1)}%`,
        en: `Stronger home lineup increased home win prob by ~${(shift*100).toFixed(1)}%`
    });
    else explanations.push({
        zh: `主队首发削弱降低主胜约 ${(-shift*100).toFixed(1)}%`,
        en: `Weaker home lineup reduced home win prob by ~${(-shift*100).toFixed(1)}%`
    });
  }
  if (features.lineup_strength_away && features.lineup_strength_away !== 1) {
    const shift = (features.lineup_strength_away - 1) * 0.2;
    away += shift;
    draw -= shift / 2;
    home -= shift / 2;
    if (shift > 0) explanations.push({
        zh: `客队首发增强提高客胜约 ${(shift*100).toFixed(1)}%`,
        en: `Stronger away lineup increased away win prob by ~${(shift*100).toFixed(1)}%`
    });
    else explanations.push({
        zh: `客队首发削弱降低客胜约 ${(-shift*100).toFixed(1)}%`,
        en: `Weaker away lineup reduced away win prob by ~${(-shift*100).toFixed(1)}%`
    });
  }

  // 4. Weather
  if (features.weather_impact_style === 'slow_tempo') {
    const shift = 0.03;
    draw += shift;
    home -= shift/2;
    away -= shift/2;
    explanations.push({
        zh: "慢节奏场景提高平局概率约 3%",
        en: "Slow tempo environment increased draw prob by ~3%"
    });
  } else if (features.weather_impact_style === 'high_variance') {
    if (home > away) {
        const shift = home * 0.05;
        home -= shift;
        away += shift;
    } else {
        const shift = away * 0.05;
        away -= shift;
        home += shift;
    }
    explanations.push({
        zh: "高变数场景微调了弱队胜率",
        en: "High variance environment slightly favored the underdog"
    });
  }
  
  if (features.rain_level === 'heavy' || (features.temperature_c && features.temperature_c > 35)) {
    const shift = 0.02;
    draw += shift;
    home -= shift/2;
    away -= shift/2;
    explanations.push({
        zh: "极端天气略微提高平局概率",
        en: "Extreme weather slightly increased draw prob"
    });
  }

  // Normalize
  home = Math.max(0, home);
  draw = Math.max(0, draw);
  away = Math.max(0, away);
  const total = home + draw + away;
  home /= total;
  draw /= total;
  away /= total;

  return {
    baseline,
    adjusted: { home, draw, away },
    delta: {
      home: home - baseline.home,
      draw: draw - baseline.draw,
      away: away - baseline.away
    },
    explanations
  };
}
