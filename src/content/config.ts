import { defineCollection, z } from 'astro:content';

const books = defineCollection({
  type: 'data',
  schema: z.object({
    title_bn: z.string(),
    title_en: z.string(),
    author_bn: z.string(),
    author_en: z.string(),
    author_slug: z.string().optional(),
    year: z.string(),
    published_date: z.string().optional(),
    status: z.enum(['published', 'unpublished']).default('published'),
    publish_date: z.string().optional(),
    priority: z.number().default(2),
    category: z.string(),
    description_en: z.string().optional(),
    description_bn: z.string().optional(),
    cover_image: z.string().optional(),
    back_image: z.string().optional(),
    edition_note: z.string().optional(),
    original_publisher: z.string().optional(),
    source: z.string().optional(),
    translation_reviewed: z.boolean().default(false),
    copyright_notice: z.string().optional(),
    fun_facts: z.array(z.object({
      type: z.enum(['film', 'award', 'cultural', 'history', 'translation', 'music', 'publication', 'influence', 'controversy', 'general']),
      text: z.string(),
    })).default([]),
    paragraphs: z.array(z.object({
      id: z.number(),
      bn: z.string(),
      en: z.string(),
    })),
  }),
});

const authors = defineCollection({
  type: 'data',
  schema: z.object({
    name_bn: z.string(),
    name_en: z.string(),
    born: z.string().optional(),
    died: z.string().optional(),
    born_place_en: z.string().optional(),
    born_place_bn: z.string().optional(),
    nationality: z.string().optional(),
    genres: z.array(z.string()).default([]),
    awards: z.array(z.string()).default([]),
    bio_en: z.string().optional(),
    bio_bn: z.string().optional(),
    facts: z.array(z.string()).default([]),
    wikipedia_en: z.string().optional(),
    image_url: z.string().optional(),
    image_credit: z.string().optional(),
  }),
});

export const collections = { books, authors };
