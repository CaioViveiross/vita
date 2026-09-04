import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Layers, Plus } from "lucide-react";
import type { Category, CategoryKind, Expense } from "@/types";
import { PageHeader } from "@/components/common/page-header";
import { FilterBar } from "@/components/common/filter-bar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryCard } from "@/components/finance/category-card";
import { useFinance } from "@/store/finance-context";
import { useWorkspace } from "@/store/workspace-context";
import { useScopedData } from "@/hooks/use-scoped-transactions";
import { groupByCategory, inRange } from "@/lib/finance";
import { normalize } from "@/lib/utils";

type KindFilter = CategoryKind | "all";

interface CategoryForm {
  name: string;
  description: string;
  kind: CategoryKind;
}

interface ExpenseForm {
  name: string;
  description: string;
}

const EMPTY_CATEGORY: CategoryForm = { name: "", description: "", kind: "saida" };
const EMPTY_EXPENSE: ExpenseForm = { name: "", description: "" };

export function ChartOfAccountsPage() {
  const {
    categories,
    expenses,
    createCategory,
    updateCategory,
    deleteCategory,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useFinance();
  const { range } = useWorkspace();
  const { transactions } = useScopedData();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseTarget, setExpenseTarget] = useState<Category | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(EMPTY_EXPENSE);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<Category | null>(null);
  const [pendingExpenseDelete, setPendingExpenseDelete] = useState<Expense | null>(null);

  useEffect(() => {
    if (!categoryOpen) return;
    setCategoryError(null);
    setCategoryForm(
      editingCategory
        ? {
            name: editingCategory.name,
            description: editingCategory.description,
            kind: editingCategory.kind,
          }
        : EMPTY_CATEGORY,
    );
  }, [categoryOpen, editingCategory]);

  useEffect(() => {
    if (!expenseOpen) return;
    setExpenseError(null);
    setExpenseForm(
      editingExpense
        ? { name: editingExpense.name, description: editingExpense.description ?? "" }
        : EMPTY_EXPENSE,
    );
  }, [expenseOpen, editingExpense]);

  /** Totais por categoria no período — dão noção de peso a cada seção. */
  const totalsByCategory = useMemo(
    () => groupByCategory(inRange(transactions, range)),
    [transactions, range],
  );

  const visible = useMemo(() => {
    const term = normalize(search.trim());
    return categories.filter((category) => {
      if (kind !== "all" && category.kind !== kind) return false;
      if (!term) return true;
      const own = expenses.filter((expense) => expense.categoryId === category.id);
      return (
        normalize(category.name).includes(term) ||
        normalize(category.description).includes(term) ||
        own.some((expense) => normalize(expense.name).includes(term))
      );
    });
  }, [categories, expenses, search, kind]);

  const submitCategory = (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryForm.name.trim()) {
      setCategoryError("Informe o nome da categoria.");
      return;
    }

    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      kind: categoryForm.kind,
    };

    if (editingCategory) {
      updateCategory(editingCategory.id, payload);
      toast.success("Categoria atualizada.", { description: payload.name });
    } else {
      createCategory(payload);
      toast.success("Categoria criada com sucesso.", { description: payload.name });
    }
    setCategoryOpen(false);
  };

  const submitExpense = (event: React.FormEvent) => {
    event.preventDefault();
    if (!expenseForm.name.trim()) {
      setExpenseError("Informe o nome do item.");
      return;
    }

    const payload = {
      name: expenseForm.name.trim(),
      description: expenseForm.description.trim() || undefined,
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, payload);
      toast.success("Item atualizado.", { description: payload.name });
    } else if (expenseTarget) {
      createExpense({ ...payload, categoryId: expenseTarget.id });
      toast.success("Item adicionado à categoria.", { description: `${expenseTarget.name} · ${payload.name}` });
    }
    setExpenseOpen(false);
  };

  const activeFilters = (kind !== "all" ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plano de Contas"
        description="Categorias e os itens vinculados a elas. É o que organiza cada lançamento."
        actions={
          <Button
            onClick={() => {
              setEditingCategory(null);
              setCategoryOpen(true);
            }}
          >
            <Plus /> Nova categoria
          </Button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por categoria ou item…"
        activeCount={activeFilters}
        onClear={() => {
          setSearch("");
          setKind("all");
        }}
      >
        <Select value={kind} onValueChange={(value) => setKind(value as KindFilter)}>
          <SelectTrigger className="h-10 sm:w-[13rem]">
            <SelectValue placeholder="Natureza" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as naturezas</SelectItem>
            <SelectItem value="entrada">Entradas</SelectItem>
            <SelectItem value="saida">Saídas</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {visible.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhuma categoria encontrada"
          description={
            activeFilters > 0
              ? "Ajuste a busca ou o filtro de natureza."
              : "Crie a primeira categoria para estruturar o plano de contas."
          }
          action={
            <Button
              onClick={() => {
                setEditingCategory(null);
                setCategoryOpen(true);
              }}
            >
              <Plus /> Nova categoria
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              expenses={expenses.filter((expense) => expense.categoryId === category.id)}
              total={totalsByCategory.get(category.id) ?? 0}
              onEditCategory={() => {
                setEditingCategory(category);
                setCategoryOpen(true);
              }}
              onDeleteCategory={() => setPendingCategoryDelete(category)}
              onCreateExpense={() => {
                setExpenseTarget(category);
                setEditingExpense(null);
                setExpenseOpen(true);
              }}
              onEditExpense={(expense) => {
                setExpenseTarget(category);
                setEditingExpense(expense);
                setExpenseOpen(true);
              }}
              onDeleteExpense={setPendingExpenseDelete}
            />
          ))}
        </div>
      )}

      {/* Categoria */}
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription>
              Categorias agrupam despesas e receitas semelhantes — como “Serviços Públicos” ou “Fornecedores”.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitCategory} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nome</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(event) => {
                  setCategoryForm({ ...categoryForm, name: event.target.value });
                  setCategoryError(null);
                }}
                placeholder="Serviços Públicos"
                autoFocus
              />
              {categoryError && <p className="text-[12px] text-danger">{categoryError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-description">Descrição</Label>
              <Textarea
                id="cat-description"
                value={categoryForm.description}
                onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })}
                placeholder="Despesas relacionadas aos serviços essenciais das empresas."
                className="min-h-[70px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Natureza</Label>
              <Select
                value={categoryForm.kind}
                onValueChange={(value) => setCategoryForm({ ...categoryForm, kind: value as CategoryKind })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saida">Saída — despesas</SelectItem>
                  <SelectItem value="entrada">Entrada — receitas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingCategory ? "Salvar alterações" : "Salvar categoria"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item da categoria */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Editar item" : `Novo item em ${expenseTarget?.name ?? "categoria"}`}
            </DialogTitle>
            <DialogDescription>
              Itens são o nível mais específico do plano de contas — “Energia elétrica”, “Água”, “Internet”.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitExpense} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="exp-name">Nome</Label>
              <Input
                id="exp-name"
                value={expenseForm.name}
                onChange={(event) => {
                  setExpenseForm({ ...expenseForm, name: event.target.value });
                  setExpenseError(null);
                }}
                placeholder="Energia elétrica"
                autoFocus
              />
              {expenseError && <p className="text-[12px] text-danger">{expenseError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-description">Descrição</Label>
              <Input
                id="exp-description"
                value={expenseForm.description}
                onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })}
                placeholder="Opcional"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingExpense ? "Salvar alterações" : "Salvar item"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingCategoryDelete)}
        onOpenChange={(open) => !open && setPendingCategoryDelete(null)}
        title="Excluir categoria?"
        description={
          pendingCategoryDelete ? (
            <>
              A categoria <strong className="font-medium text-foreground">{pendingCategoryDelete.name}</strong> e todos
              os seus itens serão removidos. As movimentações existentes ficarão sem categoria.
            </>
          ) : null
        }
        confirmLabel="Excluir categoria"
        onConfirm={() => {
          if (!pendingCategoryDelete) return;
          deleteCategory(pendingCategoryDelete.id);
          toast.success("Categoria excluída.");
          setPendingCategoryDelete(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingExpenseDelete)}
        onOpenChange={(open) => !open && setPendingExpenseDelete(null)}
        title="Excluir item?"
        description={
          pendingExpenseDelete ? (
            <>
              O item <strong className="font-medium text-foreground">{pendingExpenseDelete.name}</strong> será removido
              do plano de contas.
            </>
          ) : null
        }
        confirmLabel="Excluir item"
        onConfirm={() => {
          if (!pendingExpenseDelete) return;
          deleteExpense(pendingExpenseDelete.id);
          toast.success("Item excluído.");
          setPendingExpenseDelete(null);
        }}
      />
    </div>
  );
}
