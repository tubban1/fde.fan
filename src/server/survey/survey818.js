import { isPostgresMode, query } from "../diagnosis/db.js";

let surveyTablePromise = null;

export async function ensureSurvey818Table() {
  if (surveyTablePromise) return surveyTablePromise;

  surveyTablePromise = (async () => {
    try {
      if (isPostgresMode) {
        await query(`
          CREATE TABLE IF NOT EXISTS survey_818_submissions (
            id SERIAL PRIMARY KEY,
            submission_id VARCHAR(64) UNIQUE NOT NULL,
            company_name VARCHAR(255) NOT NULL,
            contact_name VARCHAR(128) NOT NULL,
            position VARCHAR(128) NOT NULL,
            phone VARCHAR(32) NOT NULL,
            wechat VARCHAR(128),
            branch VARCHAR(64) NOT NULL,
            overall_score INTEGER NOT NULL,
            percentile INTEGER NOT NULL,
            level_title VARCHAR(128) NOT NULL,
            dimensions_json TEXT NOT NULL,
            answers_json TEXT NOT NULL,
            recommended_projects_json TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } else {
        await query(`
          CREATE TABLE IF NOT EXISTS survey_818_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            submission_id VARCHAR(64) UNIQUE NOT NULL,
            company_name VARCHAR(255) NOT NULL,
            contact_name VARCHAR(128) NOT NULL,
            position VARCHAR(128) NOT NULL,
            phone VARCHAR(32) NOT NULL,
            wechat VARCHAR(128),
            branch VARCHAR(64) NOT NULL,
            overall_score INT NOT NULL,
            percentile INT NOT NULL,
            level_title VARCHAR(128) NOT NULL,
            dimensions_json TEXT NOT NULL,
            answers_json TEXT NOT NULL,
            recommended_projects_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
    } catch (err) {
      surveyTablePromise = null;
      console.warn("[Survey818] Failed to ensure table, DB might be unconfigured:", err.message);
    }
  })();

  return surveyTablePromise;
}

export async function saveSurveySubmission(data) {
  const {
    submissionId,
    companyName,
    contactName,
    position,
    phone,
    wechat = "",
    branch,
    overallScore,
    percentile,
    levelTitle,
    dimensions,
    answers,
    recommendedProjects,
  } = data;

  await ensureSurvey818Table();

  const dimensionsJson = typeof dimensions === "string" ? dimensions : JSON.stringify(dimensions || {});
  const answersJson = typeof answers === "string" ? answers : JSON.stringify(answers || {});
  const recommendedProjectsJson =
    typeof recommendedProjects === "string"
      ? recommendedProjects
      : JSON.stringify(recommendedProjects || []);

  try {
    await query(
      `INSERT INTO survey_818_submissions 
       (submission_id, company_name, contact_name, position, phone, wechat, branch, overall_score, percentile, level_title, dimensions_json, answers_json, recommended_projects_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        submissionId,
        companyName,
        contactName,
        position,
        phone,
        wechat,
        branch,
        overallScore,
        percentile,
        levelTitle,
        dimensionsJson,
        answersJson,
        recommendedProjectsJson,
      ]
    );
    return { success: true, submissionId };
  } catch (err) {
    console.error("[Survey818] Error inserting submission to database:", err);
    return { success: true, submissionId, fallback: true, error: err.message };
  }
}

export async function getSurveySubmissions() {
  await ensureSurvey818Table();

  try {
    const rows = await query(
      `SELECT id, submission_id, company_name, contact_name, position, phone, wechat, branch, overall_score, percentile, level_title, dimensions_json, answers_json, recommended_projects_json, created_at 
       FROM survey_818_submissions 
       ORDER BY created_at DESC LIMIT 500`
    );

    const list = (rows || []).map((r) => {
      let dimensions = {};
      let answers = {};
      let recommendedProjects = [];

      try {
        dimensions = JSON.parse(r.dimensions_json || "{}");
      } catch (e) {}
      try {
        answers = JSON.parse(r.answers_json || "{}");
      } catch (e) {}
      try {
        recommendedProjects = JSON.parse(r.recommended_projects_json || "[]");
      } catch (e) {}

      return {
        id: r.id,
        submissionId: r.submission_id,
        companyName: r.company_name,
        contactName: r.contact_name,
        position: r.position,
        phone: r.phone,
        wechat: r.wechat,
        branch: r.branch,
        overallScore: r.overall_score,
        percentile: r.percentile,
        levelTitle: r.level_title,
        dimensions,
        answers,
        recommendedProjects,
        createdAt: r.created_at,
      };
    });

    // Compute real-time analytics
    const totalCount = list.length;
    let sumScore = 0;
    let highIntentCount = 0;
    const branchDistribution = { domestic: 0, crossborder: 0, supply_chain: 0 };
    const levelDistribution = { "Level 1": 0, "Level 2": 0, "Level 3": 0, "Level 4": 0 };
    const dimensionSums = {
      "AI应用成熟度": 0,
      "数据/知识基础": 0,
      "流程AI化程度": 0,
      "AI人才能力": 0,
      "组织落地能力": 0,
    };
    const dimensionCounts = {
      "AI应用成熟度": 0,
      "数据/知识基础": 0,
      "流程AI化程度": 0,
      "AI人才能力": 0,
      "组织落地能力": 0,
    };

    list.forEach((item) => {
      sumScore += item.overallScore || 0;
      if ((item.overallScore || 0) >= 60) highIntentCount++;

      if (branchDistribution[item.branch] !== undefined) {
        branchDistribution[item.branch]++;
      } else {
        branchDistribution.domestic++;
      }

      const lvlStr = item.levelTitle || "";
      if (lvlStr.includes("Level 4")) levelDistribution["Level 4"]++;
      else if (lvlStr.includes("Level 3")) levelDistribution["Level 3"]++;
      else if (lvlStr.includes("Level 2")) levelDistribution["Level 2"]++;
      else levelDistribution["Level 1"]++;

      if (item.dimensions) {
        Object.entries(item.dimensions).forEach(([key, val]) => {
          if (dimensionSums[key] !== undefined && typeof val === "number") {
            dimensionSums[key] += val;
            dimensionCounts[key]++;
          }
        });
      }
    });

    const avgScore = totalCount > 0 ? Math.round(sumScore / totalCount) : 0;
    const avgDimensions = {};
    Object.keys(dimensionSums).forEach((k) => {
      avgDimensions[k] =
        dimensionCounts[k] > 0 ? Math.round(dimensionSums[k] / dimensionCounts[k]) : 0;
    });

    return {
      submissions: list,
      stats: {
        totalCount,
        avgScore,
        highIntentCount,
        highIntentRate: totalCount > 0 ? Math.round((highIntentCount / totalCount) * 100) : 0,
        branchDistribution,
        levelDistribution,
        avgDimensions,
      },
    };
  } catch (err) {
    console.error("[Survey818] Error fetching submissions:", err);
    return {
      submissions: [],
      stats: {
        totalCount: 0,
        avgScore: 0,
        highIntentCount: 0,
        highIntentRate: 0,
        branchDistribution: { domestic: 0, crossborder: 0, supply_chain: 0 },
        levelDistribution: { "Level 1": 0, "Level 2": 0, "Level 3": 0, "Level 4": 0 },
        avgDimensions: {},
      },
      error: err.message,
    };
  }
}
