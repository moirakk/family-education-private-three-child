import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    className={cn(
      "flex h-11 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-base focus:outline-none sm:h-10 sm:text-sm focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
);

const SelectContent = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content className={cn("z-50 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md", className)} {...props}>
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);

const SelectItem = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-muted", className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
