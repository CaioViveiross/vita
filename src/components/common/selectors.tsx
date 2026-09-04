import { Building2, CalendarRange, Landmark, Receipt, Wallet } from "lucide-react";
import type { ID, PeriodPreset } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/common/multi-select";
import { useFinance } from "@/store/finance-context";
import { ALL_COMPANIES, type CompanyScope } from "@/store/workspace-context";
import { PERIOD_LABELS } from "@/lib/date";
import { maskAccountNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Empresa                                                                     */
/* -------------------------------------------------------------------------- */

export interface CompanySelectorProps {
  value: CompanyScope;
  onChange: (value: CompanyScope) => void;
  /** Inclui a opção "Todas as empresas". */
  allowAll?: boolean;
  className?: string;
  placeholder?: string;
}

export function CompanySelector({
  value,
  onChange,
  allowAll = true,
  className,
  placeholder = "Selecione a empresa",
}: CompanySelectorProps) {
  const { companies } = useFinance();

  return (
    <Select value={value} onValueChange={(next) => onChange(next as CompanyScope)}>
      <SelectTrigger className={cn("gap-2", className)}>
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground/80" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && (
          <>
            <SelectItem value={ALL_COMPANIES}>Todas as empresas</SelectItem>
            <SelectSeparator />
          </>
        )}
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* -------------------------------------------------------------------------- */
/* Conta                                                                       */
/* -------------------------------------------------------------------------- */

export interface AccountSelectorProps {
  value: ID | "all" | "";
  onChange: (value: string) => void;
  /** Restringe as contas às da empresa informada. */
  companyId?: CompanyScope;
  allowAll?: boolean;
  className?: string;
  placeholder?: string;
}

export function AccountSelector({
  value,
  onChange,
  companyId,
  allowAll = true,
  className,
  placeholder = "Selecione a conta",
}: AccountSelectorProps) {
  const { accounts } = useFinance();
  const visible =
    companyId && companyId !== ALL_COMPANIES
      ? accounts.filter((account) => account.companyId === companyId)
      : accounts;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("gap-2", className)}>
        <Wallet className="h-4 w-4 shrink-0 text-muted-foreground/80" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && (
          <>
            <SelectItem value="all">Todas as contas</SelectItem>
            <SelectSeparator />
          </>
        )}
        {visible.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name} · {maskAccountNumber(account.number)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* -------------------------------------------------------------------------- */
/* Categoria                                                                   */
/* -------------------------------------------------------------------------- */

export interface CategorySelectorProps {
  value: ID | "all" | "";
  onChange: (value: string) => void;
  /** Filtra por natureza da categoria — evita oferecer receita numa saída. */
  kind?: "entrada" | "saida";
  allowAll?: boolean;
  className?: string;
  placeholder?: string;
}

export function CategorySelector({
  value,
  onChange,
  kind,
  allowAll = true,
  className,
  placeholder = "Selecione a categoria",
}: CategorySelectorProps) {
  const { categories } = useFinance();
  const visible = kind ? categories.filter((category) => category.kind === kind) : categories;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("gap-2", className)}>
        <Landmark className="h-4 w-4 shrink-0 text-muted-foreground/80" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && (
          <>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectSeparator />
          </>
        )}
        {visible.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* -------------------------------------------------------------------------- */
/* Versões de filtro (seleção múltipla)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Os seletores acima continuam de escolha única porque servem a formulários,
 * onde o lançamento tem uma conta e uma categoria. Os de baixo são para
 * filtrar listas, onde faz sentido combinar várias opções — e seleção vazia
 * significa "todas".
 */

export interface MultiFilterProps {
  selected: ID[];
  onChange: (values: ID[]) => void;
  className?: string;
}

export function AccountMultiSelect({ selected, onChange, className }: MultiFilterProps) {
  const { accounts } = useFinance();

  return (
    <MultiSelect
      options={accounts.map((account) => ({
        value: account.id,
        label: account.name,
        hint: maskAccountNumber(account.number),
      }))}
      selected={selected}
      onChange={onChange}
      allLabel="Todas as contas"
      countLabel="contas"
      icon={Wallet}
      className={className}
    />
  );
}

export interface ExpenseMultiSelectProps extends MultiFilterProps {
  /**
   * Categorias escolhidas no filtro ao lado. Com alguma marcada, só as
   * despesas dela são oferecidas; vazio, a lista traz todas.
   */
  categoryIds?: ID[];
}

export function ExpenseMultiSelect({ selected, onChange, categoryIds = [], className }: ExpenseMultiSelectProps) {
  const { expenses, categories } = useFinance();
  const visible =
    categoryIds.length > 0 ? expenses.filter((expense) => categoryIds.includes(expense.categoryId)) : expenses;

  return (
    <MultiSelect
      options={visible.map((expense) => ({
        value: expense.id,
        label: expense.name,
        // A categoria vem junto porque nomes de item se repetem entre
        // categorias ("Manutenção" em Imóvel e em Frota, por exemplo).
        hint: categories.find((category) => category.id === expense.categoryId)?.name,
      }))}
      selected={selected}
      onChange={onChange}
      allLabel="Todas as despesas"
      countLabel="despesas"
      icon={Receipt}
      className={className}
    />
  );
}

export interface CategoryMultiSelectProps extends MultiFilterProps {
  /** Filtra por natureza da categoria. */
  kind?: "entrada" | "saida";
}

export function CategoryMultiSelect({ selected, onChange, kind, className }: CategoryMultiSelectProps) {
  const { categories } = useFinance();
  const visible = kind ? categories.filter((category) => category.kind === kind) : categories;

  return (
    <MultiSelect
      options={visible.map((category) => ({ value: category.id, label: category.name }))}
      selected={selected}
      onChange={onChange}
      allLabel="Todas as categorias"
      countLabel="categorias"
      icon={Landmark}
      className={className}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Período                                                                     */
/* -------------------------------------------------------------------------- */

const PERIOD_OPTIONS: PeriodPreset[] = ["hoje", "7d", "30d", "90d", "mes"];

export interface PeriodSelectorProps {
  value: PeriodPreset;
  onChange: (value: PeriodPreset) => void;
  className?: string;
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as PeriodPreset)}>
      <SelectTrigger className={cn("gap-2", className)}>
        <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground/80" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map((preset) => (
          <SelectItem key={preset} value={preset}>
            {PERIOD_LABELS[preset]}
          </SelectItem>
        ))}
        {value === "custom" && <SelectItem value="custom">{PERIOD_LABELS.custom}</SelectItem>}
      </SelectContent>
    </Select>
  );
}
