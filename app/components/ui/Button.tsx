import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "bg-gradient-to-r from-sky-500 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:scale-[1.02] border border-transparent",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md",
      ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-700",
      destructive: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 hover:shadow-md",
      outline: "border border-border bg-white hover:bg-slate-50 hover:border-slate-300 text-foreground shadow-sm",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-8 text-base",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
