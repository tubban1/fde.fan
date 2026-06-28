# FDE FAN Diagnosis Deployment

`wish2/diagnosis` 已迁入当前 Astro 技术栈，不再作为独立 Next.js 子项目部署。

## 当前访问路径

- 页面：`/diagnosis`
- 登录：`/api/diagnosis-auth/pre-check`
- 诊断 API：
  - `/api/diagnosis/start`
  - `/api/diagnosis/chat`
  - `/api/diagnosis/session`
  - `/api/diagnosis/history`
  - `/api/diagnosis/report`
  - `/api/diagnosis/delete`

## 当前实现位置

- 页面：`src/pages/diagnosis.astro`
- React 交互：`src/components/diagnosis/DiagnosisApp.jsx`
- API endpoints：`src/pages/api/diagnosis/*.ts`
- 业务 handler：`src/server/diagnosis/api/*.js`
- 数据库/模型：`src/server/diagnosis/*.js`
- Next handler adapter：`src/server/nextHandlerAdapter.ts`

## Vercel 设置

使用根目录作为唯一 Vercel Project Root。不要配置 `vercel.json builds`，也不要部署单独的 `diagnosis.fde.fan` 项目。

根项目使用 Astro Vercel adapter：

- `output: "server"`
- `adapter: vercel()`

## 线上环境变量

```bash
DB_PROVIDER=supabase
SUPABASE_DB_URL=postgresql://...
SUPABASE_DB_SSL=true
TEXT_MODEL_PROVIDER=tokenrouter
TOKENROUTER_API_KEY=...
TEXT_MODEL=google/gemini-3.5-flash

# Optional task-specific model routing
EXTRACTION_MODEL_PROVIDER=vectorengine
EXTRACTION_MODEL=gemini-3.1-flash-lite
REPORT_MODEL_PROVIDER=vectorengine
REPORT_MODEL=gemini-3.1-flash-lite
VECTORENGINE_API_BASE=https://api.vectorengine.cn/v1
VECTORENGINE_GEMINI_KEY=...
GEMINI_THINKING_BUDGET=8192
```

## 上线检查

- `/diagnosis` 页面可访问。
- `/api/diagnosis-auth/pre-check` 能登录/注册。
- `/api/diagnosis/start` 能创建 session。
- `/api/diagnosis/chat` 能返回对话结果。
- 报告、历史记录、隐藏删除都能写入 Supabase。
