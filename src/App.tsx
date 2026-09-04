import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthGate } from "@/components/layout/auth-gate";
import { ThemeProvider } from "@/store/theme-context";
import { AuthProvider } from "@/store/auth-context";
import { FinanceProvider } from "@/store/finance-context";
import { WorkspaceProvider } from "@/store/workspace-context";
import { BalanceWatchProvider } from "@/store/balance-watch-context";
import { DashboardPage } from "@/pages/dashboard";
import { TransactionsPage } from "@/pages/transactions";
import { AccountsPage } from "@/pages/accounts";
import { CompaniesPage } from "@/pages/companies";
import { ChartOfAccountsPage } from "@/pages/chart-of-accounts";
import { SettingsPage } from "@/pages/settings";
import { ProfilePage } from "@/pages/profile";
import { NotFoundPage } from "@/pages/not-found";

export default function App() {
  return (
    <ThemeProvider>
      {/* AuthProvider por fora de FinanceProvider: é a organização ativa que
          decide o que carregar, e é a sessão que o RLS exige para permitir. */}
      <AuthProvider>
        <FinanceProvider>
          <WorkspaceProvider>
            <BalanceWatchProvider>
              <TooltipProvider delayDuration={300} skipDelayDuration={300}>
                {/* O portão fica dentro dos provedores e fora das rotas: as
                    telas só montam quando já existe sessão e organização. */}
                <AuthGate>
                  <BrowserRouter>
                    <Routes>
                      <Route element={<AppLayout />}>
                        <Route index element={<DashboardPage />} />
                        <Route path="movimentacoes" element={<TransactionsPage />} />
                        <Route path="contas" element={<AccountsPage />} />
                        <Route path="empresas" element={<CompaniesPage />} />
                        <Route path="plano-de-contas" element={<ChartOfAccountsPage />} />
                        {/* As recorrências não têm tela própria: vivem entre as movimentações. */}
                        <Route path="recorrencias" element={<Navigate to="/movimentacoes" replace />} />
                        <Route path="configuracoes" element={<SettingsPage />} />
                        <Route path="perfil" element={<ProfilePage />} />
                        <Route path="dashboard" element={<Navigate to="/" replace />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Route>
                    </Routes>
                  </BrowserRouter>
                </AuthGate>

                {/* No topo porque o canto inferior direito é do balão de saldo, que
                    fica permanentemente na tela durante os lançamentos. */}
                <Toaster
                  position="top-right"
                  offset={20}
                  toastOptions={{
                    classNames: {
                      toast:
                        "!rounded-xl !border !border-border/70 !bg-card !text-foreground !shadow-pop !font-sans !text-[13.5px]",
                      description: "!text-muted-foreground !text-[12.5px]",
                      success: "[&_[data-icon]]:!text-success",
                      error: "[&_[data-icon]]:!text-danger",
                      info: "[&_[data-icon]]:!text-info",
                      actionButton: "!rounded-lg !bg-primary !text-primary-foreground !text-[12px] !font-medium",
                    },
                  }}
                />
              </TooltipProvider>
            </BalanceWatchProvider>
          </WorkspaceProvider>
        </FinanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
