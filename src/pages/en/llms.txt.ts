// /en/llms.txt: the English edition (see src/llms.ts).
import type { APIRoute } from 'astro';
import { llmsTxt } from '../../llms';

export const GET: APIRoute = () => llmsTxt('en');
