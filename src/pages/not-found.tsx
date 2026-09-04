import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={Compass}
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido. Volte ao painel para continuar."
        action={
          <Button asChild>
            <Link to="/">Ir para o Dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
