import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	// One YAML file per shared project; files starting with "_" (the template) are skipped.
	showcase: defineCollection({
		loader: glob({ pattern: ['*.yaml', '!_*.yaml'], base: './src/data/showcase' }),
		schema: z.object({
			name: z.string().max(40),
			summary: z.string().max(100),
			url: z.url(),
			author: z.string().max(40),
			authorUrl: z.url().optional(),
			stages: z.array(z.number().int().min(0).max(19)).max(6).optional(),
			added: z.coerce.date(),
		}),
	}),
};
