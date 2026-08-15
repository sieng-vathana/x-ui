import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Breadcrumb, Button, Icon, Modal, StoreSwitcher, Topbar } from '../components'
import { useToast } from '../context/ToastContext'
import { useAdminStore } from '../hooks/useAdminStore'
import { cn } from '../lib/cn'
import { readStoredValue, writeStoredValue } from '../lib/storage'
import { pageContent } from '../lib/ui'

type TaskStatus = 'To do' | 'In progress' | 'Done'
type TaskPriority = 'Urgent' | 'High' | 'Normal' | 'Low'
type TaskFilter = 'All' | TaskStatus

interface Task {
  id: string
  title: string
  description: string
  assignee: string
  initials: string
  due: string
  priority: TaskPriority
  status: TaskStatus
  tag: string
}

interface TaskDraft {
  title: string
  description: string
  assignee: string
  due: string
  priority: TaskPriority
  tag: string
}

const TASKS_STORAGE_KEY = 'vpos.task-board'
const CURRENT_MEMBER = 'Vathana'

const seedTasks: Task[] = [
  {
    id: 'task-cash-drawer',
    title: 'Reconcile weekend cash drawer',
    description: 'Match the Saturday and Sunday closeout with the POS settlement report.',
    assignee: 'Vathana',
    initials: 'VS',
    due: 'Today',
    priority: 'Urgent',
    status: 'In progress',
    tag: 'Finance',
  },
  {
    id: 'task-iced-drinks',
    title: 'Restock iced drinks before rush',
    description: 'Move the reserve cases from the back room and update the low-stock count.',
    assignee: 'Dara',
    initials: 'DK',
    due: 'Today',
    priority: 'High',
    status: 'To do',
    tag: 'Inventory',
  },
  {
    id: 'task-menu-board',
    title: 'Update the seasonal menu board',
    description: 'Add the passion fruit cooler and remove the sold-out mango pastry callout.',
    assignee: 'Sopheak',
    initials: 'ST',
    due: 'Aug 18',
    priority: 'Normal',
    status: 'To do',
    tag: 'Marketing',
  },
  {
    id: 'task-supplier-invoice',
    title: 'Approve supplier invoice PO-2048',
    description: 'Check received quantities against the delivery note before approval.',
    assignee: 'Vathana',
    initials: 'VS',
    due: 'Tomorrow',
    priority: 'High',
    status: 'To do',
    tag: 'Purchasing',
  },
  {
    id: 'task-cashier-training',
    title: 'Train new cashier on returns',
    description: 'Walk through exchanges, refunds, and the end-of-shift handoff checklist.',
    assignee: 'Dara',
    initials: 'DK',
    due: 'Aug 20',
    priority: 'Normal',
    status: 'In progress',
    tag: 'People',
  },
  {
    id: 'task-expense-report',
    title: 'Close July expense report',
    description: 'Attach the last two receipts and send the final report to the owner.',
    assignee: 'Vathana',
    initials: 'VS',
    due: 'Done Aug 14',
    priority: 'Low',
    status: 'Done',
    tag: 'Finance',
  },
]

const columns: Array<{
  status: TaskStatus
  label: string
  caption: string
  dot: string
  badge: string
}> = [
  {
    status: 'To do',
    label: 'To do',
    caption: 'Ready for a handoff',
    dot: 'bg-vpos-primary',
    badge: 'bg-vpos-sand text-vpos-primary',
  },
  {
    status: 'In progress',
    label: 'In progress',
    caption: 'Moving this shift',
    dot: 'bg-vpos-orange',
    badge: 'bg-vpos-orange-bg text-vpos-orange',
  },
  {
    status: 'Done',
    label: 'Done',
    caption: 'Closed out cleanly',
    dot: 'bg-vpos-green',
    badge: 'bg-vpos-green-bg text-vpos-green',
  },
]

const priorityStyles: Record<TaskPriority, { dot: string; text: string }> = {
  Urgent: { dot: 'bg-vpos-red', text: 'text-vpos-red' },
  High: { dot: 'bg-vpos-orange', text: 'text-vpos-orange' },
  Normal: { dot: 'bg-vpos-primary', text: 'text-vpos-primary' },
  Low: { dot: 'bg-vpos-muted', text: 'text-vpos-muted' },
}

const emptyDraft: TaskDraft = {
  title: '',
  description: '',
  assignee: CURRENT_MEMBER,
  due: '2026-08-18',
  priority: 'Normal',
  tag: 'Operations',
}

function formatDateInput(value: string) {
  if (!value) return 'No due date'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

function initialsFor(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function dueStyles(due: string) {
  if (due === 'Today') return 'text-vpos-red'
  if (due === 'Tomorrow') return 'text-vpos-orange'
  if (due.startsWith('Done')) return 'text-vpos-green'
  return 'text-vpos-muted'
}

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (id: string, status: TaskStatus) => void }) {
  const priority = priorityStyles[task.priority]

  return (
    <article className="group rounded-[4px] border border-vpos-line bg-white p-4 shadow-vpos transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-vpos-primary/45 hover:shadow-[0_10px_26px_rgba(39,42,58,.1)]">
      <div className="flex items-start justify-between gap-3">
        <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.11em]', priority.text)}>
          <i className={cn('h-1.5 w-1.5 rounded-full', priority.dot)} />
          {task.priority}
        </span>
        <button
          type="button"
          aria-label={`More actions for ${task.title}`}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[4px] border-0 bg-transparent text-[18px] text-vpos-muted opacity-70 transition-colors hover:bg-vpos-subtle hover:text-vpos-text sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Icon name="more-2-fill" />
        </button>
      </div>

      <h3 className="mt-3 text-[14px] font-extrabold leading-snug text-vpos-text">{task.title}</h3>
      <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-vpos-muted">{task.description}</p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-vpos-line/80 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-vpos-sand text-[10px] font-extrabold text-vpos-primary">
            {task.initials}
          </span>
          <span className="truncate text-[11px] font-bold text-vpos-text">{task.assignee}</span>
        </div>
        <span className={cn('flex shrink-0 items-center gap-1 text-[11px] font-bold', dueStyles(task.due))}>
          <Icon name="calendar-2-line" />
          {task.due}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-vpos-subtle px-2.5 py-1 text-[10px] font-bold text-vpos-muted">{task.tag}</span>
        <label className="sr-only" htmlFor={`status-${task.id}`}>Status for {task.title}</label>
        <select
          id={`status-${task.id}`}
          aria-label={`Status for ${task.title}`}
          value={task.status}
          onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
          className="h-8 min-w-0 max-w-[118px] cursor-pointer border-0 bg-transparent px-0 text-right text-[11px] font-extrabold text-vpos-muted outline-none focus:text-vpos-primary"
        >
          {columns.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}
        </select>
      </div>
    </article>
  )
}

function TaskModal({ open, draft, onClose, onChange, onSubmit }: {
  open: boolean
  draft: TaskDraft
  onClose: () => void
  onChange: (draft: TaskDraft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a task"
      description="Give the next handoff a clear owner and finish line."
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="new-task-form"><Icon name="add-line" /> Create task</Button>
        </>
      )}
    >
      <form id="new-task-form" className="space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-extrabold text-vpos-text">Task name</span>
          <input
            autoFocus
            required
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            placeholder="e.g. Check tomorrow's opening stock"
            className="w-full border border-vpos-line px-3.5 text-[13px]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-extrabold text-vpos-text">What needs to happen?</span>
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            placeholder="Add the context someone needs to pick this up."
            className="w-full resize-none border border-vpos-line px-3.5 py-2.5 text-[13px]"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-extrabold text-vpos-text">Owner</span>
            <select value={draft.assignee} onChange={(event) => onChange({ ...draft, assignee: event.target.value })} className="w-full border border-vpos-line px-3.5 text-[13px]">
              {['Vathana', 'Dara', 'Sopheak', 'Team'].map((person) => <option key={person}>{person}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-extrabold text-vpos-text">Due date</span>
            <input type="date" value={draft.due} onChange={(event) => onChange({ ...draft, due: event.target.value })} className="w-full border border-vpos-line px-3.5 text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-extrabold text-vpos-text">Priority</span>
            <select value={draft.priority} onChange={(event) => onChange({ ...draft, priority: event.target.value as TaskPriority })} className="w-full border border-vpos-line px-3.5 text-[13px]">
              {(['Urgent', 'High', 'Normal', 'Low'] as TaskPriority[]).map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-extrabold text-vpos-text">Team label</span>
            <select value={draft.tag} onChange={(event) => onChange({ ...draft, tag: event.target.value })} className="w-full border border-vpos-line px-3.5 text-[13px]">
              {['Operations', 'Finance', 'Inventory', 'Purchasing', 'Marketing', 'People'].map((tag) => <option key={tag}>{tag}</option>)}
            </select>
          </label>
        </div>
      </form>
    </Modal>
  )
}

export function TasksPage() {
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>(() => readStoredValue(TASKS_STORAGE_KEY, seedTasks))
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskFilter>('All')
  const [mineOnly, setMineOnly] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft)

  useEffect(() => {
    writeStoredValue(TASKS_STORAGE_KEY, tasks)
  }, [tasks])

  const openTasks = tasks.filter((task) => task.status !== 'Done')
  const dueToday = tasks.filter((task) => task.due === 'Today' && task.status !== 'Done')
  const completedTasks = tasks.filter((task) => task.status === 'Done')
  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesQuery = !normalizedQuery || `${task.title} ${task.description} ${task.assignee} ${task.tag}`.toLowerCase().includes(normalizedQuery)
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter
      const matchesOwner = !mineOnly || task.assignee === CURRENT_MEMBER
      return matchesQuery && matchesStatus && matchesOwner
    })
  }, [mineOnly, query, statusFilter, tasks])

  const focusTasks = useMemo(() => tasks.filter((task) => task.due === 'Today' && task.status !== 'Done').slice(0, 3), [tasks])
  const teamLoad = useMemo(() => {
    const openByPerson = new Map<string, number>()
    openTasks.forEach((task) => openByPerson.set(task.assignee, (openByPerson.get(task.assignee) ?? 0) + 1))
    return Array.from(openByPerson.entries()).sort((a, b) => b[1] - a[1])
  }, [openTasks])

  const changeStatus = (id: string, status: TaskStatus) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task))
    const label = status === 'Done' ? 'Task closed out.' : `Task moved to ${status.toLowerCase()}.`
    toast.success(label)
  }

  const createTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) return

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      description: draft.description.trim() || 'No additional context added yet.',
      assignee: draft.assignee,
      initials: initialsFor(draft.assignee),
      due: formatDateInput(draft.due),
      priority: draft.priority,
      status: 'To do',
      tag: draft.tag,
    }

    setTasks((current) => [newTask, ...current])
    setDraft(emptyDraft)
    setModalOpen(false)
    toast.success('Task created.', { description: `${newTask.assignee} owns “${newTask.title}”.` })
  }

  return (
    <>
      <Topbar
        title="Tasks"
        subtitle="Keep the team moving, one clear handoff at a time."
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Tasks' }]} />
          <Button variant="primary" onClick={() => setModalOpen(true)}><Icon name="add-line" /> New task</Button>
        </div>

        <section className="relative isolate overflow-hidden rounded-[4px] border border-[#26345f] bg-[#202a4a] p-5 text-white shadow-[0_14px_34px_rgba(32,42,74,.16)] sm:p-7 lg:p-8">
          <div aria-hidden className="pointer-events-none absolute -top-28 right-[18%] h-64 w-64 rounded-full border border-white/10" />
          <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-40 h-80 w-80 rounded-full border-[34px] border-vpos-accent/15" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-[#aebcff] uppercase">
                <i className="h-1.5 w-1.5 rounded-full bg-vpos-accent" />
                Shift brief · Main store
              </span>
              <h2 className="mt-3 max-w-[560px] text-[clamp(27px,4vw,43px)] font-extrabold leading-[1.05] tracking-[-0.045em] text-white">Make the next move obvious.</h2>
              <p className="mt-3 max-w-[520px] text-[14px] leading-relaxed text-white/65">A shared board for the work that keeps the counter, stockroom, and back office in rhythm.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                <div className="min-w-[94px] rounded-[4px] border border-white/10 bg-white/8 px-3 py-2.5">
                  <span className="block text-[10px] font-bold tracking-[0.12em] text-white/50 uppercase">Open</span>
                  <strong className="mt-0.5 block text-[22px] tracking-tight text-white">{openTasks.length}</strong>
                </div>
                <div className="min-w-[94px] rounded-[4px] border border-white/10 bg-white/8 px-3 py-2.5">
                  <span className="block text-[10px] font-bold tracking-[0.12em] text-white/50 uppercase">Due today</span>
                  <strong className="mt-0.5 block text-[22px] tracking-tight text-white">{dueToday.length}</strong>
                </div>
                <div className="min-w-[94px] rounded-[4px] border border-white/10 bg-white/8 px-3 py-2.5">
                  <span className="block text-[10px] font-bold tracking-[0.12em] text-white/50 uppercase">Closed</span>
                  <strong className="mt-0.5 block text-[22px] tracking-tight text-white">{completedTasks.length}</strong>
                </div>
              </div>
            </div>

            <div className="relative border-l border-white/15 pl-5 sm:pl-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-extrabold tracking-[0.12em] text-white/55 uppercase">Next up</span>
                <span className="text-[11px] font-bold text-vpos-accent">{focusTasks.length ? 'Needs attention' : 'Clear for now'}</span>
              </div>
              {focusTasks.length ? (
                <div className="mt-4 space-y-3">
                  {focusTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-vpos-accent shadow-[0_0_0_4px_rgba(255,127,93,.13)]" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-white">{task.title}</p>
                        <p className="mt-0.5 text-[11px] text-white/50">{task.assignee} · {task.priority} priority</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-[13px] text-white/60">Nothing is due today. Keep the board moving.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="m-0 text-[18px] font-extrabold tracking-tight text-vpos-text">Workboard</h2>
                <p className="mt-1 text-[12px] text-vpos-muted">Drag less. Decide faster. Keep handoffs visible.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={mineOnly}
                  onClick={() => setMineOnly((current) => !current)}
                  className={cn('inline-flex h-9 items-center gap-1.5 rounded-[4px] border px-3 text-[12px] font-bold transition-colors', mineOnly ? 'border-vpos-primary bg-vpos-sand text-vpos-primary' : 'border-vpos-line bg-white text-vpos-muted hover:border-vpos-primary/45 hover:text-vpos-primary')}
                >
                  <Icon name="user-3-line" /> My tasks
                </button>
                <button type="button" aria-label="Board settings" className="grid h-9 w-9 place-items-center rounded-[4px] border border-vpos-line bg-white text-[17px] text-vpos-muted transition-colors hover:border-vpos-primary/45 hover:text-vpos-primary">
                  <Icon name="equalizer-2-line" />
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-2.5 rounded-[4px] border border-vpos-line bg-white p-3 shadow-vpos sm:flex-row sm:items-center">
              <label className="relative flex min-w-0 flex-1 items-center">
                <Icon name="search-line" className="pointer-events-none absolute left-3 text-[16px] text-vpos-muted" />
                <span className="sr-only">Search tasks</span>
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, owners, or labels" className="h-9 w-full border border-vpos-line pl-9 pr-3 text-[12px]" />
              </label>
              <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TaskFilter)} className="h-9 w-full border border-vpos-line px-3 text-[12px] sm:w-[142px]">
                <option value="All">All statuses</option>
                {columns.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}
              </select>
              {(query || statusFilter !== 'All' || mineOnly) ? (
                <button type="button" onClick={() => { setQuery(''); setStatusFilter('All'); setMineOnly(false) }} className="h-9 shrink-0 border-0 bg-transparent px-2 text-[12px] font-bold text-vpos-primary hover:underline">Clear</button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
              {columns.map((column) => {
                const columnTasks = filteredTasks.filter((task) => task.status === column.status)
                return (
                  <section key={column.status} className="min-w-0 rounded-[4px] border border-vpos-line bg-[#f8f9fb] p-3">
                    <div className="mb-3 flex items-start justify-between gap-2 px-1">
                      <div>
                        <h3 className="m-0 flex items-center gap-2 text-[13px] font-extrabold text-vpos-text"><i className={cn('h-2 w-2 rounded-full', column.dot)} />{column.label}</h3>
                        <p className="mt-1 text-[11px] text-vpos-muted">{column.caption}</p>
                      </div>
                      <span className={cn('rounded-full px-2 py-1 text-[10px] font-extrabold', column.badge)}>{columnTasks.length}</span>
                    </div>
                    <div className="space-y-3">
                      {columnTasks.map((task) => <TaskCard key={task.id} task={task} onStatusChange={changeStatus} />)}
                      {columnTasks.length === 0 ? (
                        <div className="grid min-h-[128px] place-items-center rounded-[4px] border border-dashed border-vpos-line bg-white/60 p-5 text-center">
                          <div>
                            <Icon name="inbox-archive-line" className="text-[23px] text-vpos-muted/55" />
                            <p className="mt-2 text-[11px] font-semibold text-vpos-muted">No matching tasks</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[4px] border border-vpos-line bg-white p-4 shadow-vpos">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold tracking-[0.12em] text-vpos-muted uppercase">Team load</span>
                  <h2 className="mt-1 text-[16px] font-extrabold tracking-tight text-vpos-text">Who has the next handoff?</h2>
                </div>
                <Icon name="team-line" className="text-[21px] text-vpos-primary" />
              </div>
              <div className="mt-4 space-y-3">
                {teamLoad.map(([person, count], index) => (
                  <div key={person}>
                    <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
                      <span className="flex items-center gap-2"><span className={cn('grid h-6 w-6 place-items-center rounded-full text-[9px]', index === 0 ? 'bg-vpos-sand text-vpos-primary' : 'bg-vpos-subtle text-vpos-muted')}>{initialsFor(person)}</span>{person}</span>
                      <span className="text-vpos-muted">{count} open</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-vpos-subtle"><span className={cn('block h-full rounded-full', index === 0 ? 'bg-vpos-primary' : 'bg-vpos-accent')} style={{ width: `${Math.min(100, count * 28 + 18)}%` }} /></div>
                  </div>
                ))}
                {teamLoad.length === 0 ? <p className="text-[12px] text-vpos-muted">Everyone is clear.</p> : null}
              </div>
            </section>

            <section className="rounded-[4px] border border-vpos-line bg-white p-4 shadow-vpos">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold tracking-[0.12em] text-vpos-muted uppercase">Momentum</span>
                  <h2 className="mt-1 text-[16px] font-extrabold tracking-tight text-vpos-text">The week is moving</h2>
                </div>
                <span className="text-[22px] font-extrabold tracking-tight text-vpos-primary">{tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-vpos-subtle"><span className="block h-full rounded-full bg-vpos-primary" style={{ width: `${tasks.length ? (completedTasks.length / tasks.length) * 100 : 0}%` }} /></div>
              <p className="mt-3 text-[12px] leading-relaxed text-vpos-muted">Close the small handoffs early and the busy shift gets lighter.</p>
            </section>

            <section className="rounded-[4px] border border-vpos-primary/20 bg-vpos-sand/65 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] bg-vpos-primary text-[17px] text-white"><Icon name="lightbulb-flash-line" /></span>
                <div>
                  <h2 className="m-0 text-[13px] font-extrabold text-vpos-text">Keep tasks handoff-ready</h2>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-vpos-muted">Add the owner, due date, and one sentence of context. That is enough to keep work moving.</p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>

      <TaskModal open={modalOpen} draft={draft} onClose={() => { setModalOpen(false); setDraft(emptyDraft) }} onChange={setDraft} onSubmit={createTask} />
    </>
  )
}
