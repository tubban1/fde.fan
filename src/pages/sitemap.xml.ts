import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { insightArticles } from "../data/insights";
import { SITE_URL } from "../lib/seo";

export const prerender = true;

const staticRoutes = [
  "/",
  "/learn",
  "/learn/what-is-fde",
  "/learn/foundations",
  "/learn/prompt-to-ui",
  "/learn/agent-workflows",
  "/learn/ecommerce-ai",
  "/learn/deployment",
  "/glossary/fde",
  "/industries",
  "/industries/cross-border-commerce",
  "/industries/culture-tourism",
  "/cases",
  "/projects",
  "/resources",
  "/assessment",
  "/insights",
  "/tools/diagnosis",
  "/diagnosis",
];

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const GET: APIRoute = async () => {
  const [tutorials, cases] = await Promise.all([getCollection("tutorials"), getCollection("cases")]);
  const dynamicRoutes = [
    ...tutorials.map((entry) => `/learn/tutorials/${entry.slug}`),
    ...cases.map((entry) => `/cases/${entry.slug}`),
    ...insightArticles.map((article) => `/insights/${article.slug}`),
  ];
  const today = new Date().toISOString().slice(0, 10);
  const uniqueRoutes = Array.from(new Set([...staticRoutes, ...dynamicRoutes]));
  const urls = uniqueRoutes
    .map((path) => {
      const priority = path === "/" ? "1.0" : path.startsWith("/learn") || path === "/glossary/fde" ? "0.9" : "0.8";
      const changefreq = path === "/" || path === "/learn" ? "weekly" : "monthly";
      return [
        "  <url>",
        `    <loc>${escapeXml(new URL(path, SITE_URL).toString())}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
