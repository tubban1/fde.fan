import { defineCollection, z } from "astro:content";

const tutorials = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    titleEn: z.string(),
    track: z.string(),
    order: z.number(),
    summary: z.string(),
    summaryEn: z.string(),
  }),
});

const cases = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    titleEn: z.string(),
    category: z.string(),
    difficulty: z.string(),
    deliverables: z.array(z.string()),
  }),
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    titleEn: z.string(),
    week: z.string(),
    skills: z.array(z.string()),
    scoreFocus: z.string(),
  }),
});

const resources = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    titleEn: z.string(),
    type: z.string(),
    usage: z.string(),
  }),
});

export const collections = { tutorials, cases, projects, resources };
