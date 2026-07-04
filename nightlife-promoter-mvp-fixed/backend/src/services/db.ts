type AnyRecord = Record<string, any>;

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function orderRows(rows: AnyRecord[], orderBy?: AnyRecord) {
  if (!orderBy) return rows;
  const [[field, direction]] = Object.entries(orderBy);
  return [...rows].sort((a, b) => {
    const av = new Date(a[field] ?? 0).getTime() || String(a[field] ?? '').localeCompare(String(b[field] ?? ''));
    const bv = new Date(b[field] ?? 0).getTime() || String(b[field] ?? '').localeCompare(String(a[field] ?? ''));
    return direction === 'desc' ? bv - av : av - bv;
  });
}

const store = {
  organizations: new Map<string, AnyRecord>(),
  events: [] as AnyRecord[],
  contacts: [] as AnyRecord[],
  campaigns: [] as AnyRecord[],
  integrations: [] as AnyRecord[]
};

function collection(key: keyof typeof store, prefix: string) {
  const rows = store[key] as AnyRecord[];
  return {
    findMany: async (args: AnyRecord = {}) => orderRows(rows, args.orderBy),
    count: async () => rows.length,
    create: async ({ data }: { data: AnyRecord }) => {
      const row = { id: makeId(prefix), createdAt: new Date(), updatedAt: new Date(), ...data };
      rows.push(row);
      return row;
    }
  };
}

export const prisma = {
  organization: {
    upsert: async ({ where, create, update }: AnyRecord) => {
      const id = where.id;
      const existing = store.organizations.get(id);
      if (existing) {
        const next = { ...existing, ...update, updatedAt: new Date() };
        store.organizations.set(id, next);
        return next;
      }
      const row = { createdAt: new Date(), updatedAt: new Date(), ...create };
      store.organizations.set(id, row);
      return row;
    }
  },
  event: collection('events', 'evt'),
  contact: collection('contacts', 'con'),
  campaign: collection('campaigns', 'cam'),
  integration: collection('integrations', 'int')
};
