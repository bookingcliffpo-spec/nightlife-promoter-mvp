import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { PaginationSchema, toSkipTake } from '../utils/pagination.js';

export const contactsRouter = Router();
contactsRouter.use(requireAuth);

const ContactInputSchema = z.object({
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  birthday: z.string().optional().nullable(),
  vipLevel: z.enum(['NONE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  notes: z.string().max(4000).optional(),
  customFields: z.record(z.any()).optional(),
  source: z.string().max(80).optional(),
  optedInEmail: z.boolean().optional(),
  optedInSms: z.boolean().optional(),
  tagIds: z.array(z.string()).optional()
});

const ListQuerySchema = PaginationSchema.extend({
  q: z.string().optional(),
  tagId: z.string().optional(),
  vipLevel: z.enum(['NONE', 'SILVER', 'GOLD', 'PLATINUM']).optional()
});

contactsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, tagId, vipLevel } = ListQuerySchema.parse(req.query);
    const where = {
      organizationId: req.auth!.organizationId,
      ...(vipLevel ? { vipLevel } : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' as const } },
              { lastName: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { phone: { contains: q, mode: 'insensitive' as const } }
            ]
          }
        : {})
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(page, pageSize)
      }),
      prisma.contact.count({ where })
    ]);

    res.json({ contacts, total, page, pageSize });
  })
);

contactsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const contacts = await prisma.contact.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const csv = stringify(
      contacts.map((c) => ({
        firstName: c.firstName ?? '',
        lastName: c.lastName ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        birthday: c.birthday ? c.birthday.toISOString().slice(0, 10) : '',
        vipLevel: c.vipLevel,
        tags: c.tags.map((t) => t.tag.name).join('|'),
        optedInEmail: c.optedInEmail,
        optedInSms: c.optedInSms,
        notes: c.notes ?? ''
      })),
      {
        header: true,
        columns: ['firstName', 'lastName', 'email', 'phone', 'birthday', 'vipLevel', 'tags', 'optedInEmail', 'optedInSms', 'notes']
      }
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.send(csv);
  })
);

const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

contactsRouter.post(
  '/import',
  importUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No CSV file uploaded');

    const records: Record<string, string>[] = parse(req.file.buffer, {
      columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true
    });

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of records.entries()) {
      const email = row.email?.trim() || undefined;
      const phone = row.phone?.trim() || undefined;
      if (!email && !phone) {
        skipped += 1;
        errors.push(`Row ${index + 2}: missing both email and phone, skipped.`);
        continue;
      }
      const vipLevel = ['NONE', 'SILVER', 'GOLD', 'PLATINUM'].includes((row.viplevel || '').toUpperCase())
        ? (row.viplevel.toUpperCase() as 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM')
        : 'NONE';

      await prisma.contact.create({
        data: {
          organizationId: req.auth!.organizationId,
          firstName: row.firstname || row['first name'] || undefined,
          lastName: row.lastname || row['last name'] || undefined,
          email,
          phone,
          birthday: row.birthday ? new Date(row.birthday) : undefined,
          vipLevel,
          notes: row.notes || undefined,
          source: 'csv_import',
          optedInEmail: row.optedinemail ? row.optedinemail.toLowerCase() !== 'false' : true,
          optedInSms: row.optedinsms ? row.optedinsms.toLowerCase() !== 'false' : true
        }
      });
      created += 1;
    }

    res.status(201).json({ created, skipped, errors });
  })
);

contactsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { tagIds, ...parsed } = ContactInputSchema.parse(req.body);
    const contact = await prisma.contact.create({
      data: {
        organizationId: req.auth!.organizationId,
        ...parsed,
        email: parsed.email || undefined,
        birthday: parsed.birthday ? new Date(parsed.birthday) : undefined,
        tags: tagIds?.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined
      },
      include: { tags: { include: { tag: true } } }
    });
    res.status(201).json(contact);
  })
);

contactsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { tagIds, ...parsed } = ContactInputSchema.partial().parse(req.body);
    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    });
    if (!existing) throw new HttpError(404, 'Contact not found');

    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        ...parsed,
        email: parsed.email || undefined,
        birthday: parsed.birthday ? new Date(parsed.birthday) : undefined,
        tags: tagIds ? { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } : undefined
      },
      include: { tags: { include: { tag: true } } }
    });
    res.json(contact);
  })
);

contactsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    });
    if (!existing) throw new HttpError(404, 'Contact not found');
    await prisma.contact.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export const tagsRouter = Router();
tagsRouter.use(requireAuth);

tagsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tags = await prisma.tag.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { contacts: true } } }
    });
    res.json(tags);
  })
);

const TagInputSchema = z.object({ name: z.string().min(1).max(60), color: z.string().max(20).optional() });

tagsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = TagInputSchema.parse(req.body);
    const tag = await prisma.tag.create({ data: { ...parsed, organizationId: req.auth!.organizationId } });
    res.status(201).json(tag);
  })
);

tagsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.tag.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    });
    if (!existing) throw new HttpError(404, 'Tag not found');
    await prisma.tag.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);
