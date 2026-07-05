import { prisma } from '../lib/prisma.js';

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'event'
  );
}

export async function uniqueEventSlug(title: string) {
  const base = slugify(title);
  let slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
