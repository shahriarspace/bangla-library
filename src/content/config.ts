import { defineCollection, z } from 'astro:content';

const books = defineCollection({
  type: 'data',
  schema: z.object({
    title_bn: z.string(),
    title_en: z.string(),
    author_bn: z.string(),
    author_en: z.string(),
    year: z.string(),
    category: z.string(),
    description_en: z.string().optional(),
    paragraphs: z.array(z.object({
      id: z.number(),
      bn: z.string(),
      en: z.string(),
    })),
  }),
});

export const collections = { books };
