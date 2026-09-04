import { useLocation } from "react-router-dom";
import { Building, Check, LogOut, Menu, PanelLeft, Settings, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanySelector, PeriodSelector } from "@/components/common/selectors";
import { primaryNav, secondaryNav } from "@/components/layout/nav-items";
import { useWorkspace } from "@/store/workspace-context";
import { useAuth } from "@/store/auth-context";
import { useNavigate } from "react-router-dom";

interface TopbarProps {
  onOpenMenu: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

/** Título da página derivado da rota — evita repetir o nome em cada tela. */
function usePageTitle(): string {
  const { pathname } = useLocation();
  const match = [...primaryNav, ...secondaryNav].find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );
  return match?.label ?? "Vita";
}

export function Topbar({ onOpenMenu, sidebarCollapsed, onToggleSidebar }: TopbarProps) {
  const { companyScope, setCompanyScope, period, setPeriod } = useWorkspace();
  const { profile, signOut, memberships, activeOrgId, setActiveOrg } = useAuth();
  const title = usePageTitle();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* No desktop, o mesmo canto do menu mobile abriga o botão que recolhe
            a sidebar — sempre na mesma coordenada, independente do estado. */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          <PanelLeft className="h-[18px] w-[18px]" />
        </Button>

        <span className="text-[15px] font-semibold tracking-tight lg:hidden">{title}</span>

        <div className="ml-auto flex items-center gap-2">
          <CompanySelector
            value={companyScope}
            onChange={setCompanyScope}
            className="hidden h-9 w-[13rem] border-transparent bg-muted/60 md:flex"
          />
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            className="hidden h-9 w-[13rem] border-transparent bg-muted/60 lg:flex"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                aria-label="Abrir menu do usuário"
              >
                <Avatar>
                  <AvatarFallback>{profile?.initials ?? "–"}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="normal-case">
                <span className="block text-[13px] font-semibold text-foreground">{profile?.name || "Sem nome"}</span>
                <span className="block text-[12px] font-normal text-muted-foreground">{profile?.email ?? ""}</span>
              </DropdownMenuLabel>
              {/*
                A troca de organização só aparece para quem tem mais de uma —
                a contadora que atende vários clientes, o sócio de dois grupos.
                Com uma única organização, o item seria uma escolha sem escolha.
              */}
              {memberships.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Organização
                  </DropdownMenuLabel>
                  {memberships.map(({ org }) => (
                    <DropdownMenuItem
                      key={org.id}
                      onSelect={() => setActiveOrg(org.id)}
                      className="justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Building className="shrink-0" />
                        <span className="truncate">{org.name}</span>
                      </span>
                      {org.id === activeOrgId && <Check className="shrink-0 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate("/perfil")}>
                <UserRound /> Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/configuracoes")}>
                <Settings /> Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => void signOut()}>
                <LogOut /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* No mobile os seletores ganham uma faixa própria para não competirem
          com o título e o menu. */}
      <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2.5 md:hidden">
        <CompanySelector
          value={companyScope}
          onChange={setCompanyScope}
          className="h-9 flex-1 border-transparent bg-muted/60"
        />
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          className="h-9 flex-1 border-transparent bg-muted/60"
        />
      </div>
    </header>
  );
}
