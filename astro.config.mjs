import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://www.fde.fan",
  output: "server",
  adapter: vercel(),
  markdown: {
    syntaxHighlight: false,
  },
  integrations: [mdx(), react()],
});
