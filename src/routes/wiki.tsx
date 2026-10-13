import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Explorer = lazy(() => import("@/wiki-explorer/Explorer").then((m) => ({ default: m.Explorer })));

type WikiSearch = { page: string; section: string };

export const Route = createFileRoute("/wiki")({
  validateSearch: (search: Record<string, unknown>): WikiSearch => ({
    page: typeof search.page === "string" ? search.page : "",
    section: typeof search.section === "string" ? search.section : "",
  }),
  head: () => ({ meta: [{ title: "Wiki parity" }] }),
  component: WikiRoute,
});

function WikiRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Opening the wiki reader…</p>}>
      <Explorer
        page={search.page}
        section={search.section}
        onPage={(page, section) => {
          void navigate({ search: { page, section: section ?? "" } });
        }}
      />
    </Suspense>
  );
}
