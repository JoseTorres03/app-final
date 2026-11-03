import { useEffect, useMemo, useState } from "react"
import {
  accounts,
  expenseCategories,
  initialState,
  normalizeCategory,
} from "./data"
import { eur } from "./finance"
import { parseCsv, parsePdf, transactionKey } from "./import"
import { supabase } from "./lib/supabase"
import AuthScreen from "./components/AuthScreen"
import type {
  AppState,
  Budget,
  Goal,
  ImportedFile,
  Transaction,
  TransactionType,
} from "./types"
import {
  AccountsScreen,
  CategoriesScreen,
  PlanningScreen,
  SummaryScreen,
  TransactionsScreen,
} from "./components/screens"
import { Button, CategoryIcon, Icon } from "./components/ui"
import PeriodBar, {
  type PeriodPreset,
  type PeriodRange,
} from "./components/PeriodBar"

type Screen = "summary" | "transactions" | "categories" | "accounts" | "planning"
type Sheet = "transaction" | "detail" | "import" | "budget" | "goal" | "contribution" | null

const STORAGE_KEY = "entre-finance-v2"
const LEGACY_STORAGE_KEY = "entre-finance-demo-v1"
const RESET_MARKER = "entre-finance-cleared-v2"
const CATEGORY_MIGRATION_MARKER = "entre-finance-categories-v3"

function loadState(): AppState {
  try {
    if (!localStorage.getItem(RESET_MARKER)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem(RESET_MARKER, "true")
      return { ...initialState, onboardingComplete: true }
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...initialState, onboardingComplete: true }
    const parsed = JSON.parse(stored) as Partial<AppState>
    const migratedTransactions = (
      parsed.transactions || initialState.transactions
    ).map((item) => {
      const accountId =
        item.accountId === "sofia-current"
          ? "mariana-current"
          : item.accountId === "savings"
            ? "joint"
            : item.accountId
      return {
        ...item,
        accountId,
        ownerId: item.ownerId === "sofia" ? "mariana" : item.ownerId,
        category: normalizeCategory(item.category, accountId, item.type),
      }
    })
    return {
      ...initialState,
      ...parsed,
      transactions: migratedTransactions,
      budgets: parsed.budgets || initialState.budgets,
      goals: parsed.goals || initialState.goals,
      importedFiles: (parsed.importedFiles || []).map((file) => ({
        ...file,
        accountId:
          file.accountId === "sofia-current"
            ? "mariana-current"
            : file.accountId === "savings"
              ? "joint"
              : file.accountId,
      })),
      onboardingComplete: true,
    }
  } catch {
    return { ...initialState, onboardingComplete: true }
  }
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [state, setState] = useState<AppState>(loadState)
  const [screen, setScreen] = useState<Screen>("summary")
  const [sheet, setSheet] = useState<Sheet>(null)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [toast, setToast] = useState("")
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("all")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoadingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    if (!localStorage.getItem(RESET_MARKER)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem(RESET_MARKER, "true")
      setState({ ...initialState, onboardingComplete: true })
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    document.documentElement.dataset.theme = "light"
  }, [state, session])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(""), 2800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (localStorage.getItem(CATEGORY_MIGRATION_MARKER)) return
    setState((current) => ({
      ...current,
      transactions: current.transactions.map((item) => ({
        ...item,
        category: normalizeCategory(item.category, item.accountId, item.type),
      })),
    }))
    localStorage.setItem(CATEGORY_MIGRATION_MARKER, "true")
  }, [])

  useEffect(() => {
    const scrollArea = document.querySelector<HTMLElement>(".scroll-area")
    if (!scrollArea) return
    let touchStartY = 0
    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY || 0
    }
    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY || 0
      const movingDown = currentY > touchStartY
      const movingUp = currentY < touchStartY
      const atTop = scrollArea.scrollTop <= 0
      const atBottom =
        Math.ceil(scrollArea.scrollTop + scrollArea.clientHeight) >=
        scrollArea.scrollHeight
      if ((atTop && movingDown) || (atBottom && movingUp))
        event.preventDefault()
    }
    scrollArea.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    })
    scrollArea.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    })
    return () => {
      scrollArea.removeEventListener("touchstart", handleTouchStart)
      scrollArea.removeEventListener("touchmove", handleTouchMove)
    }
  }, [])

  const transactions = useMemo(() => state.transactions, [state.transactions])
  const transactionLimits = useMemo(() => {
    const dates = transactions.map((item) => item.date).sort()
    const today = new Date().toISOString().slice(0, 10)
    return {
      first: dates[0] || today,
      last: dates[dates.length - 1] || today,
    }
  }, [transactions])
  const periodRange = useMemo<PeriodRange>(() => {
    const end = transactionLimits.last
    const endDate = new Date(`${end}T12:00:00`)
    if (periodPreset === "month") return { start: `${end.slice(0, 7)}-01`, end }
    if (periodPreset === "30days") {
      const start = new Date(endDate)
      start.setDate(start.getDate() - 29)
      return { start: start.toISOString().slice(0, 10), end }
    }
    if (periodPreset === "3months") {
      const start = new Date(endDate)
      start.setMonth(start.getMonth() - 2, 1)
      return { start: start.toISOString().slice(0, 10), end }
    }
    if (periodPreset === "year")
      return { start: `${end.slice(0, 4)}-01-01`, end }
    if (periodPreset === "custom")
      return {
        start: customStart || transactionLimits.first,
        end: customEnd || transactionLimits.last,
      }
    return { start: transactionLimits.first, end: transactionLimits.last }
  }, [customEnd, customStart, periodPreset, transactionLimits])
  const periodTransactions = useMemo(
    () =>
      transactions.filter(
        (item) =>
          item.date >= periodRange.start && item.date <= periodRange.end,
      ),
    [periodRange, transactions],
  )
  const closeSheet = () => {
    setSheet(null)
    setSelected(null)
  }
  const detail = (item: Transaction) => {
    setSelected(item)
    setSheet("detail")
  }
  const updateTransaction = (transaction: Transaction) => {
    setState((current) => ({
      ...current,
      transactions: current.transactions.some(
        (item) => item.id === transaction.id,
      )
        ? current.transactions.map((item) =>
            item.id === transaction.id ? transaction : item,
          )
        : [...current.transactions, transaction],
    }))
    if (
      transaction.date < periodRange.start ||
      transaction.date > periodRange.end
    )
      setPeriodPreset("all")
    setToast(selected ? "Movimento atualizado" : "Movimento adicionado")
    closeSheet()
  }
  const deleteTransaction = () => {
    if (!selected) return
    setState((current) => ({
      ...current,
      transactions: current.transactions.filter(
        (item) => item.id !== selected.id,
      ),
    }))
    setToast("Movimento eliminado")
    closeSheet()
  }
  const deleteTransactions = (ids: string[]) => {
    const selectedIds = new Set(ids)
    setState((current) => ({
      ...current,
      transactions: current.transactions.filter(
        (item) => !selectedIds.has(item.id),
      ),
    }))
    setToast(
      `${ids.length} ${
        ids.length === 1 ? "movimento eliminado" : "movimentos eliminados"
      }`,
    )
  }
  const categorizeTransactions = (ids: string[], category: string) => {
    const selectedIds = new Set(ids)
    setState((current) => ({
      ...current,
      transactions: current.transactions.map((item) =>
        selectedIds.has(item.id) ? { ...item, category } : item,
      ),
    }))
    setToast(
      `${ids.length} ${
        ids.length === 1 ? "movimento atualizado" : "movimentos atualizados"
      }`,
    )
  }
  const importTransactions = (imported: Transaction[], file: ImportedFile) => {
    setState((current) => ({
      ...current,
      transactions: [...current.transactions, ...imported],
      importedFiles: [...(current.importedFiles || []), file],
    }))
    setToast(
      file.added
        ? `${file.added} movimentos importados`
        : "Nenhum movimento novo; duplicados ignorados",
    )
    closeSheet()
  }
  const downloadTransactions = async () => {
    try {
      const XLSX = await import("xlsx")
      const rows = [...periodTransactions]
        .sort((first, second) => second.date.localeCompare(first.date))
        .map((item) => ({
          Data: new Date(`${item.date}T12:00:00`),
          Descrição: item.description,
          Tipo:
            item.type === "income"
              ? "Receita"
              : item.type === "expense"
                ? "Despesa"
                : "Transferência",
          Categoria: item.category,
          Valor:
            item.type === "expense"
              ? -item.amount
              : item.type === "income"
                ? item.amount
                : item.amount,
          Conta:
            accounts.find((account) => account.id === item.accountId)?.name ||
            item.accountId,
          Origem: item.sourceFile || "Registo manual",
        }))
      const worksheet = XLSX.utils.json_to_sheet(rows, {
        cellDates: true,
        dateNF: "dd/mm/yyyy",
      })
      worksheet["!cols"] = [
        { wch: 13 },
        { wch: 38 },
        { wch: 16 },
        { wch: 20 },
        { wch: 16 },
        { wch: 24 },
        { wch: 28 },
      ]
      if (rows.length) {
        worksheet["!autofilter"] = { ref: `A1:G${rows.length + 1}` }
        for (let row = 2; row <= rows.length + 1; row++) {
          if (worksheet[`A${row}`]) worksheet[`A${row}`].z = "dd/mm/yyyy"
          if (worksheet[`E${row}`])
            worksheet[`E${row}`].z = "#,##0.00 [$€-pt-PT]"
        }
      }
      const workbook = XLSX.utils.book_new()
      workbook.Props = {
        Title: "Movimentos financeiros",
        Subject: "Exportação da aplicação Entre",
        Author: "Entre",
      }
      XLSX.utils.book_append_sheet(workbook, worksheet, "Movimentos")
      XLSX.writeFile(
        workbook,
        `movimentos-entre-${new Date().toISOString().slice(0, 10)}.xlsx`,
        { compression: true },
      )
      setToast("Ficheiro Excel exportado")
    } catch {
      setToast("Não foi possível criar o ficheiro Excel")
    }
  }

  const screens: Record<Screen, React.ReactNode> = {
    summary: (
      <SummaryScreen
        transactions={periodTransactions}
        onDetail={detail}
        onAdd={() => {
          setSelected(null)
          setSheet("transaction")
        }}
        onImport={() => setSheet("import")}
        onGoTransactions={() => setScreen("transactions")}
      />
    ),
    transactions: (
      <TransactionsScreen
        transactions={periodTransactions}
        onDetail={detail}
        onAdd={() => {
          setSelected(null)
          setSheet("transaction")
        }}
        onImport={() => setSheet("import")}
        onExport={downloadTransactions}
        onBulkDelete={deleteTransactions}
        onBulkCategory={categorizeTransactions}
      />
    ),
    categories: (
      <CategoriesScreen transactions={periodTransactions} onDetail={detail} />
    ),
    accounts: (
      <AccountsScreen
        transactions={periodTransactions}
        onImport={() => setSheet("import")}
      />
    ),
    planning: (
      <PlanningScreen
        transactions={periodTransactions}
        budgets={state.budgets}
        goals={state.goals}
        onAddBudget={() => setSheet("budget")}
        onAddGoal={() => setSheet("goal")}
        onAddMoney={(goal) => {
          setSelectedGoal(goal)
          setSheet("contribution")
        }}
      />
    ),
  }

  if (loadingSession) {
    return (
      <div className="app-shell">
        <div className="mobile-frame redesigned-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>A carregar sessão...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  return (
    <div className="app-shell">
      <div className="mobile-frame redesigned-frame">
        <div className="scroll-area">
          <PeriodBar
            preset={periodPreset}
            start={customStart}
            end={customEnd}
            range={periodRange}
            count={periodTransactions.length}
            onPreset={(preset) => {
              setPeriodPreset(preset)
              if (preset === "custom") {
                if (!customStart) setCustomStart(transactionLimits.first)
                if (!customEnd) setCustomEnd(transactionLimits.last)
              }
            }}
            onStart={setCustomStart}
            onEnd={setCustomEnd}
          />
          {screens[screen]}
        </div>
        <nav className="bottom-nav redesigned-nav">
          <NavButton
            active={screen === "summary"}
            icon="home"
            label="Resumo"
            onClick={() => setScreen("summary")}
          />
          <NavButton
            active={screen === "transactions"}
            icon="activity"
            label="Movimentos"
            onClick={() => setScreen("transactions")}
          />
          <NavButton
            active={screen === "categories"}
            icon="chart"
            label="Categorias"
            onClick={() => setScreen("categories")}
          />
          <NavButton
            active={screen === "accounts"}
            icon="wallet"
            label="Contas"
            onClick={() => setScreen("accounts")}
          />
          <NavButton
            active={screen === "planning"}
            icon="target"
            label="Planear"
            onClick={() => setScreen("planning")}
          />
        </nav>
      </div>
      {sheet && (
        <div
          className="overlay"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeSheet()
          }
        >
          {sheet === "import" && (
            <ImportSheet
              existing={transactions}
              history={state.importedFiles || []}
              onClose={closeSheet}
              onImport={importTransactions}
            />
          )}
          {sheet === "transaction" && (
            <TransactionForm
              initial={selected}
              onClose={closeSheet}
              onSave={updateTransaction}
            />
          )}
          {sheet === "detail" && selected && (
            <TransactionDetail
              item={selected}
              onClose={closeSheet}
              onEdit={() => setSheet("transaction")}
              onDelete={deleteTransaction}
            />
          )}
          {sheet === "budget" && (
            <SimpleCreate
              title="Novo orçamento"
              fields={["Categoria", "Limite mensal"]}
              onClose={closeSheet}
              onSave={(values) => {
                const budget: Budget = {
                  id: crypto.randomUUID(),
                  name: values[0] || "Despesas família",
                  amount: Number(values[1].replace(",", ".")) || 200,
                  categoryIds: [values[0] || "Despesas família"],
                  visibility: "shared",
                  period: "monthly",
                }
                setState((current) => ({
                  ...current,
                  budgets: [...current.budgets, budget],
                }))
                setToast("Orçamento criado")
                closeSheet()
              }}
            />
          )}
          {sheet === "goal" && (
            <SimpleCreate
              title="Novo objetivo"
              fields={["Nome do objetivo", "Valor pretendido"]}
              onClose={closeSheet}
              onSave={(values) => {
                const goal: Goal = {
                  id: crypto.randomUUID(),
                  name: values[0] || "Novo objetivo",
                  targetAmount: Number(values[1].replace(",", ".")) || 1000,
                  currentAmount: 0,
                  targetDate: "2026-06-01",
                  visibility: "shared",
                  contributions: [],
                }
                setState((current) => ({
                  ...current,
                  goals: [...current.goals, goal],
                }))
                setToast("Objetivo criado")
                closeSheet()
              }}
            />
          )}
          {sheet === "contribution" && selectedGoal && (
            <SimpleCreate
              title={`Adicionar a ${selectedGoal.name}`}
              fields={["Valor"]}
              onClose={closeSheet}
              onSave={(values) => {
                const amount = Number(values[0].replace(",", ".")) || 0
                setState((current) => ({
                  ...current,
                  goals: current.goals.map((goal) =>
                    goal.id === selectedGoal.id
                      ? {
                          ...goal,
                          currentAmount: goal.currentAmount + amount,
                          contributions: [
                            ...goal.contributions,
                            { userId: "miguel", amount },
                          ],
                        }
                      : goal,
                  ),
                }))
                setToast(`${eur(amount)} adicionados`)
                closeSheet()
              }}
            />
          )}
        </div>
      )}
      {toast && (
        <div className="toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  )
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: "home" | "activity" | "chart" | "wallet" | "target"
  label: string
  onClick: () => void
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  )
}

function ImportSheet({
  existing,
  history,
  onClose,
  onImport,
}: {
  existing: Transaction[]
  history: ImportedFile[]
  onClose: () => void
  onImport: (items: Transaction[], file: ImportedFile) => void
}) {
  const [accountId, setAccountId] = useState("miguel-current")
  const [fileName, setFileName] = useState("")
  const [parsed, setParsed] = useState<Transaction[]>([])
  const [error, setError] = useState("")
  const [isReading, setIsReading] = useState(false)
  const existingKeys = new Set(existing.map(transactionKey))
  const existingImportIds = new Set(
    existing.map((item) => item.importId).filter(Boolean),
  )
  const unique = parsed.filter(
    (item, index, collection) =>
      !existingKeys.has(transactionKey(item)) &&
      !existingImportIds.has(item.importId) &&
      collection.findIndex(
        (candidate) =>
          candidate.importId === item.importId ||
          transactionKey(candidate) === transactionKey(item),
      ) === index,
  )
  const duplicates = parsed.length - unique.length

  const readFile = async (file?: File) => {
    if (!file) return
    setError("")
    setFileName(file.name)
    setIsReading(true)
    try {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLocaleLowerCase("pt-PT").endsWith(".pdf")
      const result = isPdf
        ? await parsePdf(await file.arrayBuffer(), accountId, file.name)
        : parseCsv(await file.text(), accountId, file.name)
      setParsed(result)
      if (!result.length)
        setError(
          isPdf
            ? "Não encontrámos movimentos. O PDF deve conter texto pesquisável; documentos digitalizados ainda não são suportados."
            : "Não encontrámos movimentos. Confirma se o CSV inclui Data, Descrição e Valor.",
        )
    } catch {
      setParsed([])
      setError(
        "Não foi possível interpretar o ficheiro. Confirma se não está protegido por palavra-passe.",
      )
    } finally {
      setIsReading(false)
    }
  }

  return (
    <div className="sheet import-sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <button onClick={onClose}>
          <Icon name="close" />
        </button>
        <h2>Importar extrato</h2>
        <span />
      </header>
      {!fileName ? (
        <>
          <div className="import-intro">
            <span>
              <Icon name="upload" size={28} />
            </span>
            <h3>Adiciona um extrato</h3>
            <p>
              Importa CSV ou PDF. Os movimentos ficam guardados neste
              dispositivo e os duplicados são ignorados automaticamente.
            </p>
          </div>
          <label className="account-select-label">
            <span>Conta de destino</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.institution} · {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="drop-zone">
            <input
              type="file"
              accept=".csv,.pdf,text/csv,application/pdf"
              onChange={(event) => readFile(event.target.files?.[0])}
            />
            <Icon name="file" size={26} />
            <strong>Escolher CSV ou PDF</strong>
            <small>PDF com texto pesquisável, sem palavra-passe</small>
          </label>
          <div className="future-formats">
            <span>
              <strong>CSV</strong>
              <small>Disponível</small>
            </span>
            <span>
              <strong>PDF</strong>
              <small>Disponível</small>
            </span>
            <span>
              <strong>Excel</strong>
              <small>Em preparação</small>
            </span>
          </div>
          {history.length > 0 && (
            <section className="import-history">
              <h3>Importações recentes</h3>
              {history
                .slice(-3)
                .reverse()
                .map((file) => (
                  <div key={file.id}>
                    <Icon name="file" size={17} />
                    <span>
                      <strong>{file.name}</strong>
                      <small>{file.added} movimentos adicionados</small>
                    </span>
                  </div>
                ))}
            </section>
          )}
        </>
      ) : (
        <>
          <div className="file-summary">
            <span>
              <Icon name="file" />
            </span>
            <div>
              <strong>{fileName}</strong>
              <small>
                {parsed.length} linhas reconhecidas · {accountName(accountId)}
              </small>
            </div>
            <button
              onClick={() => {
                setFileName("")
                setParsed([])
              }}
            >
              Alterar
            </button>
          </div>
          {isReading ? (
            <div className="import-loading">
              <span />
              <strong>A ler o extrato…</strong>
              <small>A estrutura e os movimentos estão a ser analisados.</small>
            </div>
          ) : error ? (
            <p className="import-error">{error}</p>
          ) : (
            <>
              <div className="import-results">
                <article>
                  <strong>{unique.length}</strong>
                  <span>Novos</span>
                </article>
                <article>
                  <strong>{duplicates}</strong>
                  <span>Duplicados</span>
                </article>
                <article>
                  <strong>{eur(totalsForImport(unique))}</strong>
                  <span>Impacto líquido</span>
                </article>
              </div>
              <div className="import-preview">
                <h3>Pré-visualização</h3>
                {parsed.slice(0, 4).map((item) => (
                  <div key={`${item.id}-${item.date}`}>
                    <span>
                      <strong>{item.description}</strong>
                      <small>
                        {item.date} · {item.category}
                      </small>
                    </span>
                    <strong
                      className={item.type === "income" ? "positive" : ""}
                    >
                      {item.type === "income" ? "+" : "−"}
                      {eur(item.amount)}
                    </strong>
                  </div>
                ))}
              </div>
              {duplicates > 0 && (
                <p
                  className={`duplicate-note ${
                    unique.length === 0 ? "all-duplicates" : ""
                  }`}
                >
                  <Icon name="check" size={16} />
                  {unique.length === 0
                    ? `Ficheiro lido com sucesso. Os ${duplicates} movimentos já existem na aplicação.`
                    : `${duplicates} ${
                        duplicates === 1
                          ? "movimento repetido será ignorado"
                          : "movimentos repetidos serão ignorados"
                      }.`}
                </p>
              )}
              <Button
                className="import-confirm"
                onClick={() =>
                  onImport(unique, {
                    id: crypto.randomUUID(),
                    name: fileName,
                    accountId,
                    importedAt: new Date().toISOString(),
                    added: unique.length,
                    duplicates,
                  })
                }
              >
                {unique.length
                  ? `Importar ${unique.length} movimentos`
                  : "Concluir"}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}

const accountName = (id: string) =>
  accounts.find((account) => account.id === id)?.name || "Conta"

const totalsForImport = (items: Transaction[]) =>
  items.reduce(
    (sum, item) =>
      sum +
      (item.type === "income"
        ? item.amount
        : item.type === "expense"
          ? -item.amount
          : 0),
    0,
  )

function TransactionForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Transaction | null
  onClose: () => void
  onSave: (item: Transaction) => void
}) {
  const [type, setType] = useState<TransactionType>(initial?.type || "expense")
  const [amount, setAmount] = useState(initial?.amount.toString() || "")
  const [description, setDescription] = useState(initial?.description || "")
  const [category, setCategory] = useState(
    normalizeCategory(
      initial?.category || "Alimentação conjunto",
      initial?.accountId || "joint",
      initial?.type || "expense",
    ),
  )
  const [accountId, setAccountId] = useState(initial?.accountId || "joint")
  const [date, setDate] = useState(
    initial?.date || new Date().toISOString().slice(0, 10),
  )
  const [note, setNote] = useState(initial?.note || "")
  const [recurring, setRecurring] = useState(initial?.recurring || false)
  const selectedAccount = accounts.find((account) => account.id === accountId)
  const availableCategories =
    type === "income"
      ? ["Rendimentos"]
      : type === "transfer"
        ? ["Transferência"]
        : expenseCategories

  useEffect(() => {
    if (!availableCategories.includes(category))
      setCategory(availableCategories[0])
  }, [availableCategories, category])
  return (
    <div className="sheet transaction-sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <button onClick={onClose}>
          <Icon name="close" />
        </button>
        <h2>{initial ? "Corrigir movimento" : "Novo movimento"}</h2>
        <button
          className="save-link"
          onClick={() =>
            amount &&
            description &&
            onSave({
              ...initial,
              id: initial?.id || crypto.randomUUID(),
              description,
              amount: Number(amount.replace(",", ".")),
              type,
              category,
              accountId,
              ownerId: selectedAccount?.ownerId || "household",
              householdId: "h1",
              visibility:
                selectedAccount?.visibility || initial?.visibility || "shared",
              date,
              splitType: initial?.splitType || "individual",
              status: initial?.status || "confirmed",
              recurring,
              note: note.trim() || undefined,
            })
          }
        >
          Guardar
        </button>
      </header>
      <div className="type-switch">
        {(["expense", "income", "transfer"] as TransactionType[]).map(
          (item) => (
            <button
              className={type === item ? "active" : ""}
              onClick={() => setType(item)}
              key={item}
            >
              {item === "expense"
                ? "Despesa"
                : item === "income"
                  ? "Receita"
                  : "Transferência"}
            </button>
          ),
        )}
      </div>
      <label className="amount-input">
        <span>Valor</span>
        <div>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
          />
          <strong>€</strong>
        </div>
      </label>
      <div className="form-grid">
        <label>
          <span>Descrição</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          <span>Categoria</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {availableCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Conta de origem</span>
          <select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts.map((account) => (
              <option value={account.id} key={account.id}>
                {account.institution} · {account.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Data</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          <span>Notas opcionais</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Informação adicional sobre o movimento"
            rows={3}
          />
        </label>
        <label className="recurring-toggle">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(event) => setRecurring(event.target.checked)}
          />
          <span>
            <strong>Movimento recorrente</strong>
            <small>Repete-se regularmente, por exemplo todos os meses.</small>
          </span>
        </label>
      </div>
      {initial?.sourceFile && (
        <p className="source-note">
          Importado de <strong>{initial.sourceFile}</strong>. A correção não
          altera o ficheiro original.
        </p>
      )}
    </div>
  )
}

function TransactionDetail({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: Transaction
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="sheet detail-sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <button onClick={onClose}>
          <Icon name="close" />
        </button>
        <h2>Movimento</h2>
        <span />
      </header>
      <div className="detail-amount">
        <span className="category-icon sage">
          <CategoryIcon category={item.category} />
        </span>
        <p>{item.description}</p>
        <strong className={item.type === "income" ? "positive" : ""}>
          {item.type === "expense" ? "−" : item.type === "income" ? "+" : ""}
          {eur(item.amount)}
        </strong>
        <span>{dateLabel(item.date)}</span>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Categoria</dt>
          <dd>{item.category}</dd>
        </div>
        <div>
          <dt>Conta</dt>
          <dd>{accountName(item.accountId)}</dd>
        </div>
        <div>
          <dt>Origem</dt>
          <dd>{item.sourceFile || "Registo manual"}</dd>
        </div>
      </dl>
      <div className="detail-actions">
        <Button variant="secondary" onClick={onEdit}>
          <Icon name="edit" /> Corrigir
        </Button>
        <Button variant="ghost" onClick={onDelete}>
          <Icon name="trash" /> Eliminar
        </Button>
      </div>
    </div>
  )
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`))
}

function SimpleCreate({
  title,
  fields,
  onClose,
  onSave,
}: {
  title: string
  fields: string[]
  onClose: () => void
  onSave: (values: string[]) => void
}) {
  const [values, setValues] = useState(fields.map(() => ""))
  return (
    <div className="sheet small-sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <button onClick={onClose}>
          <Icon name="close" />
        </button>
        <h2>{title}</h2>
        <span />
      </header>
      <div className="form-grid">
        {fields.map((field, index) => (
          <label key={field}>
            <span>{field}</span>
            <input
              inputMode={
                field.includes("Valor") || field.includes("Limite")
                  ? "decimal"
                  : "text"
              }
              value={values[index]}
              onChange={(event) =>
                setValues(
                  values.map((value, itemIndex) =>
                    itemIndex === index ? event.target.value : value,
                  ),
                )
              }
              placeholder={field}
            />
          </label>
        ))}
      </div>
      <Button onClick={() => onSave(values)}>Guardar</Button>
    </div>
  )
}