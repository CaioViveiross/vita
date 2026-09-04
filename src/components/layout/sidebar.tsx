import { NavLink, useMatch } from "react-router-dom";
import { primaryNav, secondaryNav, type NavItem } from "@/components/layout/nav-items";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { brand } from "@/config/brand";
import { useAuth } from "@/store/auth-context";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
  className?: string;
}

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="brand-mark h-6 w-9 shrink-0 text-primary" role="img" aria-label={brand.name} />
      <span
        data-collapsed={collapsed}
        aria-hidden={collapsed}
        className={cn(
          "nav-label w-40 shrink-0 overflow-hidden whitespace-nowrap",
          collapsed ? "opacity-0" : "opacity-100",
        )}
      >
        <span className="block truncate text-[15px] font-semibold leading-tight tracking-tight">{brand.name}</span>
        <span className="block truncate text-[11.5px] leading-tight text-muted-foreground">{brand.tagline}</span>
      </span>
    </div>
  );
}

function NavRow({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const isActive = Boolean(useMatch({ path: item.to, end: item.end }));

  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={cn(
        "nav-motion group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        // Recolhida, o ícone é centralizado por padding fixo — e não por
        // `justify-center`, que centralizaria ícone + legenda (que continua
        // no fluxo, só recortada) e jogaria o ícone para a esquerda.
        collapsed && "px-[17px]",
        isActive
          ? "bg-primary-soft text-primary-deep hover:bg-primary-soft/70"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {/* Marcador do item ativo, ancorado na borda esquerda da sidebar. */}
      <span
        className={cn(
          "absolute -left-3 h-5 w-1 rounded-r-full bg-primary transition-all duration-200 ease-smooth",
          isActive ? "opacity-100" : "scale-y-0 opacity-0",
        )}
      />
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.9} />
      {/* Largura fixa (não `w-auto`) porque só assim dá para animar — o
          navegador não interpola transições de/para `auto`. */}
      <span
        data-collapsed={collapsed}
        aria-hidden={collapsed}
        className={cn(
          "nav-label w-40 shrink-0 truncate whitespace-nowrap",
          collapsed ? "opacity-0" : "opacity-100",
        )}
      >
        {item.label}
      </span>
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ collapsed, onNavigate, className }: SidebarProps) {
  const { profile, activeMembership } = useAuth();
  return (
    <aside
      className={cn(
        // `overflow-hidden` é quem esconde as legendas ao recolher — elas
        // mantêm a largura fixa em vez de animar junto. O marcador do item
        // ativo fica na borda esquerda (x=0), dentro da caixa, então não é
        // cortado; quem o cortava antes era o `overflow` do `nav`.
        "flex h-full flex-col gap-6 overflow-hidden border-r border-border/70 bg-card px-3 py-5 transition-[width] duration-300 ease-panel",
        collapsed ? "w-[4.75rem]" : "w-64",
        className,
      )}
    >
      {/* O botão de recolher vive no header (ver `topbar.tsx`), como no padrão
          de sidebar do shadcn/ui: fica sempre no mesmo ponto da tela, sem
          depender do estado nem da largura da própria sidebar. */}
      {/* Mesma razão do item de menu: recolhida, a marca é centralizada por
          padding (36px de marca em 52px de área útil), não por
          `justify-center` — que consideraria também o nome, ainda no fluxo. */}
      <div className={cn("flex items-center px-1", collapsed && "pl-2")}>
        <BrandMark collapsed={collapsed} />
      </div>

      {/* Sem `overflow-y-auto`: rolagem vertical força o navegador a também
          cortar a horizontal (regra do CSS quando só um eixo é "auto"), e o
          marcador do item ativo — que vaza a caixa do link para encostar na
          borda da sidebar — some cortado. Com só 5 itens isso nunca precisa
          rolar de verdade, e fica igual ao bloco de baixo (que nunca teve
          esse `overflow`). */}
      <nav className="flex flex-1 flex-col gap-1">
        {primaryNav.map((item) => (
          <NavRow key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border/70 pt-4">
        {secondaryNav.map((item) => (
          <NavRow key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}

        {!collapsed && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-deep">
              {profile?.initials ?? "–"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium leading-tight">{profile?.name || "Sem nome"}</span>
              <span className="block truncate text-[11.5px] leading-tight text-muted-foreground">{profile?.role || activeMembership?.org.name || ""}</span>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
