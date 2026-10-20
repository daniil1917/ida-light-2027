import { defaultIcons } from '../fluid/icon-context'
import { IdaButton } from './IdaButton'

export function ErrorScreen({ message }: { message: string }) {
  return <section className="message-screen" role="alert"><span className="eyebrow">Ида Лайт</span>
    <h1>Не удалось<br />загрузить игру</h1><p>{message}</p>
    <IdaButton trailingIcon={defaultIcons['arrow-right']} onClick={() => window.location.reload()}>Открыть заново</IdaButton>
  </section>
}
