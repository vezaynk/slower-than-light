import { type ReactNode } from "react";

export type KickerTag = "p" | "h1" | "h2" | "h3" | "span";

export type KickerProps = {
  as?: KickerTag;
  className?: string;
  children: ReactNode;
};

export function Kicker({ as: Tag = "p", className, children }: KickerProps) {
  return <Tag className={["kicker", className].filter(Boolean).join(" ")}>{children}</Tag>;
}
