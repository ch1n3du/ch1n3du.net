import { defineCollection, z } from 'astro:content';

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional().default(''),
    hidefromhome: z.boolean().optional().default(false),
    toc: z.boolean().optional().default(true),
    draft: z.boolean().optional().default(false),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(''),
    date: z.coerce.date(),
    year: z.string().optional(),
    status: z.string().optional(),
    technologies: z.array(z.string()).optional().default([]),
    github: z.string().optional(),
    demo: z.string().optional(),
    paper: z.string().optional(),
    // When set, the card links straight to this URL (e.g. a /apps/<name>/ page)
    // instead of generating a writeup detail page. See src/apps/README.md.
    link: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { pages, projects };
