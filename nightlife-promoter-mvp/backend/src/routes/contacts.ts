import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db.js';

export const contactsRouter = Router();

const ContactSchema = z.object({
  organizationId: z.string().default('demo-org'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  optedIn: z.boolean().default(true)
});

contactsRouter.get('/', async (_req, res) => {
  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
  res.json(contacts);
});

contactsRouter.post('/', async (req, res) => {
  const parsed = ContactSchema.parse(req.body);
  await prisma.organization.upsert({ where: { id: parsed.organizationId }, update: {}, create: { id: parsed.organizationId, name: 'Demo Nightlife Group' } });
  const contact = await prisma.contact.create({ data: parsed });
  res.status(201).json(contact);
});
