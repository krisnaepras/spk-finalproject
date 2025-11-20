import type { TableHTMLAttributes, HTMLAttributes } from "react";

type TableProps = TableHTMLAttributes<HTMLTableElement>;
type TableSectionProps = HTMLAttributes<HTMLTableSectionElement>;
type TableCellProps = HTMLAttributes<HTMLTableCellElement> & { colSpan?: number; rowSpan?: number };

export const Table = ({ className = "", ...props }: TableProps) => (
  <table className={`w-full text-sm text-left ${className}`} {...props} />
);

export const THead = ({ className = "", ...props }: TableSectionProps) => (
  <thead className={`bg-slate-50 text-muted-foreground ${className}`} {...props} />
);

export const TBody = ({ className = "", ...props }: TableSectionProps) => (
  <tbody className={className} {...props} />
);

export const Th = ({ className = "", ...props }: TableCellProps) => (
  <th className={`h-12 px-4 align-middle font-medium ${className}`} {...props} />
);

export const Td = ({ className = "", ...props }: TableCellProps) => (
  <td className={`p-4 ${className}`} {...props} />
);
