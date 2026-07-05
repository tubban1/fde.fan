import type { APIRoute } from "astro";
import { query } from "../../../server/diagnosis/db.js";

export const prerender = false;

let initialized = false;

const text = (value: unknown, max = 2000) => String(value ?? "").trim().slice(0, max);

async function ensureFutureCampApplicationsTable() {
  if (initialized) return;

  await query(`
    CREATE TABLE IF NOT EXISTS future_camp_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_name VARCHAR(255) NOT NULL,
      age_grade VARCHAR(120) NOT NULL,
      email VARCHAR(255) NULL,
      contact VARCHAR(255) NOT NULL,
      track VARCHAR(255) NULL,
      notes TEXT NULL,
      source VARCHAR(120) DEFAULT 'fde.fan',
      user_agent TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  initialized = true;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const studentName = text(body.studentName, 255);
    const ageGrade = text(body.ageGrade, 120);
    const email = text(body.email, 255);
    const contact = text(body.contact, 255);
    const track = text(body.track, 255);
    const notes = text(body.notes, 5000);

    if (!studentName || !ageGrade || !contact) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "MISSING_REQUIRED_FIELDS",
          message: "学生姓名、年龄/年级、联系方式为必填项。",
        }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } },
      );
    }

    await ensureFutureCampApplicationsTable();

    await query(
      `INSERT INTO future_camp_applications
        (student_name, age_grade, email, contact, track, notes, source, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentName,
        ageGrade,
        email || null,
        contact,
        track || null,
        notes || null,
        "future-camp-homepage",
        request.headers.get("user-agent") || "",
      ],
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    console.error("Future Camp application save error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "SAVE_FAILED",
        message: "报名信息暂时无法保存，请稍后重试。",
      }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }
};
