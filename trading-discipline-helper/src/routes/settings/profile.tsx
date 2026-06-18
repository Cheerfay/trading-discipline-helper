import { createFileRoute } from '@tanstack/react-router';
import { m } from "@/paraglide/messages.js";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { SettingsForm } from "./-settings-form";

function SettingsPage() {
  const { data: user } = useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const data = await apiGet<{
        name?: string;
        email?: string;
        image?: string;
      }>("/api/user/info");
      return {
        name: data.name || "",
        email: data.email || "",
        image: data.image || "",
      };
    },
  });

  if (!user) {
    return (
      <div className="p-6 text-muted-foreground">{m["settings.profile.loading"]()}</div>
    );
  }

  return <SettingsForm name={user.name} email={user.email} image={user.image} />;
}

export const Route = createFileRoute('/settings/profile')({
  component: SettingsPage,
});
