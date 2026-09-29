import { logout } from '@/server/controllers/auth.controller'

// Not wrapped in route(): logging out only clears a cookie and never touches
// MongoDB, and route() connects to the database first. On a cold serverless
// start that connection took seconds, so logging out felt frozen.
export const POST = logout
