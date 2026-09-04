import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { BalancePanel } from "@/components/finance/balance-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinance } from "@/store/finance-context";

const COLLAPSE_KEY = "vita:sidebar-collapsed";
const BALANCE_COLLAPSE_KEY = "vita:balance-panel-collapsed";

export function AppLayout() {
  // Lida na inicialização, e não em efeito: ver a nota em balance-watch-context.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      return false;
    }
  });
  // O painel de saldo é recolhido pelo header, então quem guarda o estado é o
  // layout — como já acontece com a sidebar — e não o próprio painel.
  const [balanceCollapsed, setBalanceCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(BALANCE_COLLAPSE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { ready, error, reload } = useFinance();

  // A preferência de menu recolhido acompanha o usuário entre sessões.
  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      // Preferência apenas em memória.
    }
  }, [collapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(BALANCE_COLLAPSE_KEY, String(balanceCollapsed));
    } catch {
      // Preferência apenas em memória.
    }
  }, [balanceCollapsed]);

  // Trocar de página no celular fecha o drawer.
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar collapsed={collapsed} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SheetDescription className="sr-only">Acesse as áreas do sistema.</SheetDescription>
          <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} className="w-full border-r-0" />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* O header fica fora da linha que contém o painel de saldo: sua
            largura depende só da sidebar esquerda, nunca do recolher/expandir
            do painel à direita. */}
        <Topbar
          onOpenMenu={() => setMobileOpen(true)}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
        />

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* A `key` força a remontagem a cada rota — sem ela a animação só
                tocaria uma vez, na primeira página carregada, e a troca de
                tela ficaria seca daí em diante. */}
            <div key={pathname} className="mx-auto w-full max-w-[1400px] animate-fade-up">
              {/*
                Os três estados da carga são resolvidos aqui, uma vez, em vez de
                em cada página. Sem isto, uma falha de rede apareceria como um
                painel zerado — indistinguível de uma organização que de fato
                ainda não tem lançamento nenhum.
              */}
              {!ready ? <PageSkeleton /> : error ? <LoadError message={error} onRetry={reload} /> : <Outlet />}
            </div>
          </main>

          {/* O saldo é uma coluna fixa do layout, colada no header (nunca por
              trás dele) — sem `sticky top-16` ela não acompanharia o header
              fixo ao rolar a página. Abaixo de `lg` some daqui e reaparece
              dentro do próprio formulário de lançamento. */}
          <BalancePanel
            collapsed={balanceCollapsed}
            onToggleCollapse={() => setBalanceCollapsed((value) => !value)}
          />
        </div>
      </div>
    </div>
  );
}

/** Esqueleto genérico enquanto a primeira carga não chega. */
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

/**
 * Falha de carga com o motivo e uma saída.
 *
 * A mensagem vem traduzida de `describeError`, então diz o que aconteceu —
 * sem permissão, registro ausente, rede fora — em vez de um código.
 */
function LoadError({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-danger/30 bg-danger/5 px-6 py-8 text-center">
      <p className="text-[15px] font-semibold">Não foi possível carregar os dados</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => void onRetry()}>
        Tentar novamente
      </Button>
    </div>
  );
}
