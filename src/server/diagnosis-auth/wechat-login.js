import { ensureAuthTables, findUserCredits } from "./pre-check.js";
import { query } from "../diagnosis/db.js";
import { hashPassword } from "./auth-utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ success: false, error: "缺少微信 code 参数" });
  }

  const appId = process.env.AppID || process.env.WX_MINI_APPID;
  const appSecret = process.env.AppSecret || process.env.WX_MINI_SECRET;

  if (!appId || !appSecret) {
    return res.status(500).json({ success: false, error: "服务器未配置 AppID/AppSecret" });
  }

  try {
    // 1. 向微信官方服务器校验 code 换取 openid
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
    const wxRes = await fetch(wxUrl);
    const wxData = await wxRes.json();

    if (wxData.errcode) {
      console.error("[WeChat Login] Code exchange failed:", wxData);
      return res.status(400).json({ success: false, error: `微信登录校验失败: ${wxData.errmsg || wxData.errcode}` });
    }

    const { openid } = wxData;
    if (!openid) {
      return res.status(400).json({ success: false, error: "未获取到有效的微信 OpenID" });
    }

    // 2. 生成微信合成账号与原始密码（Raw Password，未加盐哈希前）
    const wxEmail = `wx_${openid}@wechat.mp`;
    const rawPassword = `wx_${openid.slice(0, 10)}`;

    await ensureAuthTables();
    let rows = await findUserCredits(wxEmail);

    if (!rows || rows.length === 0) {
      // 新用户自动注册，存入哈希后的密码，初始 30 额度
      const hashedPassword = hashPassword(rawPassword);
      await query(
        "INSERT INTO user_credits (email, password, credits, email_verified) VALUES (?, ?, ?, ?)",
        [wxEmail, hashedPassword, 30, true]
      );
      rows = await findUserCredits(wxEmail);
    } else {
      // 兼容清洗：确保老账号密码被正确更新，且如果额度为 0 则自动补满 30 额度
      const hashedPassword = hashPassword(rawPassword);
      const currentCredits = Number(rows[0]?.credits || 0);
      const nextCredits = currentCredits <= 0 ? 30 : currentCredits;
      await query(
        "UPDATE user_credits SET password = ?, email_verified = true, credits = ? WHERE email = ?",
        [hashedPassword, nextCredits, wxEmail]
      );
      if (rows[0]) rows[0].credits = nextCredits;
    }

    // 3. 返回原始未哈希密码供前端进行数据库认证校验
    return res.status(200).json({
      success: true,
      email: wxEmail,
      password: rawPassword,
      credits: rows[0]?.credits || 30
    });
  } catch (error) {
    console.error("[WeChat Login] Internal Error:", error);
    return res.status(500).json({ success: false, error: "微信登录服务器内部错误" });
  }
}
