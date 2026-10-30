import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().min(1),
    category: z.string(),
    summary: z.string(),
    caption: z.string(),
    imageAlt: z.string().min(10),
    contentNote: z.string(),
    status: z.string(),
    topics: z.array(z.string()),
  }),
});
export const collections = { projects };
