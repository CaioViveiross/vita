import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DateRange, ID, PeriodPreset } from "@/types";
import { rangeFromPreset, today } from "@/lib/date";

/**
 * Contexto de navegação: empresa e período selecionados no cabeçalho.
 * Fica separado dos dados porque é preferência de visualização, não domínio.
 *
 * A escolha sobrevive ao recarregamento. Antes não sobrevivia, e a tela de
 * configurações oferecia "empresa padrão" e "período padrão" que voltavam ao
 * inicial no próximo F5 — dois controles que prometiam ser preferência e se
 * comportavam como filtro de sessão.
 *
 * Fica no `localStorage` e não no banco porque é preferência de quem olha, não
 * dado da organização: a mesma pessoa pode querer abrir no notebook vendo o
 * grupo inteiro e no monitor da mesa vendo só uma empresa.
 */

export const ALL_COMPANIES = "all" as const;
export type CompanyScope = ID | typeof ALL_COMPANIES;

const SCOPE_KEY = "vita:company-scope";
const PERIOD_KEY = "vita:period";

const PERIOD_PRESETS: PeriodPreset[] = ["hoje", "7d", "30d", "90d", "mes", "custom"];

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    /* Aba anônima ou cota cheia: a preferência vale só para esta sessão. */
    return null;
  }
}

function store(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sem storage, a escolha continua valendo em memória.
  }
}

/**
 * `custom` é deliberadamente descartado na leitura.
 *
 * O intervalo personalizado em si não é guardado — um "de 3 a 17 de março"
 * salvo em janeiro não significa nada em julho. Sem o intervalo, restaurar o
 * preset `custom` cairia no `default` de `rangeFromPreset`, que devolve 30
 * dias: o usuário veria "Personalizado" escrito na tela sobre uma janela que
 * não foi ele quem escolheu. Melhor voltar ao padrão e dizer a verdade.
 */
function initialPeriod(): PeriodPreset {
  const stored = readStored(PERIOD_KEY) as PeriodPreset | null;
  if (!stored || stored === "custom" || !PERIOD_PRESETS.includes(stored)) return "30d";
  return stored;
}

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

  /* Lido na inicialização do estado, e não em efeito: em efeito, a primeira
     pintura mostraria o padrão e só depois trocaria para o que foi salvo. */
  const [companyScope, setCompanyScopeState] = useState<CompanyScope>(
    () => (readStored(SCOPE_KEY) as CompanyScope | null) ?? ALL_COMPANIES,
  );
  const [period, setPeriodState] = useState<PeriodPreset>(initialPeriod);
  const [customRange, setCustomRangeState] = useState<DateRange | null>(null);

  useEffect(() => store(SCOPE_KEY, companyScope), [companyScope]);
  useEffect(() => store(PERIOD_KEY, period), [period]);

  const range = useMemo<DateRange>(
    () => (period === "custom" && customRange ? customRange : rangeFromPreset(period, reference)),
    [period, customRange, reference],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      companyScope,
      setCompanyScope: setCompanyScopeState,
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
