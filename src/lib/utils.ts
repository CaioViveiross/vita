import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Gera um id estável o suficiente para os mocks locais. */
export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Normaliza texto para busca: minúsculo e sem acentos. */
export function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function sortBy<T>(items: T[], key: (item: T) => string | number, dir: "asc" | "desc" = "asc"): T[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = key(a);
    const vb = key(b);
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    return 0;
  });
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Variação percentual entre dois períodos, protegida contra divisão por zero. */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}
