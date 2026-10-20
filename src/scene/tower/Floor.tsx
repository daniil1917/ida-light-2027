import { memo } from 'react'
import { WinterModel } from '../WinterAssets'
export const Floor = memo(function Floor({ floorNumber = 1 }: { floorNumber?: number }) {
  return <group><WinterModel name="FloorBody" /><WinterModel name="SnowCap" />
    {(floorNumber === 1 || floorNumber % 4 === 0) && <WinterModel name="Wreath" />}
  </group>
})
