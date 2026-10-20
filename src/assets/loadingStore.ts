import { create } from 'zustand'
export const useAssetLoading = create<{ progress: number }>(() => ({ progress: 0 }))
