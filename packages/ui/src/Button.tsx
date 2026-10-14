import { type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "ghost" | "text";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  text: "text-btn",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "ghost", className, type = "button", ...rest }: ButtonProps) {
  const cls = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return <button type={type} className={cls} {...rest} />;
}
