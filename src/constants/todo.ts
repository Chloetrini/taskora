import { Briefcase, GraduationCap, HeartPulse, Home, Shapes, Wallet, type LucideIcon } from 'lucide-react'
import { LIMITS, type TodoCategory, type TodoDueFilter, type TodoPriority, type TodoSort, type TodoStatus } from '@/constants/todo-values'

export const STATUS_TABS: { value: TodoStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'To do' },
  { value: 'completed', label: 'Done' },
]

export const SORT_OPTIONS: { value: TodoSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'due', label: 'By due date' },
  { value: 'priority', label: 'By priority' },
  { value: 'title', label: 'Title A–Z' },
]

export const DUE_OPTIONS: { value: TodoDueFilter; label: string }[] = [
  { value: 'any', label: 'Any due date' },
  { value: 'today', label: 'Due today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Next 7 days' },
  { value: 'none', label: 'No due date' },
]

export const PRIORITY_META: Record<TodoPriority, { label: string; dot: string; text: string }> = {
  high: { label: 'High', dot: 'bg-destructive', text: 'text-destructive' },
  medium: { label: 'Medium', dot: 'bg-warning', text: 'text-warning' },
  low: { label: 'Low', dot: 'bg-muted-foreground/60', text: 'text-muted-foreground' },
}
export const PRIORITIES: TodoPriority[] = ['high', 'medium', 'low']

export const CATEGORY_META: Record<TodoCategory, { label: string; icon: LucideIcon }> = {
  personal: { label: 'Personal', icon: Home },
  work: { label: 'Work', icon: Briefcase },
  study: { label: 'Study', icon: GraduationCap },
  health: { label: 'Health', icon: HeartPulse },
  finance: { label: 'Finance', icon: Wallet },
  other: { label: 'Other', icon: Shapes },
}
export const CATEGORIES: TodoCategory[] = ['personal', 'work', 'study', 'health', 'finance', 'other']

// Limits come from the shared constants, so client and server always agree.
export const TITLE_MAX = LIMITS.title
export const NOTES_MAX = LIMITS.notes
export const TAGS_MAX = LIMITS.tags
export const TAG_LENGTH_MAX = LIMITS.tagLength
export const SUBTASKS_MAX = LIMITS.subtasks
