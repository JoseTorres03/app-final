import { useMemo, useState } from "react"
import { accounts, categoryColors, movementCategories } from "../data"
import { byCategory, categoryTotal, eur, totals } from "../finance"
import type { Budget, Goal, Transaction } from "../types"
import { Button, CategoryIcon, EmptyState, Icon, Progress } from "./ui"

const accountName = (id: string) =>
  accounts.find((account) => account.id === id)?.name || "Conta importada"

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" })
    .format(new Date(`${date}T12:00:00`))
    .replace(".", "")

const categoryTone = (category: string) =>
  categoryColors[category] ||
  {
    Alimentação: "mint",
    Poupança: "teal",
    Outros: "slate",
  }[category] ||
  "slate"

export function TransactionRow({
  item,
  onClick,
  selectable = false,
  selected = false,
}: {
  item: Transaction
  onClick: () => void
  selectable?: boolean
  selected?: boolean
}) {
  const positive = item.type === "income"
  const transfer = item.type === "transfer"
  return (
    <button
      className={`transaction-row simple-row ${selected ? "row-selected" : ""}`}
      onClick={onClick}
    >
      {selectable ? (
        <span className={`selection-check ${selected ? "selected" : ""}`}>
          {selected && <Icon name="check" size={15} />}
        </span>
      ) : (
        <span className={`category-icon ${categoryTone(item.category)}`}>
          <CategoryIcon category={item.category} />
        </span>
      )}
      <span className="transaction-main">
        <span className="transaction-title">{item.description}</span>
        <span className="transaction-meta">
          {item.category} · {accountName(item.accountId)}
        </span>
      </span>
      <span
        className={`transaction-value ${
          positive ? "positive" : transfer ? "neutral" : ""
        }`}
      >
        {transfer ? "" : positive ? "+" : "−"}
        {eur(item.amount)}
      </span>
    </button>
  )
}

const weeklyValues = (transactions: Transaction[]) =>
  [1, 2, 3, 4, 5].map((week) => {
    const items = transactions.filter(
      (item) => Math.ceil(Number(item.date.slice(-2)) / 7) === week,
    )
    return {
      income: totals(items).income,
      expenses: totals(items).expenses,
    }
  })

export function SummaryScreen({
  transactions,
  onDetail,
  onAdd,
  onImport,
  onGoTransactions,
}: {
  transactions: Transaction[]
  onDetail: (item: Transaction) => void
  onAdd: () => void
  onImport: () => void
  onGoTransactions: () => void
}) {
  const summary = totals(transactions)
  const balance = totals(transactions).savings
  const categories = byCategory(transactions).slice(0, 4)
  const weeks = weeklyValues(transactions)
  const chartMax = Math.max(
    ...weeks.flatMap((week) => [week.income, week.expenses]),
    1,
  )
  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <main className="screen simplified-screen">
      <header className="simple-header">
        <div>
          <p className="eyebrow">Visão financeira</p>
          <h1>Olá, Miguel e Mariana</h1>
        </div>
        <span className="mini-avatar">MM</span>
      </header>

      <section className="simple-balance">
        <div>
          <span>Saldo dos movimentos</span>
          <strong>{eur(balance)}</strong>
          <small>
            Calculado a partir de {transactions.length} movimentos guardados
          </small>
        </div>
        <span className="balance-mark">
          <Icon name="wallet" size={24} />
        </span>
      </section>

      <section className="simple-metrics">
        <article className="income-card">
          <span>Receitas</span>
          <strong>{eur(summary.income)}</strong>
          <small>No período selecionado</small>
        </article>
        <article className="expense-card">
          <span>Despesas</span>
          <strong>{eur(summary.expenses)}</strong>
          <small>No período selecionado</small>
        </article>
      </section>

      <div className="summary-quick-actions">
        <button className="manual-banner" onClick={onAdd}>
          <span className="import-banner-icon">
            <Icon name="plus" />
          </span>
          <span>
            <strong>Nova transação</strong>
            <small>Adicionar manualmente</small>
          </span>
          <Icon name="chevron" />
        </button>
        <button className="import-banner" onClick={onImport}>
          <span className="import-banner-icon">
            <Icon name="upload" />
          </span>
          <span>
            <strong>Importar extrato</strong>
            <small>CSV ou PDF</small>
          </span>
          <Icon name="chevron" />
        </button>
      </div>

      <section className="section-block compact-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Período selecionado</p>
            <h2>Receitas e despesas</h2>
          </div>
          <span
            className={`net-result ${
              summary.savings >= 0 ? "positive" : "negative"
            }`}
          >
            <small>Resultado</small>
            {eur(summary.savings, true)}
          </span>
        </div>
        <div className="simple-chart-card">
          <div className="flow-summary">
            <div>
              <span className="flow-marker income">
                <Icon name="download" size={15} />
              </span>
              <span>
                <small>Entrou</small>
                <strong>{eur(summary.income)}</strong>
              </span>
            </div>
            <div>
              <span className="flow-marker expense">
                <Icon name="upload" size={15} />
              </span>
              <span>
                <small>Saiu</small>
                <strong>{eur(summary.expenses)}</strong>
              </span>
            </div>
          </div>
          <div className="weekly-flow">
            {weeks.map((week, index) => (
              <div className="weekly-flow-row" key={index}>
                <strong>S{index + 1}</strong>
                <div>
                  <span className="weekly-track">
                    <i
                      className="income"
                      style={{
                        width: `${Math.max(2, (week.income / chartMax) * 100)}%`,
                      }}
                    />
                  </span>
                  <em>{eur(week.income)}</em>
                </div>
                <div>
                  <span className="weekly-track">
                    <i
                      className="expense"
                      style={{
                        width: `${Math.max(2, (week.expenses / chartMax) * 100)}%`,
                      }}
                    />
                  </span>
                  <em>{eur(week.expenses)}</em>
                </div>
              </div>
            ))}
          </div>
          <div className="flow-legend">
            <span>
              <i className="income" /> Receitas
            </span>
            <span>
              <i className="expense" /> Despesas
            </span>
          </div>
        </div>
      </section>

      <section className="section-block compact-section">
        <div className="section-heading">
          <h2>Onde gastaram mais</h2>
          <span className="section-total">{eur(summary.expenses)}</span>
        </div>
        <div className="visual-categories">
          {categories.map(([name, value]) => (
            <div key={name}>
              <span className={`category-icon ${categoryTone(name)}`}>
                <CategoryIcon category={name} />
              </span>
              <span>
                <strong>{name}</strong>
                <small>
                  {summary.expenses
                    ? ((value / summary.expenses) * 100).toFixed(0)
                    : 0}
                  % das despesas
                </small>
              </span>
              <strong>{eur(value)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block compact-section">
        <div className="section-heading">
          <h2>Movimentos recentes</h2>
          <button className="text-button" onClick={onGoTransactions}>
            Ver todos <Icon name="chevron" size={14} />
          </button>
        </div>
        <div className="transaction-list card-list">
          {recent.map((item) => (
            <TransactionRow
              key={item.id}
              item={item}
              onClick={() => onDetail(item)}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

export function TransactionsScreen({
  transactions,
  onDetail,
  onAdd,
  onImport,
  onExport,
  onBulkDelete,
  onBulkCategory,
}: {
  transactions: Transaction[]
  onDetail: (item: Transaction) => void
  onAdd: () => void
  onImport: () => void
  onExport: () => void
  onBulkDelete: (ids: string[]) => void
  onBulkCategory: (ids: string[], category: string) => void
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("Todos")
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [category, setCategory] = useState(movementCategories[0])
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const filtered = useMemo(
    () =>
      [...transactions]
        .filter((item) => {
          const matchesQuery = `${item.description} ${item.category}`
            .toLowerCase()
            .includes(query.toLowerCase())
          const matchesFilter =
            filter === "Todos" ||
            (filter === "Despesas" && item.type === "expense") ||
            (filter === "Receitas" && item.type === "income") ||
            (filter === "Importados" && Boolean(item.sourceFile))
          return matchesQuery && matchesFilter
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, query, filter],
  )
  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const leaveSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setShowCategoryPicker(false)
    setConfirmingDelete(false)
  }
  const selectAllVisible = () =>
    setSelectedIds(new Set(filtered.map((item) => item.id)))

  return (
    <main className="screen simplified-screen">
      <header className="page-header action-header">
        <div>
          <p className="eyebrow">Histórico completo</p>
          <h1>Movimentos</h1>
        </div>
        <div className="header-movement-actions">
          <button className="header-add" onClick={onAdd}>
            <Icon name="plus" size={18} /> Adicionar
          </button>
          <button className="header-import" onClick={onImport}>
            <Icon name="upload" size={18} /> Importar
          </button>
        </div>
      </header>
      <label className="search-field large-search">
        <Icon name="search" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar movimento ou categoria"
        />
        {query && (
          <button onClick={() => setQuery("")}>
            <Icon name="close" size={17} />
          </button>
        )}
      </label>
      <div className="chip-row">
        {["Todos", "Despesas", "Receitas", "Importados"].map((item) => (
          <button
            key={item}
            className={`chip ${filter === item ? "active" : ""}`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="list-summary roomy-summary">
        <strong>
          {selectionMode
            ? `${selectedIds.size} selecionados`
            : `${filtered.length} movimentos`}
        </strong>
        <div className="movement-actions">
          {selectionMode ? (
            <>
              <button onClick={selectAllVisible}>Selecionar todos</button>
              <button onClick={leaveSelectionMode}>Cancelar</button>
            </>
          ) : (
            <>
              <button onClick={() => setSelectionMode(true)}>
                <Icon name="check" size={15} /> Selecionar
              </button>
              <button onClick={onExport}>
                <Icon name="download" size={15} /> Excel
              </button>
            </>
          )}
        </div>
      </div>
      {filtered.length ? (
        <div className="transaction-list movement-list">
          {filtered.map((item, index) => (
            <div key={item.id}>
              {(index === 0 || filtered[index - 1].date !== item.date) && (
                <p className="date-divider">{dateLabel(item.date)}</p>
              )}
              <TransactionRow
                item={item}
                selectable={selectionMode}
                selected={selectedIds.has(item.id)}
                onClick={() =>
                  selectionMode ? toggleSelection(item.id) : onDetail(item)
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sem movimentos"
          detail="Altera os filtros ou importa um extrato bancário."
        />
      )}
      {selectionMode && selectedIds.size > 0 && (
        <div className="bulk-toolbar">
          {confirmingDelete && (
            <div className="bulk-delete-confirm">
              <p>
                Eliminar definitivamente {selectedIds.size}{" "}
                {selectedIds.size === 1 ? "movimento" : "movimentos"}?
              </p>
              <div>
                <button onClick={() => setConfirmingDelete(false)}>
                  Cancelar
                </button>
                <button
                  className="confirm-delete"
                  onClick={() => {
                    onBulkDelete([...selectedIds])
                    leaveSelectionMode()
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
          {showCategoryPicker && (
            <div className="bulk-category-picker">
              <label>
                <span>Nova categoria</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {movementCategories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <Button
                onClick={() => {
                  onBulkCategory([...selectedIds], category)
                  leaveSelectionMode()
                }}
              >
                Aplicar
              </Button>
            </div>
          )}
          <div className="bulk-toolbar-actions">
            <button onClick={() => setShowCategoryPicker(!showCategoryPicker)}>
              <Icon name="edit" size={18} />
              Categoria
            </button>
            <button
              className="destructive"
              onClick={() => {
                setShowCategoryPicker(false)
                setConfirmingDelete(true)
              }}
            >
              <Icon name="trash" size={18} />
              Eliminar
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export function CategoriesScreen({
  transactions,
  onDetail,
}: {
  transactions: Transaction[]
  onDetail: (item: Transaction) => void
}) {
  const [type, setType] = useState<"expense" | "income">("expense")
  const [selected, setSelected] = useState<string | null>(null)
  const relevant = transactions.filter((item) => item.type === type)
  const categoryMap = new Map<string, number>()
  relevant.forEach((item) =>
    categoryMap.set(
      item.category,
      (categoryMap.get(item.category) || 0) + item.amount,
    ),
  )
  const categories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])
  const total = categories.reduce((sum, item) => sum + item[1], 0)
  const selectedItems = selected
    ? relevant.filter((item) => item.category === selected)
    : []

  return (
    <main className="screen simplified-screen">
      <header className="page-header">
        <p className="eyebrow">Análise simples</p>
        <h1>Categorias</h1>
        <p>Percebe rapidamente para onde vai o dinheiro.</p>
      </header>
      <div className="large-tabs">
        <button
          className={type === "expense" ? "active" : ""}
          onClick={() => {
            setType("expense")
            setSelected(null)
          }}
        >
          Despesas
        </button>
        <button
          className={type === "income" ? "active" : ""}
          onClick={() => {
            setType("income")
            setSelected(null)
          }}
        >
          Receitas
        </button>
      </div>
      <section className="category-total-card">
        <span>Total em {type === "expense" ? "despesas" : "receitas"}</span>
        <strong>{eur(total)}</strong>
        <small>{categories.length} categorias no período</small>
        <div className="segmented-total">
          {categories.map(([name, value]) => (
            <i
              key={name}
              className={categoryTone(name)}
              style={{ width: `${total ? (value / total) * 100 : 0}%` }}
            />
          ))}
        </div>
      </section>
      <div className="category-cards">
        {categories.map(([name, value]) => (
          <div
            key={name}
            className={`category-card-shell ${
              selected === name ? "selected" : ""
            }`}
          >
            <button
              className="category-card-trigger"
              onClick={() => setSelected(selected === name ? null : name)}
              aria-expanded={selected === name}
            >
              <span className={`category-icon ${categoryTone(name)}`}>
                <CategoryIcon category={name} />
              </span>
              <span>
                <strong>{name}</strong>
                <small>
                  {relevant.filter((item) => item.category === name).length}{" "}
                  movimentos
                </small>
              </span>
              <span>
                <strong>{eur(value)}</strong>
                <small>{total ? ((value / total) * 100).toFixed(0) : 0}%</small>
              </span>
              <Icon name="chevron" size={16} />
            </button>
            {selected === name && (
              <div className="category-inline-movements">
                {selectedItems.map((item) => (
                  <TransactionRow
                    key={item.id}
                    item={item}
                    onClick={() => onDetail(item)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}

export function AccountsScreen({
  transactions,
  onImport,
}: {
  transactions: Transaction[]
  onImport: () => void
}) {
  const accountBalance = (id: string) => {
    const items = transactions.filter((item) => item.accountId === id)
    return totals(items).savings
  }
  const total = totals(transactions).savings
  const bankStyles: Record<string, string> = {
    Santander: "bank-santander",
    "Caixa Geral de Depósitos": "bank-cgd",
    Revolut: "bank-revolut",
  }
  return (
    <main className="screen simplified-screen">
      <header className="page-header">
        <p className="eyebrow">Origem dos movimentos</p>
        <h1>Contas</h1>
        <p>Saldos calculados apenas a partir dos ficheiros e movimentos.</p>
      </header>
      <section className="accounts-total">
        <span>Saldo total calculado</span>
        <strong>{eur(total)}</strong>
        <small>{accounts.length} contas configuradas</small>
      </section>
      <div className="simple-account-list">
        {accounts.map((account) => {
          const count = transactions.filter(
            (item) => item.accountId === account.id,
          ).length
          return (
            <article key={account.id}>
              <span
                className={`bank-logo ${bankStyles[account.institution] || ""}`}
              >
                {account.institution === "Caixa Geral de Depósitos"
                  ? "CGD"
                  : account.institution.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <small>{account.institution}</small>
                <strong>{account.name}</strong>
                <em>{count} movimentos</em>
              </span>
              <strong>{eur(accountBalance(account.id))}</strong>
            </article>
          )
        })}
      </div>
      <button className="add-statement-card" onClick={onImport}>
        <span>
          <Icon name="upload" />
        </span>
        <span>
          <strong>Importar para uma conta</strong>
          <small>Seleciona a conta antes de carregar o extrato.</small>
        </span>
        <Icon name="chevron" />
      </button>
    </main>
  )
}

export function PlanningScreen({
  transactions,
  budgets,
  goals,
  onAddBudget,
  onAddGoal,
  onAddMoney,
}: {
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  onAddBudget: () => void
  onAddGoal: () => void
  onAddMoney: (goal: Goal) => void
}) {
  const [tab, setTab] = useState<"budgets" | "goals" | "recurring">("budgets")
  const recurring = transactions.filter((item) => item.recurring)
  return (
    <main className="screen simplified-screen">
      <header className="page-header">
        <p className="eyebrow">Organizar o próximo mês</p>
        <h1>Planeamento</h1>
        <p>Orçamentos, objetivos e pagamentos regulares.</p>
      </header>
      <div className="large-tabs three-tabs">
        <button
          className={tab === "budgets" ? "active" : ""}
          onClick={() => setTab("budgets")}
        >
          Orçamentos
        </button>
        <button
          className={tab === "goals" ? "active" : ""}
          onClick={() => setTab("goals")}
        >
          Objetivos
        </button>
        <button
          className={tab === "recurring" ? "active" : ""}
          onClick={() => setTab("recurring")}
        >
          Recorrentes
        </button>
      </div>
      {tab === "budgets" && (
        <>
          <div className="section-heading">
            <h2>Limites mensais</h2>
            <Button variant="ghost" onClick={onAddBudget}>
              <Icon name="plus" size={16} /> Novo
            </Button>
          </div>
          <div className="budget-list">
            {budgets.map((budget) => {
              const spent = categoryTotal(transactions, budget.categoryIds[0])
              const percentage = (spent / budget.amount) * 100
              return (
                <article className="budget-item spacious-card" key={budget.id}>
                  <div className="budget-item-top">
                    <span
                      className={`category-icon ${categoryTone(budget.name)}`}
                    >
                      <CategoryIcon category={budget.name} />
                    </span>
                    <div>
                      <strong>{budget.name}</strong>
                      <small>
                        {eur(spent)} de {eur(budget.amount)}
                      </small>
                    </div>
                    <strong>{percentage.toFixed(0)}%</strong>
                  </div>
                  <Progress
                    value={percentage}
                    tone={
                      percentage > 100
                        ? "red"
                        : percentage > 80
                          ? "amber"
                          : "green"
                    }
                  />
                </article>
              )
            })}
          </div>
        </>
      )}
      {tab === "goals" && (
        <>
          <div className="section-heading">
            <h2>Objetivos ativos</h2>
            <Button variant="ghost" onClick={onAddGoal}>
              <Icon name="plus" size={16} /> Novo
            </Button>
          </div>
          <div className="goals-grid">
            {goals.map((goal) => {
              const percentage = (goal.currentAmount / goal.targetAmount) * 100
              return (
                <article className="goal-card spacious-card" key={goal.id}>
                  <span className="goal-simple-icon">
                    <Icon name="target" />
                  </span>
                  <h3>{goal.name}</h3>
                  <strong>
                    {eur(goal.currentAmount)}{" "}
                    <small>de {eur(goal.targetAmount)}</small>
                  </strong>
                  <Progress value={percentage} />
                  <div className="goal-meta">
                    <span>{percentage.toFixed(0)}% concluído</span>
                    <span>
                      faltam {eur(goal.targetAmount - goal.currentAmount)}
                    </span>
                  </div>
                  <Button variant="secondary" onClick={() => onAddMoney(goal)}>
                    Adicionar dinheiro
                  </Button>
                </article>
              )
            })}
          </div>
        </>
      )}
      {tab === "recurring" && (
        <div className="recurring-list">
          {recurring.map((item) => (
            <article key={item.id}>
              <span className={`category-icon ${categoryTone(item.category)}`}>
                <CategoryIcon category={item.category} />
              </span>
              <span>
                <strong>{item.description}</strong>
                <small>{item.category} · mensal</small>
              </span>
              <span>
                <strong>{eur(item.amount)}</strong>
                <small>Próximo mês</small>
              </span>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
