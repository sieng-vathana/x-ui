import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/cn'
import { card, tdClass, thClass } from '../../lib/ui'
import { Icon } from './Icon'
import { Select } from './Select'

export interface DataTableColumn<T> {
  id: string
  header: ReactNode
  cell: (row: T, index: number) => ReactNode
  className?: string
  headerClassName?: string
  /**
   * Include this column in built-in search.
   * Pass a function to control the searchable text for the row/column.
   */
  searchable?: boolean | ((row: T) => string)
  /** Hide on small screens */
  hideOnMobile?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  /** Unique row id */
  rowKey: (row: T) => string
  title?: ReactNode
  /** Extra toolbar content (filters, buttons) rendered after search */
  toolbar?: ReactNode
  /** Header actions (right side of title row) */
  actions?: ReactNode
  searchPlaceholder?: string
  /** Show search field (default true) */
  searchable?: boolean
  /** Controlled search value */
  search?: string
  onSearchChange?: (value: string) => void
  /** Optional custom filter (runs after text search) */
  filterFn?: (row: T, search: string) => boolean
  pageSize?: number
  pageSizeOptions?: number[]
  /** Controlled page (1-based) */
  page?: number
  onPageChange?: (page: number) => void
  emptyMessage?: string
  emptyIcon?: string
  className?: string
  /** Dense row padding */
  dense?: boolean
  /** Called when visible page of rows changes */
  onVisibleRowsChange?: (rows: T[]) => void
}

function defaultSearchText<T>(row: T, columns: DataTableColumn<T>[]): string {
  const parts: string[] = []
  for (const col of columns) {
    if (!col.searchable) continue
    if (typeof col.searchable === 'function') {
      parts.push(col.searchable(row))
    }
  }
  // Fallback: stringify primitive fields if no searchable cols
  if (parts.length === 0 && row && typeof row === 'object') {
    for (const v of Object.values(row as Record<string, unknown>)) {
      if (typeof v === 'string' || typeof v === 'number') parts.push(String(v))
    }
  }
  return parts.join(' ').toLowerCase()
}

function buildPageList(current: number, total: number): Array<number | '…'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: Array<number | '…'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('…')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total - 1) pages.push('…')
  pages.push(total)
  return pages
}

/**
 * Reusable data table with client-side search + pagination.
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  title,
  toolbar,
  actions,
  searchPlaceholder = 'Search…',
  searchable = true,
  search: controlledSearch,
  onSearchChange,
  filterFn,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  page: controlledPage,
  onPageChange,
  emptyMessage = 'No results found.',
  emptyIcon = 'inbox-line',
  className,
  dense = false,
  onVisibleRowsChange,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('')
  const [internalPage, setInternalPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const search = controlledSearch ?? internalSearch
  const page = controlledPage ?? internalPage

  const setSearch = (value: string) => {
    onSearchChange?.(value)
    if (controlledSearch === undefined) setInternalSearch(value)
    // Reset to first page on new search
    if (controlledPage === undefined) setInternalPage(1)
    else onPageChange?.(1)
  }

  const setPage = (next: number) => {
    onPageChange?.(next)
    if (controlledPage === undefined) setInternalPage(next)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((row) => {
      if (filterFn) return filterFn(row, search)
      if (!q) return true
      return defaultSearchText(row, columns).includes(q)
    })
  }, [data, search, columns, filterFn])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  useEffect(() => {
    onVisibleRowsChange?.(pageRows)
  }, [pageRows, onVisibleRowsChange])

  // Keep page in range when data shrinks
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages])

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)
  const pageList = buildPageList(safePage, totalPages)

  const cellPad = dense ? 'py-2.5' : ''

  return (
    <article className={cn(card, 'overflow-visible p-4', className)}>
      {(title || actions || searchable || toolbar) && (
        <div className="mb-3 flex flex-col gap-3">
          {(title || actions) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {title ? (
                <div className="min-w-0 text-[15px] font-extrabold text-vpos-text">
                  {title}
                </div>
              ) : (
                <span />
              )}
              {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              ) : null}
            </div>
          )}

          {(searchable || toolbar) && (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              {searchable ? (
                <label className="relative flex h-[39px] w-full items-center gap-2.5 overflow-hidden rounded-lg border border-vpos-line bg-white px-3.5 transition-[border-color,box-shadow] focus-within:border-vpos-primary focus-within:shadow-[0_0_0_3px_rgba(22,112,91,0.14)] sm:max-w-[320px]">
                  <Icon name="search-line" className="shrink-0 text-[18px] text-vpos-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-full w-full min-w-0 border-none bg-transparent p-0 text-[13px] text-vpos-text outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-vpos-muted selection:bg-vpos-sand"
                    style={{ outline: 'none', boxShadow: 'none' }}
                    aria-label="Search table"
                  />
                  {search ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearch('')}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-0 bg-vpos-subtle p-0 text-vpos-muted transition-colors hover:bg-vpos-line hover:text-vpos-text"
                    >
                      <Icon name="close-line" className="text-[12px]" />
                    </button>
                  ) : null}
                </label>
              ) : null}
              {toolbar ? (
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  {toolbar}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    thClass,
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn(tdClass, 'border-0 py-14 text-center')}
                >
                  <span className="inline-flex flex-col items-center gap-2 text-vpos-muted">
                    <span className="grid h-12 w-12 place-items-center rounded-[4px] bg-vpos-subtle text-[23px] text-vpos-muted">
                      <Icon name={emptyIcon} />
                    </span>
                    <span className="text-[14px] font-semibold">{emptyMessage}</span>
                    {search.trim() ? (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="border-0 bg-transparent text-[13px] font-bold text-vpos-primary hover:underline"
                      >
                        Clear search
                      </button>
                    ) : null}
                  </span>
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  className={`animate-fade-in stagger-${(index % 8) + 1} transition-colors hover:bg-vpos-sand/45`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        tdClass,
                        cellPad,
                        col.hideOnMobile && 'hidden md:table-cell',
                        col.className,
                      )}
                    >
                      {col.cell(row, (safePage - 1) * pageSize + index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="mt-5 flex flex-col gap-3 border-t border-vpos-line/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-vpos-muted">
          <span>
            Showing{' '}
            <strong className="text-vpos-text">
              {from}–{to}
            </strong>{' '}
            of <strong className="text-vpos-text">{total}</strong>
            {search.trim() && total !== data.length ? (
              <span className="text-vpos-muted">
                {' '}
                (filtered from {data.length})
              </span>
            ) : null}
          </span>
          <label className="inline-flex items-center gap-1.5">
            <span>Rows</span>
            <Select
              variant="toolbar"
              value={String(pageSize)}
              onChange={(v) => {
                const next = Number(v)
                setPageSize(next)
                setPage(1)
              }}
              options={pageSizeOptions.map((n) => ({
                value: String(n),
                label: String(n),
              }))}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <PaginationBtn
            label="Previous"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
            icon="arrow-left-s-line"
          />
          {pageList.map((p, i) =>
            p === '…' ? (
              <span
                key={`e-${i}`}
                className="px-1 text-[12px] font-bold text-vpos-muted"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === safePage ? 'page' : undefined}
                className={cn(
                  'h-[30px] min-w-[30px] rounded-[4px] border border-vpos-line px-2 text-[12px] font-semibold transition-colors',
                  p === safePage
                    ? 'bg-vpos-primary text-white'
                    : 'bg-white text-vpos-muted hover:bg-vpos-subtle hover:text-vpos-text',
                )}
              >
                {p}
              </button>
            ),
          )}
          <PaginationBtn
            label="Next"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
            icon="arrow-right-s-line"
            iconRight
          />
        </div>
      </div>
    </article>
  )
}

function PaginationBtn({
  label,
  disabled,
  onClick,
  icon,
  iconRight,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  icon: string
  iconRight?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-[30px] items-center gap-0.5 rounded-[4px] border border-vpos-line px-2.5 text-[12px] font-semibold transition-colors',
        disabled
          ? 'cursor-not-allowed bg-vpos-subtle text-vpos-muted/50'
          : 'bg-white text-vpos-muted hover:bg-vpos-subtle hover:text-vpos-text',
      )}
    >
      {!iconRight ? <Icon name={icon} className="text-[17px]" /> : null}
      <span className="hidden sm:inline">{label}</span>
      {iconRight ? <Icon name={icon} className="text-[17px]" /> : null}
    </button>
  )
}
