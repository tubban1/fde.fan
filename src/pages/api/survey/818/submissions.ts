import type { APIRoute } from "astro";
import { getSurveySubmissions } from "../../../../server/survey/survey818.js";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const data = await getSurveySubmissions();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Survey 818 fetch submissions error:", err);
    return new Response(
      JSON.stringify({ error: "服务器内部错误，无法获取实时监控数据" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
