import type { APIRoute } from "astro";
import { saveSurveySubmission } from "../../../../server/survey/survey818.js";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { companyName, contactName, position, phone } = body || {};

    if (!companyName || !contactName || !phone) {
      return new Response(
        JSON.stringify({ error: "请填写完整的企业名称、联系人姓名与手机号" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = String(phone).replace(/\D/g, "");
    if (!/^1[3-9]\d{9}$/.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ error: "请输入有效的 11 位手机号码" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const submissionId = `sub_818_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await saveSurveySubmission({
      ...body,
      submissionId,
      phone: normalizedPhone,
    });

    return new Response(
      JSON.stringify({
        success: true,
        submissionId,
        message: "企业诊断信息与结果已成功保存",
        result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Survey 818 submit error:", err);
    return new Response(
      JSON.stringify({ error: "服务器内部错误，无法保存企业信息" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
