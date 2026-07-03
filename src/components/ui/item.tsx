import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const itemVariants = cva(
  "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
  {
    variants: {
      variant: {
        default: "border-border bg-background",
        active: "border-primary bg-primary/5 text-primary",
        disabled: "border-border bg-muted opacity-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof itemVariants> {
  icon?: React.ReactNode
  title: string
  description?: string
}

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ className, variant, icon, title, description, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(itemVariants({ variant }), className)}
        {...props}
      >
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="flex flex-col">
          <span className="font-medium">{title}</span>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      </div>
    )
  }
)
Item.displayName = "Item"

export { Item, itemVariants }
