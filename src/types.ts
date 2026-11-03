export type Visibility = "private" | "shared" | "household"
export type Scope = "personal" | "couple" | "household"
export type TransactionType = "expense" | "income" | "transfer"

export interface User {
  id: string
  name: string
  email: string
  initials: string
}

export interface Account {
  id: string
  name: string
  institution: string
  ownerId: string
  householdId: string
  type: "current" | "savings" | "cash" | "credit"
  balance: number
  visibility: Visibility
  updatedAt: string
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  category: string
  accountId: string
  ownerId: string
  householdId: string
  visibility: Visibility
  date: string
  recurring?: boolean
  splitType?: "individual" | "equal" | "percentage" | "fixed"
  status: "confirmed" | "pending"
  note?: string
  importId?: string
  sourceFile?: string
}

export interface ImportedFile {
  id: string
  name: string
  accountId: string
  importedAt: string
  added: number
  duplicates: number
}

export interface Budget {
  id: string
  name: string
  amount: number
  categoryIds: string[]
  visibility: Visibility
  period: "monthly"
}

export interface GoalContribution {
  userId: string
  amount: number
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  visibility: Visibility
  contributions: GoalContribution[]
}

export interface Investment {
  id: string
  name: string
  type: string
  quantity: number
  investedAmount: number
  currentValue: number
  ownerId: string
  visibility: Visibility
}

export interface AppState {
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  darkMode: boolean
  onboardingComplete: boolean
  importedFiles?: ImportedFile[]
}
