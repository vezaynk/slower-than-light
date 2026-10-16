import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@stl/ui/tokens.css";
import "@stl/ui/chrome.css";
import { Stage } from "./Stage.tsx";
import "./stage.css";

const root = document.getElementById("root");
if (!root) throw new Error("reels root is missing");
createRoot(root).render(
  <StrictMode>
    <Stage />
  </StrictMode>,
);
