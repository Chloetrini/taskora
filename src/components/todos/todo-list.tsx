import TodoItem from '@/components/todos/todo-item'
import type { Todo } from '@/types/todo'

export default function TodoList({ todos, onTagClick, label = 'Tasks' }: { todos: Todo[]; onTagClick?: (tag: string) => void; label?: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {todos.map(todo => (
        <TodoItem key={todo._id} todo={todo} onTagClick={onTagClick} />
      ))}
    </ul>
  )
}
