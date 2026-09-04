import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ISODate, Transaction } from "@/types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, eachDay, formatShortDate, MONTHS_SHORT, toDate } from "@/lib/date";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { cn, sum } from "@/lib/utils";

/**
 * Paleta do gráfico.
 *
 * As três cores foram validadas para separação sob deuteranopia e protanopia.
 * Ainda assim, a leitura nunca depende só da cor: entradas e saídas usam barras
 * lado a lado e o resultado usa linha, além da legenda sempre visível.
 */
const SERIES = {
  entradas: { color: "#0e9f6e", label: "Entradas" },
  saidas: { color: "#e02424", label: "Saídas" },
  resultado: { color: "#1c64f2", label: "Resultado" },
} as const;

type SeriesKey = keyof typeof SERIES;

export type ChartRange = "7" | "30" | "90";

const RANGE_LABELS: Record<ChartRange, string> = {
  "7": "7 dias",
  "30": "30 dias",
  "90": "90 dias",
};

interface Bucket {
  key: string;
  label: string;
  /** Intervalo coberto pelo agrupamento — exibido no tooltip. */
  caption: string;
  entradas: number;
  saidas: number;
  resultado: number;
}

/**
 * Agrupa os lançamentos em barras legíveis: dia a dia em janelas curtas e por
 * semana em 90 dias, para que as barras nunca fiquem finas demais.
 */
function buildBuckets(transactions: Transaction[], from: ISODate, days: number): Bucket[] {
  const step = days > 45 ? 7 : 1;
  const dates = eachDay({ from, to: addDays(from, days - 1) });
  const buckets: Bucket[] = [];

  for (let index = 0; index < dates.length; index += step) {
    const slice = dates.slice(index, index + step);
    const inSlice = transactions.filter((item) => slice.includes(item.dueDate));
    const entradas = sum(inSlice.filter((item) => item.type === "entrada").map((item) => item.amount));
    const saidas = sum(inSlice.filter((item) => item.type === "saida").map((item) => item.amount));
    const first = slice[0];
    const last = slice[slice.length - 1];

    buckets.push({
      key: first,
      label: step === 1 ? formatShortDate(first) : `${toDate(first).getDate()} ${MONTHS_SHORT[toDate(first).getMonth()]}`,
      caption: step === 1 ? formatShortDate(first) : `${formatShortDate(first)} – ${formatShortDate(last)}`,
      entradas,
      saidas,
      resultado: entradas - saidas,
    });
  }

  return buckets;
}

interface TooltipPayloadItem {
  dataKey: SeriesKey;
  payload: Bucket;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-pop">
      <p className="mb-2 text-[12px] font-medium text-muted-foreground">{bucket.caption}</p>
      <ul className="space-y-1.5">
        {(Object.keys(SERIES) as SeriesKey[]).map((key) => (
          <li key={key} className="flex items-center justify-between gap-6 text-[13px]">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES[key].color }} />
              {SERIES[key].label}
            </span>
            <span className="tabular font-medium text-foreground">{formatCurrency(bucket[key])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface FinancialChartProps {
  transactions: Transaction[];
  /** Primeiro dia da janela — normalmente hoje. */
  from: ISODate;
  className?: string;
}

export function FinancialChart({ transactions, from, className }: FinancialChartProps) {
  const [range, setRange] = useState<ChartRange>("30");
  const [hidden, setHidden] = useState<SeriesKey[]>([]);

  const data = useMemo(
    () => buildBuckets(transactions, from, Number(range)),
    [transactions, from, range],
  );

  const totals = useMemo(
    () => ({
      entradas: sum(data.map((bucket) => bucket.entradas)),
      saidas: sum(data.map((bucket) => bucket.saidas)),
      resultado: sum(data.map((bucket) => bucket.resultado)),
    }),
    [data],
  );

  const toggle = (key: SeriesKey) =>
    setHidden((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );

  const visible = (key: SeriesKey) => !hidden.includes(key);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Fluxo financeiro</CardTitle>
          <CardDescription>Entradas, saídas e resultado previsto no período.</CardDescription>
        </div>
        <Tabs value={range} onValueChange={(value) => setRange(value as ChartRange)}>
          <TabsList>
            {(Object.keys(RANGE_LABELS) as ChartRange[]).map((option) => (
              <TabsTrigger key={option} value={option}>
                {RANGE_LABELS[option]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <div className="px-5 sm:px-6">
        {/* Legenda: também funciona como filtro das séries. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/60 pb-4">
          {(Object.keys(SERIES) as SeriesKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={cn(
                "flex items-center gap-2 rounded-lg text-left transition-opacity duration-200",
                !visible(key) && "opacity-40",
              )}
              aria-pressed={visible(key)}
            >
              <span
                className={cn("h-2.5 w-2.5 shrink-0", key === "resultado" ? "h-0.5 w-4 rounded-full" : "rounded-sm")}
                style={{ backgroundColor: SERIES[key].color }}
              />
              <span className="text-[12.5px] text-muted-foreground">{SERIES[key].label}</span>
              <span className="tabular text-[13px] font-semibold text-foreground">
                {formatCompactCurrency(totals[key])}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* A animação é curta de propósito: o gráfico é redesenhado a cada
          troca de empresa, período ou série, e uma entrada longa vira ruído. */}
      <div className="h-[17rem] px-2 py-4 sm:h-[19rem] sm:px-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="hsl(165 14% 91%)" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              // O Recharts esconde rótulos até respeitar este espaçamento —
              // resolve a colisão no celular sem precisar medir a tela.
              interval="preserveStartEnd"
              minTickGap={28}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 11.5, fill: "hsl(170 8% 46%)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tickMargin={4}
              tick={{ fontSize: 11.5, fill: "hsl(170 8% 46%)" }}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "hsl(160 16% 96%)", radius: 6 }}
            />
            {visible("entradas") && (
              <Bar
                dataKey="entradas"
                fill={SERIES.entradas.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                animationDuration={220}
              />
            )}
            {visible("saidas") && (
              <Bar
                dataKey="saidas"
                fill={SERIES.saidas.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                animationDuration={220}
              />
            )}
            {visible("resultado") && (
              <Line
                type="monotone"
                dataKey="resultado"
                stroke={SERIES.resultado.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                animationDuration={220}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
