import net from 'node:net';
import tls from 'node:tls';
import email from 'node:crypto';

function getEnv(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function smtpDate() {
  return new Date().toUTCString();
}

function normalizeAddress(address) {
  return String(address || '').trim();
}

function createMessageId(fromEmail) {
  const domain = fromEmail.includes('@') ? fromEmail.split('@').pop() : 'fde.fan';
  return `<${email.randomUUID()}@${domain}>`;
}

function readResponse(socket) {
  return new Promise((resolve, reject) => {
    let data = '';
    const onData = (chunk) => {
      data += chunk.toString('utf8');
      const lines = data.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || '';
      if (/^\d{3}\s/.test(last)) {
        socket.off('data', onData);
        socket.off('error', onError);
        resolve(data);
      }
    };
    const onError = (error) => {
      socket.off('data', onData);
      reject(error);
    };
    socket.on('data', onData);
    socket.once('error', onError);
  });
}

async function command(socket, line, expected = /^[23]/, displayName = '') {
  socket.write(`${line}\r\n`);
  const response = await readResponse(socket);
  if (!expected.test(response)) {
    const commandName = displayName || line.split(' ')[0];
    throw new Error(`SMTP command failed: ${commandName} -> ${response.slice(0, 300)}`);
  }
  return response;
}

function connectSmtp({ host, port, secure, timeout }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host, timeout })
      : net.connect({ host, port, timeout });
    socket.once('secureConnect', () => resolve(socket));
    socket.once('connect', () => {
      if (!secure) resolve(socket);
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error('SMTP connection timed out'));
    });
    socket.once('error', reject);
  });
}

function buildHtmlEmail({ title, preheader, bodyHtml, actionUrl, actionLabel }) {
  const safeUrl = String(actionUrl || '');
  return `<!doctype html>
<html>
  <body style="margin:0;background:#05070d;color:#f7fbff;font-family:Arial,'Microsoft YaHei',sans-serif;">
    <span style="display:none;color:transparent;max-height:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05070d;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid rgba(69,244,255,.25);background:#101724;">
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 10px;color:#45f4ff;font-size:12px;letter-spacing:4px;font-weight:800;">FDE FAN</p>
                <h1 style="margin:0 0 16px;color:#fff;font-size:28px;line-height:1.15;">${title}</h1>
                <div style="color:#cbd5e1;font-size:15px;line-height:1.8;">${bodyHtml}</div>
                <p style="margin:28px 0;">
                  <a href="${safeUrl}" style="display:inline-block;background:#45f4ff;color:#041016;text-decoration:none;font-weight:800;padding:13px 18px;">${actionLabel}</a>
                </p>
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.7;">如果按钮无法打开，请复制链接到浏览器：<br /><span style="word-break:break-all;color:#45f4ff;">${safeUrl}</span></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function getMailConfigStatus() {
  const missing = [];
  const authUser = getEnv('ALIYUN_SMTP_AUTH_USER', getEnv('ALIYUN_SMTP_USER'));
  const fromAddress = getEnv('ALIYUN_SMTP_FROM_ADDRESS', getEnv('ALIYUN_SMTP_USER'));
  if (!authUser) missing.push('ALIYUN_SMTP_AUTH_USER or ALIYUN_SMTP_USER');
  if (authUser && !authUser.includes('@')) missing.push('ALIYUN_SMTP_AUTH_USER must be a full email address');
  if (!fromAddress) missing.push('ALIYUN_SMTP_FROM_ADDRESS or ALIYUN_SMTP_USER');
  if (!getEnv('ALIYUN_SMTP_PASSWORD')) missing.push('ALIYUN_SMTP_PASSWORD');
  if (!getEnv('PUBLIC_SITE_URL') && !getEnv('APP_BASE_URL')) missing.push('PUBLIC_SITE_URL or APP_BASE_URL');
  return { configured: missing.length === 0, missing };
}

export function getBaseUrl(req) {
  const explicit = getEnv('PUBLIC_SITE_URL') || getEnv('APP_BASE_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const host = req?.headers?.host;
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : 'https://www.fde.fan';
}

export async function sendAliyunMail({ to, subject, html, text }) {
  const host = getEnv('ALIYUN_SMTP_HOST', 'smtp.qiye.aliyun.com');
  const port = Number(getEnv('ALIYUN_SMTP_PORT', '465'));
  const secure = getEnv('ALIYUN_SMTP_SECURE', 'true') !== 'false';
  const authUsername = getEnv('ALIYUN_SMTP_AUTH_USER', getEnv('ALIYUN_SMTP_USER'));
  const fromAddress = getEnv('ALIYUN_SMTP_FROM_ADDRESS', getEnv('ALIYUN_SMTP_USER'));
  const password = getEnv('ALIYUN_SMTP_PASSWORD');
  const fromName = getEnv('ALIYUN_SMTP_FROM_NAME', 'FDE FAN');
  const replyTo = getEnv('ALIYUN_SMTP_REPLY_TO', fromAddress);
  const timeout = Number(getEnv('ALIYUN_SMTP_TIMEOUT_MS', '10000'));
  const recipient = normalizeAddress(to);

  if (!authUsername || !authUsername.includes('@') || !fromAddress || !password || !recipient) {
    throw new Error('Aliyun SMTP credentials or recipient are missing');
  }

  const boundary = `fde_${email.randomBytes(12).toString('hex')}`;
  const message = [
    `Subject: ${encodeHeader(subject)}`,
    `From: ${encodeHeader(fromName)} <${fromAddress}>`,
    `To: <${recipient}>`,
    `Reply-To: ${replyTo}`,
    `Message-ID: ${createMessageId(fromAddress)}`,
    `Date: ${smtpDate()}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(text || '', 'utf8').toString('base64'),
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(html || '', 'utf8').toString('base64'),
    `--${boundary}--`,
    '',
  ].join('\r\n');

  let socket = await connectSmtp({ host, port, secure, timeout });
  try {
    await readResponse(socket);
    await command(socket, `EHLO ${getEnv('ALIYUN_SMTP_EHLO_DOMAIN', 'fde.fan')}`);
    await command(socket, 'AUTH LOGIN', /^334/);
    await command(socket, Buffer.from(authUsername).toString('base64'), /^334/, 'AUTH_USERNAME');
    await command(socket, Buffer.from(password).toString('base64'), /^235/, 'AUTH_PASSWORD');
    await command(socket, `MAIL FROM:<${fromAddress}>`);
    await command(socket, `RCPT TO:<${recipient}>`);
    await command(socket, 'DATA', /^354/);
    socket.write(`${message}\r\n.\r\n`);
    const dataResponse = await readResponse(socket);
    if (!/^250/.test(dataResponse)) {
      throw new Error(`SMTP DATA failed: ${dataResponse.slice(0, 300)}`);
    }
    await command(socket, 'QUIT', /^[23]/).catch(() => null);
  } finally {
    socket.end();
  }
}

export async function sendVerificationEmail({ req, to, token }) {
  const baseUrl = getBaseUrl(req);
  const url = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;
  const html = buildHtmlEmail({
    title: '验证你的 FDE FAN 邮箱',
    preheader: '点击链接完成 FDE FAN 邮箱验证。',
    bodyHtml: '<p>欢迎使用 FDE FAN。请点击下面的按钮完成邮箱验证，验证后即可登录并保存诊断历史。</p><p>此链接有时效限制，如果过期，请在登录页重新触发验证邮件。</p>',
    actionUrl: url,
    actionLabel: '验证邮箱',
  });
  await sendAliyunMail({
    to,
    subject: '验证你的 FDE FAN 邮箱',
    html,
    text: `请打开链接完成 FDE FAN 邮箱验证：${url}`,
  });
}

export async function sendPasswordResetEmail({ req, to, token }) {
  const baseUrl = getBaseUrl(req);
  const url = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const html = buildHtmlEmail({
    title: '重置你的 FDE FAN 密码',
    preheader: '点击链接重置 FDE FAN 密码。',
    bodyHtml: '<p>我们收到了你的密码找回请求。请点击下面的按钮设置新密码。</p><p>如果这不是你本人操作，可以忽略这封邮件。</p>',
    actionUrl: url,
    actionLabel: '重置密码',
  });
  await sendAliyunMail({
    to,
    subject: '重置你的 FDE FAN 密码',
    html,
    text: `请打开链接重置 FDE FAN 密码：${url}`,
  });
}
