import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

export const Badge = ({ className = "", variant = "default", ...props }: BadgeProps) => {
  const variants = {
    default: "border-transparent bg-cyan-50 text-cyan-700 border border-cyan-200",
    secondary: "border-transparent bg-slate-100 text-slate-700",
    destructive: "border-transparent bg-red-50 text-red-700 border border-red-200",
    outline: "text-foreground border-slate-300",
    success: "border-transparent bg-emerald-50 text-emerald-700 border border-emerald-200",
  };

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  );
};
