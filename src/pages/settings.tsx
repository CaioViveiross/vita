import { toast } from "sonner";
import { CalendarClock, Database, Palette, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanySelector, PeriodSelector } from "@/components/common/selectors";
import { useFinance } from "@/store/finance-context";
import { useWorkspace } from "@/store/workspace-context";
import { useTheme, type ThemePreference } from "@/store/theme-context";
import { formatDate } from "@/lib/date";
import { brand } from "@/config/brand";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 py-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 pr-4">
        <Label className="text-[13.5px]">{label}</Label>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0 sm:w-[15rem]">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { companies, accounts, transactions, recurrences, categories, expenses, holidays, reload, loading } =
    useFinance();
  const { companyScope, setCompanyScope, period, setPeriod, reference } = useWorkspace();
  const { theme, setTheme } = useTheme();



  /*
   * Os feriados vêm do banco, e não mais da lista fixa do código: assim a tela
   * mostra também os regionais cadastrados por esta organização. O corte é a
   * data de referência do cabeçalho — "próximos" a partir de hoje, não de uma
   * data escrita à mão que envelhece sozinha.
   */
  const upcomingHolidays = holidays.filter((holiday) => holiday.date >= reference).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Preferências de visualização e dados da sua operação."
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" /> Preferências
              </CardTitle>
              <CardDescription>Como o sistema abre quando você entra pela manhã.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <SettingRow label="Tema" description="Aparência clara ou escura da interface.">
                <Select value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow
                label="Empresa padrão"
                description="Recorte aplicado ao dashboard e às listagens ao abrir o sistema."
              >
                <CompanySelector value={companyScope} onChange={setCompanyScope} />
              </SettingRow>

              <SettingRow label="Período padrão" description="Janela usada nos indicadores das listagens.">
                <PeriodSelector value={period} onChange={setPeriod} />
              </SettingRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" /> Dados
              </CardTitle>
              <CardDescription>
                Esta versão trabalha com dados de demonstração salvos no seu navegador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: "Empresas", value: companies.length },
                  { label: "Contas", value: accounts.length },
                  { label: "Categorias", value: categories.length },
                  { label: "Itens do plano", value: expenses.length },
                  { label: "Movimentações", value: transactions.length },
                  { label: "Recorrências", value: recurrences.length },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-muted/50 px-3.5 py-3">
                    <dt className="text-[12px] text-muted-foreground">{item.label}</dt>
                    <dd className="tabular mt-0.5 text-lg font-semibold">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col gap-3 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13.5px] font-medium">Recarregar do servidor</p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    Busca de novo tudo o que está gravado. Útil quando outra pessoa da organização
                    lançou algo enquanto esta aba estava aberta.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={async () => {
                    try {
                      await reload();
                      toast.success("Dados atualizados.");
                    } catch (cause) {
                      toast.error(
                        cause instanceof Error ? cause.message : "Não foi possível recarregar.",
                      );
                    }
                  }}
                  className="shrink-0"
                >
                  <RotateCcw /> {loading ? "Carregando…" : "Recarregar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" /> Calendário de feriados
              </CardTitle>
              <CardDescription>
                Base usada pelas recorrências para antecipar ou postergar vencimentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2.5">
                {upcomingHolidays.map((holiday) => (
                  <li key={`${holiday.date}-${holiday.name}`} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px]">{holiday.name}</span>
                      <span className="text-[12px] text-muted-foreground">Nacional</span>
                    </span>
                    <span className="tabular shrink-0 text-[13px] font-medium">{formatDate(holiday.date)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-border/60 pt-3 text-[12px] leading-relaxed text-muted-foreground">
                Feriados regionais e municipais entram numa próxima etapa — a estrutura já prevê os dois escopos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="brand-mark h-8 w-11 shrink-0 text-primary" role="img" aria-label={brand.name} />
              <div>
                <CardTitle>Sobre o {brand.name}</CardTitle>
                <CardDescription>{brand.tagline}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Versão</span>
                <Badge variant="muted">0.1.0 · MVP</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Origem dos dados</span>
                <Badge variant="info">Supabase</Badge>
              </div>
              <p className="border-t border-border/60 pt-3 leading-relaxed text-muted-foreground">
                Toda a camada de dados está isolada em um único módulo, e é por isso que a troca do
                armazenamento local pelo Supabase não exigiu mudar as telas.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
