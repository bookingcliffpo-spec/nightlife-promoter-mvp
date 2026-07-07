import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { supabaseAdmin } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from './errorHandler.js';

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'org'
  );
}

async function uniqueSlug(base: string) {
  let slug = slugify(base);
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
    attempt += 1;
    slug = `${slugify(base)}-${attempt}`;
  }
}

/**
 * Verifies the Supabase-issued JWT and lazily provisions a local
 * Organization + User row on a brand new account's first authenticated request.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing bearer token');
    }
    const token = header.slice('Bearer '.length);

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      throw new HttpError(401, 'Invalid or expired session');
    }

    const supabaseUser = data.user;
    let user = await prisma.user.findUnique({ where: { id: supabaseUser.id } });

    if (!user) {
      try {
        const name = (supabaseUser.user_metadata?.full_name as string) || (supabaseUser.user_metadata?.name as string) || null;
        const orgName = name ? `${name}'s Organization` : `${supabaseUser.email?.split('@')[0] ?? 'New'} Organization`;
        const slug = await uniqueSlug(orgName);

        const organization = await prisma.organization.create({
          data: {
            name: orgName,
            slug,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
        });

        user = await prisma.user.create({
          data: {
            id: supabaseUser.id,
            email: supabaseUser.email ?? '',
            name,
            avatarUrl: (supabaseUser.user_metadata?.avatar_url as string) ?? null,
            role: 'OWNER',
            organizationId: organization.id
          }
        });
      } catch (err) {
        // A brand new account's first page load fires several authenticated
        // requests in parallel (e.g. /api/me and /api/contacts at once), so
        // more than one can reach here simultaneously and race to create the
        // same user row. The loser hits a unique constraint violation — that
        // just means the winner already created it, so fetch it instead.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          user = await prisma.user.findUnique({ where: { id: supabaseUser.id } });
        }
        if (!user) throw err;
      }
    }

    req.auth = {
      supabaseUserId: supabaseUser.id,
      email: user.email,
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new HttpError(401, 'Authentication required'));
    }
    if (!roles.includes(req.auth.role)) {
      return next(new HttpError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}
