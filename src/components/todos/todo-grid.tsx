import TodoCard from '@/components/todos/todo-card'
import type { Todo } from '@/types/todo'

export default function TodoGrid({ todos, onTagClick }: { todos: Todo[]; onTagClick?: (tag: string) => void }) {
  return (
    <ul aria-label="Tasks" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {todos.map(todo => (
        <TodoCard key={todo._id} todo={todo} onTagClick={onTagClick} />
      ))}
    </ul>
  )
}
