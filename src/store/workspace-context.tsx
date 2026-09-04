import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { DateRange, ID, PeriodPreset } from "@/types";
import { rangeFromPreset, today } from "@/lib/date";

/**
 * Contexto de navegação: empresa e período selecionados no cabeçalho.
 * Fica separado dos dados porque é preferência de visualização, não domínio.
 */

export const ALL_COMPANIES = "all" as const;
export type CompanyScope = ID | typeof ALL_COMPANIES;

interface WorkspaceContextValue {
  companyScope: CompanyScope;
  setCompanyScope: (scope: CompanyScope) => void;
  period: PeriodPreset;
  setPeriod: (preset: PeriodPreset) => void;
  range: DateRange;
  setCustomRange: (range: DateRange) => void;
  /** Data de referência de "hoje" — centralizada para facilitar testes. */
  reference: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const reference = useMemo(() => today(), []);
  const [companyScope, setCompanyScope] = useState<CompanyScope>(ALL_COMPANIES);
  const [period, setPeriodState] = useState<PeriodPreset>("30d");
  const [customRange, setCustomRangeState] = useState<DateRange | null>(null);

  const range = useMemo<DateRange>(
    () => (period === "custom" && customRange ? customRange : rangeFromPreset(period, reference)),
    [period, customRange, reference],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      companyScope,
      setCompanyScope,
      period,
      setPeriod: (preset) => {
        setPeriodState(preset);
        if (preset !== "custom") setCustomRangeState(null);
      },
      range,
      setCustomRange: (next) => {
        setCustomRangeState(next);
        setPeriodState("custom");
      },
      reference,
    }),
    [companyScope, period, range, reference],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace precisa estar dentro de <WorkspaceProvider>.");
  return context;
}
