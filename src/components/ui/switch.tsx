import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

function Switch({ className, label, id, ...props }: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-foreground", className)}
    >
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input id={id} type="checkbox" className="peer sr-only" {...props} />
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-border transition-colors",
            "peer-checked:bg-primary peer-disabled:opacity-50",
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            "peer-checked:translate-x-4",
          )}
        />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}

export { Switch };
