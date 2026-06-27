# FDE FAN Diagnosis

Enterprise AI transformation diagnosis agent copied from `wish2/diagnosis` and rebranded as an embedded Next.js tool for `/diagnosis`.

## Run Locally

```bash
cd diagnosis
pnpm install
cp .env.example .env.local
pnpm run supabase:init
pnpm run dev
```

## Deploy

The root `vercel.json` mounts this app at:

- `https://fde.fan/diagnosis`
- `https://www.fde.fan/diagnosis`

Required environment variables are listed in `.env.example`.
