import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireOpenAi } from '../lib/openai.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

const AI_MODEL = 'gpt-4o-mini';

async function complete(systemPrompt: string, userPrompt: string) {
  const client = requireOpenAi();
  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.9,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });
  return completion.choices[0]?.message?.content?.trim() ?? '';
}

async function logGeneration(params: {
  organizationId: string;
  userId: string;
  type: 'CAPTION' | 'HASHTAGS' | 'AD_COPY' | 'DESCRIPTION';
  prompt: string;
  result: string;
  eventId?: string;
}) {
  return prisma.aiGeneration.create({ data: params });
}

const CaptionSchema = z.object({
  eventTitle: z.string().min(1).max(160),
  vibe: z.string().max(200).optional(),
  offer: z.string().max(200).optional(),
  eventId: z.string().optional()
});

aiRouter.post(
  '/caption',
  asyncHandler(async (req, res) => {
    const parsed = CaptionSchema.parse(req.body);
    const prompt = `Event: ${parsed.eventTitle}\nVibe: ${parsed.vibe ?? 'upscale nightlife'}\nOffer: ${parsed.offer ?? 'none'}\n\nWrite 3 distinct, high-energy Instagram captions (each under 300 characters) promoting this nightlife event. Number them 1-3.`;
    const result = await complete(
      'You are an expert nightlife and hospitality social media copywriter. Write punchy, on-brand captions that drive RSVPs and ticket sales. Avoid cliches like "don\'t miss out".',
      prompt
    );
    await logGeneration({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      type: 'CAPTION',
      prompt,
      result,
      eventId: parsed.eventId
    });
    res.json({ result });
  })
);

const HashtagSchema = z.object({
  eventTitle: z.string().min(1).max(160),
  city: z.string().max(120).optional(),
  genre: z.string().max(120).optional(),
  eventId: z.string().optional()
});

aiRouter.post(
  '/hashtags',
  asyncHandler(async (req, res) => {
    const parsed = HashtagSchema.parse(req.body);
    const prompt = `Event: ${parsed.eventTitle}\nCity: ${parsed.city ?? 'not specified'}\nGenre/vibe: ${parsed.genre ?? 'nightlife'}\n\nGenerate 20 relevant Instagram/TikTok hashtags for this nightlife event, mixing broad nightlife tags, city/local tags, and niche genre tags. Return only the hashtags separated by spaces, each starting with #.`;
    const raw = await complete(
      'You are a nightlife social media growth expert who curates hashtag sets that maximize discoverability.',
      prompt
    );
    const hashtags = Array.from(new Set(raw.match(/#[\w]+/g) ?? []));
    await logGeneration({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      type: 'HASHTAGS',
      prompt,
      result: hashtags.join(' '),
      eventId: parsed.eventId
    });
    res.json({ hashtags });
  })
);

const AdCopySchema = z.object({
  eventTitle: z.string().min(1).max(160),
  audience: z.string().max(200).optional(),
  goal: z.enum(['ticket_sales', 'rsvp', 'table_bookings', 'brand_awareness']).default('ticket_sales'),
  offer: z.string().max(200).optional(),
  eventId: z.string().optional()
});

aiRouter.post(
  '/ad-copy',
  asyncHandler(async (req, res) => {
    const parsed = AdCopySchema.parse(req.body);
    const prompt = `Event: ${parsed.eventTitle}\nTarget audience: ${parsed.audience ?? 'young professionals 21-35'}\nCampaign goal: ${parsed.goal}\nOffer: ${parsed.offer ?? 'none'}\n\nWrite Meta/Instagram ad copy with: a primary text (under 125 characters), a headline (under 40 characters), and a description (under 30 characters). Label each clearly.`;
    const result = await complete(
      'You are a senior paid social media ads copywriter specializing in nightlife and event promotion with proven direct-response frameworks.',
      prompt
    );
    await logGeneration({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      type: 'AD_COPY',
      prompt,
      result,
      eventId: parsed.eventId
    });
    res.json({ result });
  })
);

const DescriptionSchema = z.object({
  eventTitle: z.string().min(1).max(160),
  venue: z.string().max(160).optional(),
  details: z.string().max(1000).optional(),
  eventId: z.string().optional()
});

aiRouter.post(
  '/description',
  asyncHandler(async (req, res) => {
    const parsed = DescriptionSchema.parse(req.body);
    const prompt = `Event: ${parsed.eventTitle}\nVenue: ${parsed.venue ?? 'not specified'}\nDetails: ${parsed.details ?? 'none provided'}\n\nWrite a compelling 150-250 word event description suitable for a ticketing page (like Eventbrite) that builds excitement and clearly communicates what guests can expect.`;
    const result = await complete(
      'You are an expert event marketer who writes vivid, conversion-focused event descriptions for ticketing platforms.',
      prompt
    );
    await logGeneration({
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      type: 'DESCRIPTION',
      prompt,
      result,
      eventId: parsed.eventId
    });
    res.json({ result });
  })
);

aiRouter.get(
  '/history',
  asyncHandler(async (req, res) => {
    const history = await prisma.aiGeneration.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(history);
  })
);
