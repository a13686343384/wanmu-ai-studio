import { create } from "zustand"

/**
 * 客户端认证状态镜像。
 * 数据来源是 NextAuth 会话（见 useSyncAuth），
 * 此处仅提供组件内快速读取，避免层层传递 props。
 */
export interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  userName: string | null
  userEmail: string | null
  userImage: string | null
  tapies: number
  membership: string
  hydrated: boolean
  setAuth: (data: Partial<Omit<AuthState, "setAuth" | "logout">>) => void
  logout: () => void
}

const emptyState = {
  isAuthenticated: false,
  userId: null,
  userName: null,
  userEmail: null,
  userImage: null,
  tapies: 0,
  membership: "free",
} as const

export const useAuthStore = create<AuthState>((set) => ({
  ...emptyState,
  hydrated: false,
  setAuth: (data) => set((state) => ({ ...state, ...data, hydrated: true })),
  logout: () => set({ ...emptyState, hydrated: true }),
}))
