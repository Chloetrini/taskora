import 'server-only'
import mongoose, { Schema, type Model, type Types } from 'mongoose'
import { TODO_CATEGORIES, TODO_PRIORITIES, type TodoCategory, type TodoPriority } from '@/constants/todo-values'

export interface ISubtask {
  _id: Types.ObjectId
  title: string
  done: boolean
}

export interface ITodo {
  _id: Types.ObjectId
  userId: Types.ObjectId
  title: string
  notes: string
  priority: TodoPriority
  category: TodoCategory
  tags: string[]
  // Plain 'YYYY-MM-DD' calendar day, not a Date — a Date shifts a day either
  // side depending on timezone. This format also sorts correctly as a string.
  dueDate: string | null
  subtasks: ISubtask[]
  pinned: boolean
  completed: boolean
  completedAt: Date | null
  // Set when the task is moved to the trash; null for live tasks. Trashed
  // tasks are hidden everywhere except the trash until restored or purged.
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const subtaskSchema = new Schema<ISubtask>({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  done: { type: Boolean, default: false },
})

const todoSchema = new Schema<ITodo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    priority: { type: String, enum: TODO_PRIORITIES, default: 'medium' },
    category: { type: String, enum: TODO_CATEGORIES, default: 'personal' },
    tags: { type: [String], default: [] },
    dueDate: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ },
    subtasks: { type: [subtaskSchema], default: [] },
    pinned: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// Main list query: one user, filtered by status, newest first.
todoSchema.index({ userId: 1, completed: 1, createdAt: -1 })
// Trash page: one user's trashed tasks, most recently deleted first.
todoSchema.index({ userId: 1, deletedAt: -1 })

const Todo: Model<ITodo> = (mongoose.models.Todo as Model<ITodo>) || mongoose.model<ITodo>('Todo', todoSchema)
export default Todo
