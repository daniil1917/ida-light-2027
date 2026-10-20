import { useAssetLoading } from '../../assets/loadingStore'
import { ThinkingIndicator } from '../fluid/thinking-indicator'
import { Badge } from '../fluid/badge'
import { motion, useReducedMotion } from 'motion/react'
import { publicAsset } from '../../app/publicAsset'
export function LoadingScreen() {
  const progress = useAssetLoading(s => s.progress)
  const reduced = useReducedMotion()
  return <motion.div className="loading-screen" role="status" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .2, ease: 'easeOut' }}><img className="loading-logo" src={publicAsset('branding/ida-logo.svg')} alt="Ида Лайт" width="132" height="21" />
    <ThinkingIndicator className="text-white" />
    <Badge aria-label={`Загрузка сцены: ${progress}%`}>{progress}%</Badge>
  </motion.div>
}
