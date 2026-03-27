export type User = { id: number; name: string }
export type Session = { token: string; user: User }
export type ApiError = { error?: string }
