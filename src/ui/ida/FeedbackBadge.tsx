import { defaultIcons } from '../fluid/icon-context'
import { Badge } from '../fluid/badge'
import { useGameStore } from '../../game/store'
export function FeedbackBadge() {
  const Retry = defaultIcons['rotate-ccw']
  const feedback = useGameStore(s => s.feedback)
  const collapse = useGameStore(s => s.phase === 'collapse')
  return <div className="feedback-container" role={collapse ? 'alert' : 'status'} aria-live="polite">
    {feedback && (collapse || feedback.result === 'fail') && <Badge color="gray">
      <Retry size={14} />
      {collapse ? 'Дом потерял равновесие' : 'Этаж упал · минус жизнь'}
    </Badge>}
  </div>
}
