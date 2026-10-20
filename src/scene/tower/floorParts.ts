import { createContext, useContext, type ComponentType } from 'react'
import type { InstanceProps } from '@react-three/drei'
export type Parts = Record<string, ComponentType<InstanceProps>>
export const FloorParts = createContext<Parts | null>(null)
export function useFloorParts() {
  const parts = useContext(FloorParts)
  if (!parts) throw new Error('Floor requires FloorInstances')
  return parts
}
