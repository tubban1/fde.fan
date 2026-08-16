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
    // Graceful fallback if database connection is not initialized
    return { success: true, submissionId, fallback: true, error: err.message };
  }
}
