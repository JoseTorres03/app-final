import type { Transaction } from "./types"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { normalizeCategory } from "./data"

interface PdfTextFragment {
  x: number
  text: string
}

const clean = (value: string) => value.trim().replace(/^["']|["']$/g, "")
const normalizeHeader = (value: string) =>
  clean(value)
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const splitLine = (line: string, delimiter: string) => {
  const result: string[] = []
  let current = ""
  let quoted = false
  for (const character of line) {
    if (character === '"') quoted = !quoted
    else if (character === delimiter && !quoted) {
      result.push(clean(current))
      current = ""
    } else current += character
  }
  result.push(clean(current))
  return result
}

const parseAmount = (value = "") => {
  const normalized = value
    .replace(/[€\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
  return Number(normalized) || 0
}

const parseDate = (value: string, fallbackYear?: string) => {
  const cleanDate = clean(value).split(" ")[0]
  const parts = cleanDate.split(/[./-]/)
  if (parts.length === 2) {
    const year = fallbackYear || String(new Date().getFullYear())
    return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
  }
  if (parts.length !== 3) return new Date().toISOString().slice(0, 10)
  if (parts[0].length === 4)
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
  const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
  return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
}

export const suggestCategory = (description: string, accountId: string) => {
  const value = description.toLocaleLowerCase("pt-PT")
  const joint = accountId === "joint"
  if (/pingo|continente|auchan|lidl|mercadona|intermarch/.test(value))
    return joint ? "Alimentação conjunto" : "Alimentação individual"
  if (/rest|café|coffee|taberna|uber eats|glovo/.test(value))
    return joint ? "Saídas conjunto" : "Saídas individual"
  if (/edp|epal|renda|meo|vodafone|nos|seguro|escola/.test(value))
    return "Despesas família"
  if (/galp|bp|repsol|navegante|metro|uber|bolt/.test(value))
    return joint ? "Viagens conjunto" : "Viagens individual"
  if (/farmácia|clinica|clínica|hospital|fitness|ginásio/.test(value))
    return "Saúde"
  if (
    /netflix|spotify|hbo|disney|cinema|teatro|museu|música|musica/.test(value)
  )
    return "Lazer (música/desporto)"
  if (/presente|prenda|gift|brinquedo/.test(value))
    return "Prendas (natal/aniv)"
  return "Despesas família"
}

export const transactionKey = (
  item: Pick<Transaction, "date" | "amount" | "description" | "accountId" | "type">,
) =>
  `${item.date}|${item.amount.toFixed(2)}|${item.description.trim().toLocaleLowerCase("pt-PT")}|${item.accountId}|${item.type}`

const hash = (value: string) => {
  let result = 0
  for (let index = 0; index < value.length; index++)
    result = (result * 31 + value.charCodeAt(index)) >>> 0
  return result.toString(36)
}

export function parseCsv(
  contents: string,
  accountId: string,
  sourceFile: string,
): Transaction[] {
  const lines = contents
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim())
  if (lines.length < 2) return []
  const candidates = [";", ",", "\t"]
  const delimiter = candidates.sort(
    (a, b) => splitLine(lines[0], b).length - splitLine(lines[0], a).length,
  )[0]
  const headers = splitLine(lines[0], delimiter).map(normalizeHeader)
  const column = (...names: string[]) =>
    headers.findIndex((header) => names.some((name) => header.includes(name)))
  const dateIndex = column("data", "date")
  const descriptionIndex = column(
    "descricao",
    "descritivo",
    "movimento",
    "merchant",
  )
  const amountIndex = column("montante", "valor", "amount")
  const debitIndex = column("debito", "debit")
  const creditIndex = column("credito", "credit")
  const categoryIndex = column("categoria", "category")

  return lines.slice(1).flatMap((line) => {
    const values = splitLine(line, delimiter)
    const description = clean(values[descriptionIndex] || "Movimento importado")
    const debit = debitIndex >= 0 ? parseAmount(values[debitIndex]) : 0
    const credit = creditIndex >= 0 ? parseAmount(values[creditIndex]) : 0
    const rawAmount =
      debitIndex >= 0 || creditIndex >= 0
        ? credit - Math.abs(debit)
        : parseAmount(values[amountIndex])
    if (!rawAmount) return []
    const type = rawAmount < 0 ? "expense" : "income"
    const suppliedCategory = clean(values[categoryIndex] || "")
    const transaction: Transaction = {
      id: "",
      description,
      amount: Math.abs(rawAmount),
      type,
      category:
        type === "income"
          ? "Rendimentos"
          : suppliedCategory
            ? normalizeCategory(suppliedCategory, accountId, type)
            : suggestCategory(description, accountId),
      accountId,
      ownerId: "household",
      householdId: "h1",
      visibility: "shared",
      date: parseDate(values[dateIndex] || ""),
      splitType: "individual",
      status: "confirmed",
      sourceFile,
    }
    transaction.importId = hash(transactionKey(transaction))
    transaction.id = `imp-${transaction.importId}`
    return [transaction]
  })
}

const parsePdfLine = (
  line: string,
  accountId: string,
  sourceFile: string,
  fallbackYear: string,
): Transaction | null => {
  const normalizedLine = line
    .replace(/(\d)\s*([,.])\s*(\d)/g, "$1$2$3")
    .replace(/([+-])\s+(?=\d)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
  const numericDatePattern =
    /^(\d{1,2}[./-]\d{1,2}(?:[./-](?:\d{2}|\d{4}))?)(?=\s)/
  const writtenDatePattern =
    /^(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s+de(?=\s)/i
  const numericDateMatch = normalizedLine.match(numericDatePattern)
  const writtenDateMatch = normalizedLine.match(writtenDatePattern)
  const amountMatches = [
    ...normalizedLine.matchAll(
      /(?:^|\s)([-+]?(?:\d{1,3}(?:[.\s]\d{3})+|\d+)[,.]\d{2})\s*(?:€|EUR)?(?=\s|$)/gi,
    ),
  ]
  if ((!numericDateMatch && !writtenDateMatch) || !amountMatches.length)
    return null

  const amountMatch = amountMatches[0]
  const amountText = amountMatch[1].replace(/\s/g, "")
  const amount = Math.abs(parseAmount(amountText))
  if (!amount) return null

  const writtenMonths: Record<string, string> = {
    jan: "01",
    fev: "02",
    mar: "03",
    abr: "04",
    mai: "05",
    jun: "06",
    jul: "07",
    ago: "08",
    set: "09",
    out: "10",
    nov: "11",
    dez: "12",
  }
  const dateEnd = (numericDateMatch || writtenDateMatch)?.[0].length || 0
  const transactionDate = numericDateMatch
    ? parseDate(numericDateMatch[1], fallbackYear)
    : `${fallbackYear}-${writtenMonths[writtenDateMatch?.[2].toLowerCase() || ""]}-${String(writtenDateMatch?.[1] || "").padStart(2, "0")}`
  const description = normalizedLine
    .slice(
      dateEnd,
      amountMatch.index === undefined
        ? normalizedLine.length
        : amountMatch.index,
    )
    .replace(/^\s*\d{1,2}[./-]\d{1,2}(?:[./-](?:\d{2}|\d{4}))?\s*/, "")
    .replace(
      /^\s*\d{1,2}\s+de\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s+de\s*/i,
      "",
    )
    .replace(/\b(?:data valor|movimento|descrição|descritivo)\b/gi, "")
    .trim()
  if (!description || description.length < 2) return null

  // This statement format uses a signed transaction amount followed by the
  // account balance. The first amount is therefore authoritative.
  const type = /^-/.test(amountText) ? "expense" : "income"
  const transaction: Transaction = {
    id: "",
    description,
    amount,
    type,
    category:
      type === "income"
        ? "Rendimentos"
        : suggestCategory(description, accountId),
    accountId,
    ownerId: "household",
    householdId: "h1",
    visibility: "shared",
    date: transactionDate,
    splitType: "individual",
    status: "confirmed",
    sourceFile,
  }
  transaction.importId = hash(transactionKey(transaction))
  transaction.id = `imp-${transaction.importId}`
  return transaction
}

export async function parsePdf(
  contents: ArrayBuffer,
  accountId: string,
  sourceFile: string,
): Promise<Transaction[]> {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const document = await pdfjs.getDocument({ data: new Uint8Array(contents) })
    .promise
  const lines: string[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const rows = new Map<number, PdfTextFragment[]>()
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue
      const x = item.transform[4]
      const y = Math.round(item.transform[5] / 2) * 2
      rows.set(y, [...(rows.get(y) || []), { x, text: item.str.trim() }])
    }
    ;[...rows.entries()]
      .sort(([first], [second]) => second - first)
      .forEach(([, items]) =>
        lines.push(
          items
            .sort((first, second) => first.x - second.x)
            .map((item) => item.text)
            .join(" "),
        ),
      )
  }

  const candidates = lines.flatMap((line, index) => [
    line,
    `${line} ${lines[index + 1] || ""}`,
    `${line} ${lines[index + 1] || ""} ${lines[index + 2] || ""}`,
  ])
  const allText = lines.join(" ")
  const fallbackYear =
    allText.match(/\b((?:19|20)\d{2})[./-]\d{2}[./-]\d{2}\b/)?.[1] ||
    allText.match(
      /\b\d{1,2}\s+de\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s+de\s+((?:19|20)\d{2})\b/i,
    )?.[1] ||
    String(new Date().getFullYear())
  const transactions = candidates.flatMap((line) => {
    const transaction = parsePdfLine(line, accountId, sourceFile, fallbackYear)
    return transaction ? [transaction] : []
  })
  return transactions.filter(
    (item, index, collection) =>
      collection.findIndex(
        (candidate) => transactionKey(candidate) === transactionKey(item),
      ) === index,
  )
}

export function exportCsv(transactions: Transaction[]) {
  const quote = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`
  const rows = transactions.map((item) =>
    [
      item.date,
      item.description,
      item.type,
      item.category,
      item.amount.toFixed(2).replace(".", ","),
      item.accountId,
      item.sourceFile || "",
    ]
      .map(quote)
      .join(";"),
  )
  return `\uFEFFData;Descrição;Tipo;Categoria;Valor;Conta;Ficheiro\n${rows.join("\n")}`
}
