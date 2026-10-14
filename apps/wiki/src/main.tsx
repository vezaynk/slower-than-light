import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@stl/ui/tokens.css";
import "@stl/ui/chrome.css";
import { Explorer } from "./Explorer.tsx";

function readSearch() {
  const q = new URLSearchParams(location.search);
  return { page: q.get("page") ?? "", section: q.get("section") ?? "" };
}

function App() {
  const [search, setSearch] = useState(readSearch);
  useEffect(() => {
    const onPop = () => setSearch(readSearch());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return (
    <Explorer
      page={search.page}
      section={search.section}
      onPage={(page, section) => {
        const q = new URLSearchParams();
        if (page) q.set("page", page);
        if (section) q.set("section", section);
        const next = q.toString();
        history.pushState(null, "", next ? `?${next}` : location.pathname);
        setSearch({ page, section: section ?? "" });
      }}
    />
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("wiki explorer root is missing");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
