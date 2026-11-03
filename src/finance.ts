import type { Scope, Transaction } from "./types"

export const eur = (value: number, sign = false) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    signDisplay: sign ? "always" : "auto",
  })
    .format(value)
    .replace(/\u00a0/g, " ")

export const visibleTransactions = (
  transactions: Transaction[],
  scope: Scope,
  currentUser = "miguel",
) =>
  transactions.filter((transaction) => {
    if (scope === "personal")
      return (
        transaction.ownerId === currentUser &&
        transaction.visibility !== "household"
      )
    if (scope === "couple") return transaction.visibility === "shared"
    return true
  })

export const totals = (transactions: Transaction[]) => {
  const confirmed = transactions.filter((item) => item.status === "confirmed")
  const income = confirmed
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0)
  const expenses = confirmed
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0)
  return {
    income,
    expenses,
    savings: income - expenses,
    rate: income ? ((income - expenses) / income) * 100 : 0,
  }
}

export const latestMonthTransactions = (transactions: Transaction[]) => {
  const latestMonth = transactions
    .map((item) => item.date.slice(0, 7))
    .sort()
    .at(-1)
  return {
    month: latestMonth || new Date().toISOString().slice(0, 7),
    transactions: latestMonth
      ? transactions.filter((item) => item.date.startsWith(latestMonth))
      : [],
  }
}

export const categoryTotal = (transactions: Transaction[], category: string) =>
  transactions
    .filter(
      (item) =>
        item.type === "expense" &&
        item.category === category &&
        item.status === "confirmed",
    )
    .reduce((sum, item) => sum + item.amount, 0)

export const byCategory = (transactions: Transaction[]) => {
  const map = new Map<string, number>()
  transactions
    .filter((item) => item.type === "expense" && item.status === "confirmed")
    .forEach((item) =>
      map.set(item.category, (map.get(item.category) || 0) + item.amount),
    )
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}
