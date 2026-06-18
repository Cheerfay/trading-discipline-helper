import { createFileRoute } from '@tanstack/react-router';
import { tDynamic } from "@/core/i18n/dynamic";
import { m } from "@/paraglide/messages.js";
import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiGet, type PageResult } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import { cn } from "@/lib/utils";

interface Credit {
  id: string;
  userId: string;
  userEmail: string | null;
  transactionNo: string;
  transactionType: string;
  transactionScene: string | null;
  credits: number;
  remainingCredits: number;
  description: string | null;
  expiresAt: string | null;
  status: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

const TABS = ["all", "grant", "consume"] as const;
type Tab = (typeof TABS)[number];

function CreditsPage() {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch]);

  const query = useQuery({
    queryKey: ["admin-credits", page, tab, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (tab !== "all") params.set("transactionType", tab);
      if (debouncedSearch) params.set("search", debouncedSearch);
      return apiGet<PageResult<Credit>>(`/api/admin/credits?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const credits = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const columns: Column<Credit>[] = [
    {
      header: m["admin.credits.transaction_no"](),
      cell: (c) => <span className="font-mono text-xs">{c.transactionNo}</span>,
    },
    {
      header: m["admin.credits.user"](),
      cell: (c) => <span className="text-sm">{c.userEmail || c.userId}</span>,
    },
    {
      header: m["admin.credits.amount"](),
      cell: (c) => (
        <span className={cn("font-medium", c.credits > 0 ? "text-green-600" : "text-red-500")}>
          {c.credits > 0 ? `+${c.credits}` : c.credits}
        </span>
      ),
    },
    {
      header: m["admin.credits.remaining"](),
      cell: (c) => c.remainingCredits,
    },
    {
      header: m["admin.credits.type"](),
      cell: (c) => c.transactionType,
    },
    {
      header: m["admin.credits.scene"](),
      cell: (c) => c.transactionScene || "—",
    },
    {
      header: m["admin.credits.description"](),
      cell: (c) => (
        <span className="text-muted-foreground text-sm max-w-[200px] truncate block">
          {c.description || "—"}
        </span>
      ),
    },
    {
      header: m["admin.credits.expires_at"](),
      cell: (c) => (
        <span className="text-muted-foreground text-sm">
          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      header: m["admin.credits.created_at"](),
      cell: (c) => (
        <span className="text-muted-foreground text-sm">
          {new Date(c.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{m["admin.credits.title"]()}</h1>
        <p className="text-muted-foreground">{m["admin.credits.description"]()}</p>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto overflow-y-hidden">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
              tab === tb
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tDynamic(`admin.credits.tab_${tb}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={credits}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(c) => c.id}
            emptyText={m["admin.credits.no_credits"]()}
            search={search}
            onSearchChange={setSearch}
            onRefresh={() => query.refetch()}
            loading={query.isFetching}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/admin/credits')({
  component: CreditsPage,
});
