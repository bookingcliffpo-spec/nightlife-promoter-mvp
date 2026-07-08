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

const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

type ImportedContact = {
  organizationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthday?: Date;
  vipLevel: 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  notes?: string;
  source: string;
  optedInEmail: boolean;
  optedInSms: boolean;
};

const numberedEmailHeaders = Array.from({ length: 10 }, (_, index) => `email ${index + 1} value`);
const numberedDashedEmailHeaders = Array.from({ length: 10 }, (_, index) => `e-mail ${index + 1} value`);
const numberedPhoneHeaders = Array.from({ length: 10 }, (_, index) => `phone ${index + 1} value`);

const firstNameHeaders = [
  'firstName',
  'first name',
  'first_name',
  'given name',
  'givenname',
  'given_name',
  'given',
  'name first'
];

const lastNameHeaders = [
  'lastName',
  'last name',
  'last_name',
  'family name',
  'familyname',
  'family_name',
  'surname',
  'last',
  'name last'
];

const fullNameHeaders = ['name', 'full name', 'fullname', 'display name', 'displayname', 'contact name', 'file as'];

const emailHeaders = [
  'email',
  'e-mail',
  'email address',
  'e-mail address',
  'primary email',
  'home email',
  'work email',
  'other email',
  ...numberedEmailHeaders,
  ...numberedDashedEmailHeaders
];

const phoneHeaders = [
  'phone',
  'phone number',
  'primary phone',
  'mobile',
  'mobile phone',
  'cell',
  'cell phone',
  'cellphone',
  'telephone',
  'tel',
  'home phone',
  'work phone',
  'business phone',
  'other phone',
  ...numberedPhoneHeaders
];

const birthdayHeaders = ['birthday', 'birth day', 'birthdate', 'birth date', 'date of birth', 'dob'];
const vipHeaders = ['vipLevel', 'vip level', 'vip', 'tier', 'level'];
const notesHeaders = ['notes', 'note', 'description', 'memo', 'comments'];
const optedInEmailHeaders = ['optedInEmail', 'opted in email', 'email opt in', 'email consent', 'subscribed email'];
const optedInSmsHeaders = ['optedInSms', 'opted in sms', 'sms opt in', 'sms consent', 'subscribed sms', 'text opt in'];

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function cleanCsvValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(cleanCsvValues);
  if (value === null || value === undefined) return [];

  const cleaned = String(value).replace(/\u0000/g, '').trim();
  return cleaned ? [cleaned] : [];
}

function normalizeCsvRow(row: Record<string, unknown>) {
  const normalized = new Map<string, string[]>();

  for (const [header, value] of Object.entries(row)) {
    const key = normalizeHeader(header);
    if (!key) continue;

    const values = cleanCsvValues(value);
    if (!values.length) continue;

    normalized.set(key, [...(normalized.get(key) ?? []), ...values]);
  }

  return normalized;
}

function getCsvRowValues(row: Record<string, unknown>) {
  return Object.values(row).flatMap(cleanCsvValues);
}

function pickValue(row: Map<string, string[]>, headers: string[]) {
  const seen = new Set<string>();

  for (const header of headers) {
    const key = normalizeHeader(header);
    if (seen.has(key)) continue;
    seen.add(key);

    const value = row.get(key)?.find(Boolean);
    if (value) return value;
  }

  return undefined;
}

function normalizeEmail(value?: string) {
  const match = value?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0].toLowerCase();
}

function isPhoneLike(value: string) {
  const cleaned = value.trim();
  if (!cleaned || normalizeEmail(cleaned)) return false;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(cleaned)) return false;
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(cleaned)) return false;

  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 20) return false;

  return /^[+()\d\s.-]*(?:\s*(?:x|ext\.?|extension)\s*\d+)?$/i.test(cleaned);
}

function splitName(value?: string): { firstName?: string; lastName?: string } {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  if (!cleaned) return {};

  if (cleaned.includes(',')) {
    const [lastName, ...rest] = cleaned.split(',').map((part) => part.trim()).filter(Boolean);
    const firstName = rest.join(' ') || undefined;
    return { firstName, lastName: lastName || undefined };
  }

  const [firstName, ...rest] = cleaned.split(' ');
  return { firstName, lastName: rest.length ? rest.join(' ') : undefined };
}

function findEmailInValues(values: string[]) {
  for (const value of values) {
    const email = normalizeEmail(value);
    if (email) return email;
  }

  return undefined;
}

function findPhoneInValues(values: string[]) {
  return values.find(isPhoneLike);
}

function findFallbackName(values: string[], email?: string, phone?: string) {
  const phoneDigits = phone?.replace(/\D/g, '');

  return values.find((value) => {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length > 120) return false;
    if (email && normalizeEmail(cleaned) === email) return false;
    if (phoneDigits && cleaned.replace(/\D/g, '') === phoneDigits) return false;
    if (normalizeEmail(cleaned) || isPhoneLike(cleaned)) return false;
    if (/^(true|false|yes|no|home|work|mobile|other|cell|main)$/i.test(cleaned)) return false;

    return /[a-z]/i.test(cleaned);
  });
}

function parseBirthday(value?: string) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseOptIn(value?: string) {
  if (!value) return true;

  const normalized = normalizeHeader(value);
  if (['false', '0', 'no', 'n', 'off', 'optout', 'optedout', 'unsubscribed', 'donotcontact'].includes(normalized)) {
    return false;
  }
  if (['true', '1', 'yes', 'y', 'on', 'optin', 'optedin', 'subscribed'].includes(normalized)) return true;

  return true;
}

function parseVipLevel(value?: string): ImportedContact['vipLevel'] {
  const normalized = normalizeHeader(value ?? '');
  if (normalized === 'silver') return 'SILVER';
  if (normalized === 'gold') return 'GOLD';
  if (normalized === 'platinum') return 'PLATINUM';

  return 'NONE';
}

function buildImportedContact(row: Record<string, unknown>, organizationId: string): ImportedContact | null {
  const normalized = normalizeCsvRow(row);
  const rowValues = getCsvRowValues(row);
  const email = normalizeEmail(pickValue(normalized, emailHeaders)) ?? findEmailInValues(rowValues);
  const phone = pickValue(normalized, phoneHeaders) ?? findPhoneInValues(rowValues);

  if (!email && !phone) return null;

  const fullName = pickValue(normalized, fullNameHeaders) ?? findFallbackName(rowValues, email, phone);
  const split = splitName(fullName);

  return {
    organizationId,
    firstName: pickValue(normalized, firstNameHeaders) ?? split.firstName,
    lastName: pickValue(normalized, lastNameHeaders) ?? split.lastName,
    email,
    phone,
    birthday: parseBirthday(pickValue(normalized, birthdayHeaders)),
    vipLevel: parseVipLevel(pickValue(normalized, vipHeaders)),
    notes: pickValue(normalized, notesHeaders),
    source: 'csv_import',
    optedInEmail: parseOptIn(pickValue(normalized, optedInEmailHeaders)),
    optedInSms: parseOptIn(pickValue(normalized, optedInSmsHeaders))
  };
}

contactsRouter.post(
  '/import',
  importUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No CSV file uploaded');

    const records: Record<string, unknown>[] = parse(req.file.buffer, {
      bom: true,
      columns: true,
      delimiter: [',', ';', '\t'],
      group_columns_by_name: true,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
      trim: true
    });

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const contactsToCreate: ImportedContact[] = [];

    for (const [index, row] of records.entries()) {
      const contact = buildImportedContact(row, req.auth!.organizationId);
      if (!contact) {
        skipped += 1;
        if (errors.length < 50) errors.push(`Row ${index + 2}: missing both email and phone, skipped.`);
        continue;
      }

      contactsToCreate.push(contact);
    }

    for (let index = 0; index < contactsToCreate.length; index += 500) {
      const result = await prisma.contact.createMany({ data: contactsToCreate.slice(index, index + 500) });
      created += result.count;
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
