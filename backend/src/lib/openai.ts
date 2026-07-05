import OpenAI from 'openai';
import { env } from '../env.js';

export const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export class AiNotConfiguredError extends Error {
  constructor() {
    super('OPENAI_API_KEY is not configured on the server.');
    this.name = 'AiNotConfiguredError';
  }
}

export function requireOpenAi(): OpenAI {
  if (!openai) throw new AiNotConfiguredError();
  return openai;
}
