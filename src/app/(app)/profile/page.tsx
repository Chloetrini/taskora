import type { Metadata } from 'next'
import ProfileView from '@/views/profile-view'

export const metadata: Metadata = { title: 'Profile' }

export default function ProfilePage() {
  return <ProfileView />
}
