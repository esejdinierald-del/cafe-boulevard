import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 
          "gradient-primary text-white shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-float)] hover:scale-105 active:scale-95 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        
        gold: 
          "gradient-gold text-foreground shadow-[var(--shadow-gold)] hover:shadow-[var(--shadow-float)] hover:scale-105 active:scale-95 font-bold relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        
        burgundy:
          "gradient-burgundy text-white shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-float)] hover:scale-105 active:scale-95 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        
        premium:
          "glass-premium hover:glass-dark text-foreground hover:text-white shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-float)] hover:scale-105 active:scale-95 border-2",
        
        waiter: 
          "gradient-primary text-white shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-float)] hover:scale-105 active:scale-95 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        
        bill: 
          "gradient-gold text-foreground shadow-[var(--shadow-gold)] hover:shadow-[var(--shadow-float)] hover:scale-105 active:scale-95 font-bold relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        
        destructive: 
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl",
        
        outline: 
          "border-2 border-border bg-transparent hover:bg-accent hover:text-accent-foreground shadow-md hover:shadow-lg",
        
        secondary: 
          "gradient-burgundy text-white shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-float)] hover:scale-105 active:scale-95",
        
        ghost: 
          "hover:bg-accent hover:text-accent-foreground",
        
        link: 
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-xl px-4 text-xs",
        lg: "h-16 rounded-3xl px-10 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const resolvedType = asChild ? type : (type ?? "button");
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} type={resolvedType} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
