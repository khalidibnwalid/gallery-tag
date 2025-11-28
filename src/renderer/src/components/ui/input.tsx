import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/50 border-input w-full min-w-0 rounded-xl border bg-transparent shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      size: {
        sm: "h-8 py-1 text-sm",
        default: "h-9 py-1 text-base",
        lg: "h-10 py-2 text-xl",
      },
      variant: {
        default: "",
        destructive: "border-destructive focus-visible:border-destructive",
        ghost: "border-transparent shadow-none",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

interface InputProps
  extends
    Omit<React.ComponentProps<"input">, "value" | "size">,
    VariantProps<typeof inputVariants> {
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

function Input({
  className,
  type,
  size,
  variant,
  startContent,
  endContent,
  value,
  onValueChange,
  onChange,
  ...props
}: InputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange?.(e.target.value);
    onChange?.(e);
  };

  if (startContent || endContent) {
    const baseSize = size === "lg" ? "px-3" : size === "sm" ? "px-2.5" : "px-3";
    const startPadding = startContent
      ? size === "lg"
        ? "ps-9"
        : size === "sm"
          ? "ps-8"
          : "ps-8"
      : baseSize;
    const endPadding = endContent
      ? size === "lg"
        ? "pe-9"
        : size === "sm"
          ? "pe-8"
          : "pe-8"
      : baseSize;

    return (
      <div className="relative">
        {startContent && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
              size === "lg"
                ? "ltr:left-3 rtl:right-3"
                : "ltr:left-3 rtl:right-3"
            )}
          >
            {startContent}
          </div>
        )}
        <input
          type={type}
          data-slot="input"
          value={value}
          onChange={handleChange}
          className={cn(
            inputVariants({ size, variant }),
            startPadding,
            endPadding,
            className,
          )}
          {...props}
        />
        {endContent && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
              size === "lg"
                ? "ltr:right-3 rtl:left-3"
                : "ltr:right-3 rtl:left-3"
            )}
          >
            {endContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      type={type}
      data-slot="input"
      value={value}
      onChange={handleChange}
      className={cn(inputVariants({ size, variant }), "px-3", className)}
      {...props}
    />
  );
}

export { Input };
