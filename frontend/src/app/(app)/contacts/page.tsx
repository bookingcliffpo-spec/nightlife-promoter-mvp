'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, Search, Trash2 } from 'lucide-react';
import { apiDownload, apiGet, apiSend } from '@/lib/api';
import { ContactFormDialog, type ContactRecord } from '@/components/contacts/ContactFormDialog';
import { CsvImportDialog } from '@/components/contacts/CsvImportDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface ContactRow extends ContactRecord {
  tags: { tag: { id: string; name: string; color: string } }[];
}

const PAGE_SIZE = 25;

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vipLevel, setVipLevel] = useState('ALL');
  const [loading, setLoading] = useState(true);

  function load(currentPage: number, currentSearch: string, currentVipLevel: string) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(currentPage), pageSize: String(PAGE_SIZE) });
    if (currentSearch) params.set('q', currentSearch);
    if (currentVipLevel !== 'ALL') params.set('vipLevel', currentVipLevel);
    apiGet(`/api/contacts?${params.toString()}`)
      .then((res) => {
        setContacts(res.contacts);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, vipLevel]);

  useEffect(() => {
    load(page, debouncedSearch, vipLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, vipLevel]);

  async function handleDelete(id: string) {
    if (!confirm('Remove this contact?')) return;
    try {
      await apiSend(`/api/contacts/${id}`, 'DELETE');
      load(page, debouncedSearch, vipLevel);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleExport() {
    try {
      const blob = await apiDownload('/api/contacts/export');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contacts / CRM</h1>
          <p className="text-sm text-muted-foreground">{total} contacts in your organization</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CsvImportDialog onImported={() => load(page, debouncedSearch, vipLevel)} />
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <ContactFormDialog onSaved={() => load(page, debouncedSearch, vipLevel)} />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, email, or phone…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={vipLevel} onValueChange={setVipLevel}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All VIP levels</SelectItem>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="SILVER">Silver</SelectItem>
              <SelectItem value="GOLD">Gold</SelectItem>
              <SelectItem value="PLATINUM">Platinum</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No contacts found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>VIP</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </TableCell>
                    <TableCell>{contact.email || '—'}</TableCell>
                    <TableCell>{contact.phone || '—'}</TableCell>
                    <TableCell>
                      {contact.vipLevel !== 'NONE' ? <Badge variant="warning">{contact.vipLevel}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((t) => (
                          <Badge key={t.tag.id} variant="secondary">
                            {t.tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <ContactFormDialog contact={contact} onSaved={() => load(page, debouncedSearch, vipLevel)} />
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(contact.id)} aria-label="Delete contact">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
