# FDE FAN Diagnosis

Enterprise AI transformation diagnosis agent copied from `wish2/diagnosis` and rebranded as an independent Next.js tool for `diagnosis.fde.fan`.

## Run Locally

```bash
cd diagnosis
pnpm install
cp .env.example .env.local
pnpm run supabase:init
pnpm run dev
```

## Deploy

Create a separate Vercel project with:

- Root Directory: `diagnosis`
- Build Command: `pnpm run build`
- Output: Next.js default
- Domain: `diagnosis.fde.fan`

Required environment variables are listed in `.env.example`.
