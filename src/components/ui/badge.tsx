import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
      secondary: "bg-secondary text-secondary-foreground",
      outline: "border border-border/80 bg-card/60 text-foreground",
      success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
      warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    }
  },
  defaultVariants: {
    variant: "secondary"
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
