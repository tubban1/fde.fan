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
      return res.status(400).json({ success: false, error: "未获取到有效的 微信 OpenID" });
    }

    // 2. 生成微信号合成账号（使用微信 OpenID 作为标识）
    const wxEmail = `wx_${openid}@wechat.mp`;
    const defaultPassword = hashPassword(`wx_${openid.slice(0, 10)}`);

    await ensureAuthTables();
    let rows = await findUserCredits(wxEmail);

    if (!rows || rows.length === 0) {
      // 自动完成新用户注册，默认包含 30 诊断积分并设为已验证
      await query(
        "INSERT INTO user_credits (email, password, credits, email_verified) VALUES (?, ?, ?, ?)",
        [wxEmail, defaultPassword, 30, true]
      );
      rows = await findUserCredits(wxEmail);
    }

    // 3. 返回免密 Token（使用账号与特定密钥通信）
    return res.status(200).json({
      success: true,
      token: wxEmail,
      email: wxEmail,
      password: defaultPassword,
      credits: rows[0]?.credits || 30
    });
  } catch (error) {
    console.error("[WeChat Login] Internal Error:", error);
    return res.status(500).json({ success: false, error: "微信登录服务器内部错误" });
  }
}
