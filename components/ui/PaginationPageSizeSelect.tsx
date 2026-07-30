"use client";

import { useRouter } from "next/navigation";
import type { PageSizeSelectOption } from "@/src/lib/pagination";

type Props = {
  value: number;
  options: PageSizeSelectOption[];
  label?: string;
};

export function PaginationPageSizeSelect({
  value,
  options,
  label = "Por página",
}: Props) {
  const router = useRouter();

  return (
    <label className="pagination-nav__size-field">
      <span className="pagination-nav__size-label">{label}</span>
      <select
        className="select pagination-nav__size"
        value={value}
        aria-label={label}
        onChange={(e) => {
          const next = Number(e.target.value);
          const opt = options.find((o) => o.value === next);
          if (opt) router.push(opt.href);
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.value}
          </option>
        ))}
      </select>
    </label>
  );
}
