import { createFileRoute } from '@tanstack/react-router';
import { m } from "@/paraglide/messages.js";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Shield } from "lucide-react";

function AdminPage() {
  const usersQuery = useQuery({
    queryKey: ["admin-users-total"],
    queryFn: () => apiGet<{ total: number }>("/api/admin/users"),
  });
  const rolesQuery = useQuery({
    queryKey: ["admin-roles-total"],
    queryFn: () => apiGet<{ total: number }>("/api/admin/roles"),
  });

  const stats = {
    users: usersQuery.data?.total ?? 0,
    roles: rolesQuery.data?.total ?? 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{m["admin.title"]()}</h1>
        <p className="text-muted-foreground">{m["admin.description"]()}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{m["admin.stats.total_users"]()}</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{m["admin.stats.roles"]()}</CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.roles}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin/')({
  component: AdminPage,
});
