// /llms.txt: the zh-TW edition (see src/llms.ts).
import type { APIRoute } from 'astro';
import { llmsTxt } from '../llms';

export const GET: APIRoute = () => llmsTxt('zh-TW');
