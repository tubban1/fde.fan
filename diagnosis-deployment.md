# FDE FAN Diagnosis Deployment

`wish2/diagnosis` 已复制到本仓库的 `diagnosis/` 目录。它是独立 Next.js 12 服务端工具，推荐部署到 `diagnosis.fde.fan`，不要直接塞进 Astro 静态主站。

## 需要迁移的 wish2 文件

- `diagnosis/pages/index.js`
- `diagnosis/pages/api/diagnosis/start.js`
- `diagnosis/pages/api/diagnosis/chat.js`
- `diagnosis/pages/api/diagnosis/session.js`
- `diagnosis/pages/api/diagnosis/history.js`
- `diagnosis/pages/api/diagnosis/report.js`
- `diagnosis/pages/api/diagnosis/delete.js`
- `diagnosis/pages/api/diagnosis-auth/pre-check.js`
- `diagnosis/lib/db.js`
- `diagnosis/lib/text_model_provider.js`
- `diagnosis/lib/diagnosis_extract.js`
- `diagnosis/lib/diagnosis_init.js`
- `diagnosis/lib/diagnosis_schema.js`
- `diagnosis/lib/safe_error.js`
- `diagnosis/scripts/supabase_schema.cjs`

## 线上环境变量

```bash
DB_PROVIDER=supabase
SUPABASE_DB_URL=postgresql://...
TEXT_MODEL_PROVIDER=tokenrouter
TOKENROUTER_API_KEY=...
TEXT_MODEL=google/gemini-3.5-flash
```

## 上线检查

- `diagnosis.fde.fan` 页面可访问。
- `/api/diagnosis/start` 能创建 session。
- `/api/diagnosis/chat` 流式输出不中断。
- 报告、历史记录、隐藏删除都能写入 Supabase。
- 主站 `/tools/diagnosis` CTA 正确跳转。

## Vercel 设置

- Project Root Directory: `diagnosis`
- Build Command: `pnpm run build`
- Install Command: `pnpm install`
- Production Domain: `diagnosis.fde.fan`
