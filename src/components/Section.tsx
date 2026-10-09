import type { ReactNode } from 'react'

type SectionProps = {
  id: string
  title: string
  note?: string
  children: ReactNode
  extra?: ReactNode
}

export function Section({ id, title, note, children, extra }: SectionProps) {
  return (
    <section id={id} className="section">
      <header className="section-head">
        <div>
          <h2>{title}</h2>
          {note ? <p className="note">{note}</p> : null}
        </div>
        {extra}
      </header>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}
