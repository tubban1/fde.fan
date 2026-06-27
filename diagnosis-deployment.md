# FDE FAN Diagnosis Deployment

`wish2/diagnosis` 是独立 Next.js 12 服务端工具，推荐部署到 `diagnosis.fde.fan`，不要直接塞进 Astro 静态主站。

## 需要迁移的 wish2 文件

- `pages/diagnosis.js`
- `pages/api/diagnosis/start.js`
- `pages/api/diagnosis/chat.js`
- `pages/api/diagnosis/session.js`
- `pages/api/diagnosis/history.js`
- `pages/api/diagnosis/report.js`
- `pages/api/diagnosis/delete.js`
- `pages/api/timage/[action].js` 中的 `pre-check` 登录逻辑，迁移后重命名为 diagnosis auth
- `lib/db.js`
- `lib/text_model_provider.js`
- `lib/diagnosis_extract.js`
- `lib/diagnosis_init.js`
- `lib/diagnosis_schema.js`
- `lib/safe_error.js`
- `scripts/supabase_schema.cjs`

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
