import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-2 px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-canvas-overlay text-ink-muted",
        success: "bg-accent/20 text-accent",
        warn: "bg-warn/20 text-warn",
        danger: "bg-danger/20 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  pulse,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & { pulse?: boolean }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {pulse && <span className="h-2 w-2 animate-pulseDot rounded-full bg-current" />}
      {children}
    </span>
  );
}
