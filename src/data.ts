import type { Account, AppState, User } from "./types"

export const users: User[] = [
  { id: "miguel", name: "Miguel", email: "miguel@exemplo.pt", initials: "M" },
  {
    id: "mariana",
    name: "Mariana",
    email: "mariana@exemplo.pt",
    initials: "M",
  },
]

export const accounts: Account[] = [
  {
    id: "miguel-current",
    name: "Conta do Miguel",
    institution: "Santander",
    ownerId: "miguel",
    householdId: "h1",
    type: "current",
    balance: 0,
    visibility: "private",
    updatedAt: "Sem importações",
  },
  {
    id: "mariana-current",
    name: "Conta da Mariana",
    institution: "Caixa Geral de Depósitos",
    ownerId: "mariana",
    householdId: "h1",
    type: "current",
    balance: 0,
    visibility: "private",
    updatedAt: "Sem importações",
  },
  {
    id: "joint",
    name: "Conta conjunta",
    institution: "Revolut",
    ownerId: "household",
    householdId: "h1",
    type: "current",
    balance: 0,
    visibility: "shared",
    updatedAt: "Sem importações",
  },
]

export const initialState: AppState = {
  transactions: [],
  budgets: [],
  goals: [],
  darkMode: false,
  onboardingComplete: true,
  importedFiles: [],
}

export const expenseCategories = [
  "Alimentação individual",
  "Alimentação conjunto",
  "Lazer (música/desporto)",
  "Viagens individual",
  "Viagens conjunto",
  "Saídas individual",
  "Saídas conjunto",
  "Prendas (natal/aniv)",
  "Despesas família",
  "Saúde",
]

export const movementCategories = [
  ...expenseCategories,
  "Rendimentos",
  "Transferência",
]

export const normalizeCategory = (
  category: string,
  accountId: string,
  type: string,
) => {
  if (type === "income") return "Rendimentos"
  if (type === "transfer") return "Transferência"
  if (expenseCategories.includes(category)) return category
  const joint = accountId === "joint"
  if (["Supermercado", "Alimentação"].includes(category))
    return joint ? "Alimentação conjunto" : "Alimentação individual"
  if (["Restaurantes", "Saídas"].includes(category))
    return joint ? "Saídas conjunto" : "Saídas individual"
  if (["Transportes", "Viagens"].includes(category))
    return joint ? "Viagens conjunto" : "Viagens individual"
  if (category === "Lazer") return "Lazer (música/desporto)"
  if (category === "Saúde") return "Saúde"
  if (category === "Compras") return "Prendas (natal/aniv)"
  return "Despesas família"
}

export const categoryColors: Record<string, string> = {
  "Alimentação individual": "mint",
  "Alimentação conjunto": "sage",
  "Lazer (música/desporto)": "coral",
  "Viagens individual": "blue",
  "Viagens conjunto": "teal",
  "Saídas individual": "amber",
  "Saídas conjunto": "coral",
  "Prendas (natal/aniv)": "lilac",
  "Despesas família": "slate",
  Saúde: "rose",
  Rendimentos: "sage",
  Transferência: "slate",
}
