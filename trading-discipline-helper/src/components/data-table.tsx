import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages.js";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  emptyText?: string;
  rowKey: (row: T) => string;
  onRefresh?: () => void | Promise<unknown>;
  loading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  searchPlaceholder,
  toolbar,
  emptyText,
  rowKey,
  onRefresh,
  loading,
}: DataTableProps<T>) {
  const [refreshing, setRefreshing] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Adapt the simple Column<T> shape to react-table column defs. Server-side
  // pagination stays fully controlled by the page/total props.
  const tableColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col, i) => ({
        id: String(i),
        header: () => col.header,
        cell: ({ row }) => col.cell(row.original),
        meta: { className: col.className },
      })),
    [columns]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
    getRowId: (row) => rowKey(row),
  });

  async function handleRefresh() {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  const showHeader = onSearchChange || toolbar || onRefresh;
  const busy = refreshing || loading;

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center gap-2">
          {onSearchChange && (
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder || m["common.search.placeholder"]()}
                className="pl-8 h-9"
              />
            </div>
          )}
          {toolbar}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              className="ml-auto size-9"
              onClick={handleRefresh}
              disabled={busy}
              aria-label={m["common.table.refresh"]()}
            >
              <RefreshCw className={cn("size-4", busy && "animate-spin")} />
            </Button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      (header.column.columnDef.meta as { className?: string })
                        ?.className
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  {emptyText || m["common.table.no_data"]()}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        (cell.column.columnDef.meta as { className?: string })
                          ?.className
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          {m["common.table.total"]({ count: total })}
        </p>
        {total > pageSize && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
              {m["common.table.previous"]()}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              {m["common.table.next"]()}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
