import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        supabaseUserId: string;
        email: string;
        userId: string;
        organizationId: string;
        role: Role;
      };
    }
  }
}

export {};
