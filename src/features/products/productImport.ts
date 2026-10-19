/**
 * Reads a product spreadsheet (.xlsx or .csv) and checks each row before anything is created.
 * An .xlsx file is a zip of XML parts; it is opened with the browser's own DecompressionStream,
 * so no spreadsheet library is needed.
 */

export const MAX_IMPORT_ROWS = 1000

/** Spreadsheet columns, in template order. The first header that matches an alias is used. */
export const IMPORT_COLUMNS = [
  { key: 'name', header: 'Name', required: true, aliases: ['name', 'product name', 'product'] },
  { key: 'code', header: 'Product code', aliases: ['product code', 'code'] },
  { key: 'sku', header: 'SKU', aliases: ['sku'] },
  { key: 'barcode', header: 'Barcode', aliases: ['barcode', 'bar code'] },
  { key: 'category', header: 'Category', aliases: ['category'] },
  { key: 'brand', header: 'Brand', aliases: ['brand'] },
  { key: 'unit', header: 'Unit', aliases: ['unit'] },
  { key: 'price', header: 'Price', required: true, aliases: ['price', 'pos price', 'selling price', 'sale price'] },
  { key: 'cost', header: 'Cost', aliases: ['cost', 'cost price'] },
  { key: 'onlinePrice', header: 'Online price', aliases: ['online price'] },
  { key: 'stock', header: 'Stock', aliases: ['stock', 'quantity', 'qty', 'stock quantity'] },
  { key: 'lowStock', header: 'Low stock alert', aliases: ['low stock alert', 'low stock', 'stock alert'] },
  { key: 'description', header: 'Description', aliases: ['description'] },
] as const

export type ImportColumnKey = (typeof IMPORT_COLUMNS)[number]['key']

export interface ImportRow {
  /** Row number as the merchant sees it in the spreadsheet (header is row 1). */
  line: number
  name: string
  code?: string
  sku?: string
  barcode?: string
  category?: string
  brand?: string
  unit?: string
  price: number
  cost?: number
  onlinePrice?: number
  stock?: number
  lowStock?: number
  description?: string
  errors: string[]
}

export interface ParsedImport {
  rows: ImportRow[]
  /** Template columns that were not found in the file. */
  missingColumns: string[]
}

const TEMPLATE_EXAMPLES = [
  ['Iced latte', 'LATTE-ICED', 'LAT-001', '8850000000011', 'Coffee', 'House blend', 'Cup', '2.50', '0.90', '2.75', '50', '5', 'Espresso with milk and ice'],
  ['Fresh milk 1L', '', 'MILK-1L', '8850000000028', 'Dairy', 'Dutch Mill', 'Bottle', '1.80', '1.20', '', '24', '6', ''],
]

/** A CSV template with a byte-order mark so Excel opens Khmer text correctly. */
export function templateCsv() {
  const lines = [IMPORT_COLUMNS.map((column) => column.header), ...TEMPLATE_EXAMPLES]
  return '﻿' + lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export async function readSpreadsheet(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return parseCsv(await file.text())
  }
  if (name.endsWith('.xlsx')) {
    return readXlsx(new Uint8Array(await file.arrayBuffer()))
  }
  throw new Error('Choose an Excel (.xlsx) or CSV file.')
}

/** RFC 4180 CSV: quoted fields may hold commas, quotes and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const source = text.replace(/^﻿/, '')
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i++ }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(cell); cell = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += char
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''))
}

/** The first worksheet of an .xlsx file as rows of text. */
async function readXlsx(bytes: Uint8Array): Promise<string[][]> {
  const entries = zipEntries(bytes)
  const read = async (path: string) => {
    const entry = entries.get(path)
    return entry ? new TextDecoder().decode(await inflate(bytes, entry)) : undefined
  }
  const workbookRels = await read('xl/_rels/workbook.xml.rels')
  const workbook = await read('xl/workbook.xml')
  let sheetPath = 'xl/worksheets/sheet1.xml'
  if (workbook && workbookRels) {
    const firstSheet = xml(workbook).getElementsByTagName('sheet')[0]
    const relationId = firstSheet?.getAttribute('r:id') ?? firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    const target = Array.from(xml(workbookRels).getElementsByTagName('Relationship'))
      .find((relation) => relation.getAttribute('Id') === relationId)?.getAttribute('Target')
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
  }
  const sheet = await read(sheetPath)
  if (!sheet) throw new Error('The Excel file has no worksheet.')
  const sharedText = await read('xl/sharedStrings.xml')
  const shared = sharedText
    ? Array.from(xml(sharedText).getElementsByTagName('si')).map((item) =>
      Array.from(item.getElementsByTagName('t')).map((t) => t.textContent ?? '').join(''))
    : []

  const rows: string[][] = []
  for (const rowElement of Array.from(xml(sheet).getElementsByTagName('row'))) {
    const cells: string[] = []
    for (const cell of Array.from(rowElement.getElementsByTagName('c'))) {
      const column = columnIndex(cell.getAttribute('r') ?? '') ?? cells.length
      const type = cell.getAttribute('t')
      const raw = cell.getElementsByTagName('v')[0]?.textContent ?? ''
      let value = raw
      if (type === 's') value = shared[Number(raw)] ?? ''
      else if (type === 'inlineStr') value = Array.from(cell.getElementsByTagName('t')).map((t) => t.textContent ?? '').join('')
      else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE'
      while (cells.length < column) cells.push('')
      cells[column] = value
    }
    rows.push(cells)
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''))
}

function xml(text: string) {
  return new DOMParser().parseFromString(text, 'application/xml')
}

/** "C7" → 2 */
function columnIndex(reference: string) {
  const letters = /^[A-Z]+/.exec(reference)?.[0]
  if (!letters) return undefined
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1
}

type ZipEntry = { offset: number; compressedSize: number; method: number }

/** Reads the zip central directory: file name → where its data starts and how it is stored. */
function zipEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = bytes.length - 22
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--
  if (end < 0) throw new Error('This is not a valid Excel file.')
  const count = view.getUint16(end + 10, true)
  let position = view.getUint32(end + 16, true)
  const entries = new Map<string, ZipEntry>()
  for (let i = 0; i < count; i++) {
    const method = view.getUint16(position + 10, true)
    const compressedSize = view.getUint32(position + 20, true)
    const nameLength = view.getUint16(position + 28, true)
    const extraLength = view.getUint16(position + 30, true)
    const commentLength = view.getUint16(position + 32, true)
    const localHeader = view.getUint32(position + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(position + 46, position + 46 + nameLength))
    const localNameLength = view.getUint16(localHeader + 26, true)
    const localExtraLength = view.getUint16(localHeader + 28, true)
    entries.set(name, { offset: localHeader + 30 + localNameLength + localExtraLength, compressedSize, method })
    position += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function inflate(bytes: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
  const data = bytes.slice(entry.offset, entry.offset + entry.compressedSize)
  if (entry.method === 0) return data
  if (entry.method !== 8) throw new Error('This Excel file uses an unsupported compression.')
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Matches headers to columns, reads each row and lists what is wrong with it. */
export function toImportRows(table: string[][], existing: { codes: Set<string>; skus: Set<string>; barcodes: Set<string> }): ParsedImport {
  if (table.length < 2) throw new Error('The file has no product rows under the header row.')
  const headers = table[0].map((header) => header.trim().toLowerCase().replace(/\s*\*$/, ''))
  const position = new Map<ImportColumnKey, number>()
  for (const column of IMPORT_COLUMNS) {
    const index = headers.findIndex((header) => (column.aliases as readonly string[]).includes(header))
    if (index >= 0) position.set(column.key, index)
  }
  const missingRequired = IMPORT_COLUMNS.filter((column) => 'required' in column && column.required && !position.has(column.key))
  if (missingRequired.length) {
    throw new Error(`The file needs these columns: ${missingRequired.map((column) => column.header).join(', ')}. Download the template to see the layout.`)
  }
  const body = table.slice(1)
  if (body.length > MAX_IMPORT_ROWS) throw new Error(`Import up to ${MAX_IMPORT_ROWS} products at a time.`)

  const seen = { codes: new Set<string>(), skus: new Set<string>(), barcodes: new Set<string>() }
  const rows = body.map((cells, index): ImportRow => {
    const text = (key: ImportColumnKey) => {
      const at = position.get(key)
      const value = at === undefined ? '' : (cells[at] ?? '').trim()
      return value || undefined
    }
    const errors: string[] = []
    const number = (key: ImportColumnKey, label: string, whole = false) => {
      const value = text(key)
      if (value === undefined) return undefined
      const parsed = Number(value.replace(/[$,៛\s]/g, ''))
      if (!Number.isFinite(parsed) || parsed < 0 || (whole && !Number.isInteger(parsed))) {
        errors.push(`${label} must be ${whole ? 'a whole number' : 'a number'} of 0 or more`)
        return undefined
      }
      return parsed
    }
    const name = text('name') ?? ''
    if (!name) errors.push('Name is missing')
    else if (name.length > 255) errors.push('Name is longer than 255 characters')
    const price = number('price', 'Price')
    if (text('price') === undefined) errors.push('Price is missing')
    const row: ImportRow = {
      line: index + 2,
      name,
      code: text('code'),
      sku: text('sku'),
      barcode: text('barcode'),
      category: text('category'),
      brand: text('brand'),
      unit: text('unit'),
      price: price ?? 0,
      cost: number('cost', 'Cost'),
      onlinePrice: number('onlinePrice', 'Online price'),
      stock: number('stock', 'Stock', true),
      lowStock: number('lowStock', 'Low stock alert', true),
      description: text('description'),
      errors,
    }
    const unique = (value: string | undefined, label: string, taken: Set<string>, inFile: Set<string>) => {
      if (!value) return
      const key = value.toLowerCase()
      if (taken.has(key)) errors.push(`${label} ${value} is already used by another product`)
      else if (inFile.has(key)) errors.push(`${label} ${value} appears twice in this file`)
      inFile.add(key)
    }
    unique(row.code, 'Product code', existing.codes, seen.codes)
    unique(row.sku, 'SKU', existing.skus, seen.skus)
    unique(row.barcode, 'Barcode', existing.barcodes, seen.barcodes)
    return row
  })
  return {
    rows,
    missingColumns: IMPORT_COLUMNS.filter((column) => !position.has(column.key)).map((column) => column.header),
  }
}
