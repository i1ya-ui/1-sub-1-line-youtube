export type User = { id: number; name: string }
export type Session = { token: string; user: User }
export type ApiError = { error?: string }
export type PostComment = { id: number; author: string; text: string; userId?: number; createdAt?: string }
export type PostItem = {
  id: number
  text: string
  likes: number
  author: string
  date: string
  liked?: boolean
  comments?: PostComment[]
  commentCount?: number
}
export type Profile = { id: number; name: string; avatar?: string; bio: string; postsCount?: number }
