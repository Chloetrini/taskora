import 'server-only'
import mongoose, { Schema, type Model, type Types } from 'mongoose'

export interface IUser {
  _id: Types.ObjectId
  fullName: string
  username: string
  email: string
  // Absent for accounts created with Google until the user sets one.
  password?: string
  hasPassword: boolean
  googleId?: string
  bio: string
  // Profile photo bytes live on the user (select: false) so deleting the
  // account deletes the photo too. avatarUpdatedAt versions the image URL.
  avatar?: { data: Buffer; contentType: string } | null
  avatarUpdatedAt?: Date | null
  // Bumped on password change; sessions carrying an older version are
  // rejected, which signs the user out everywhere else.
  sessionVersion: number
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 60 },
    // The unique index is the final authority on "taken" — the bloom filter
    // (services/username-bloom.service.ts) is only a fast first check.
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    hasPassword: { type: Boolean, default: false },
    // Google's stable account id ("sub"). Sparse unique: only Google users have one.
    googleId: { type: String, unique: true, sparse: true, select: false },
    bio: { type: String, trim: true, maxlength: 160, default: '' },
    sessionVersion: { type: Number, default: 0, select: false },
    avatar: { type: new Schema({ data: Buffer, contentType: String }, { _id: false }), select: false, default: null },
    avatarUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// Reuse the compiled model across hot reloads.
const User: Model<IUser> = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', userSchema)
export default User
