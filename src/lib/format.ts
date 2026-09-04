const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `R$ 10.500,00` */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** `R$ 10,5 mil` — usado em eixos de gráfico e espaços estreitos. */
export function formatCompactCurrency(value: number): string {
  return `R$ ${compactFormatter.format(value)}`;
}

/** `10.500,00` — sem o símbolo, para inputs. */
export function formatAmount(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  const signal = value > 0 ? "+" : "";
  return `${signal}${value.toFixed(digits).replace(".", ",")}%`;
}

/** Converte a digitação de um campo monetário em número. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatTaxId(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Mostra apenas os quatro últimos dígitos: `****1234`. */
export function maskAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `****${digits.slice(-4)}`;
}
