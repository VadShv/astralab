import { AppShell } from "@/components/app-shell";
import { ViewRouter } from "@/components/view-router";
import { QueryProvider } from "@/components/query-provider";

export default function Page() {
  return (
    <QueryProvider>
      <AppShell>
        <ViewRouter />
      </AppShell>
    </QueryProvider>
  );
}
