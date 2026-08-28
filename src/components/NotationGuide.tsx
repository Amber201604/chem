import { useI18n } from '../i18n/I18nProvider'

export function NotationGuide() {
  const { t } = useI18n()

  const cards = [
    {
      title: t('guide.valency'),
      desc: t('guide.valencyDesc'),
      visual: (
        <div className="notation-visual">
          <sup className="accent">+2</sup>
          <span>Mg</span>
        </div>
      ),
    },
    {
      title: t('guide.charge'),
      desc: t('guide.chargeDesc'),
      visual: (
        <div className="notation-visual">
          <span>
            Mg<sup className="accent">2+</sup>
          </span>
        </div>
      ),
    },
    {
      title: t('guide.subscript'),
      desc: t('guide.subscriptDesc'),
      visual: (
        <div className="notation-visual">
          <span>
            H<sub className="accent">2</sub>O
          </span>
        </div>
      ),
    },
    {
      title: t('guide.coeff'),
      desc: t('guide.coeffDesc'),
      visual: (
        <div className="notation-visual">
          <span>
            <span className="accent">2</span>H<sub>2</sub>O
          </span>
        </div>
      ),
    },
    {
      title: t('guide.paren'),
      desc: t('guide.parenDesc'),
      visual: (
        <div className="notation-visual">
          <span>
            Ca<span className="accent">(</span>OH<span className="accent">)</span>
            <sub className="accent">2</sub>
          </span>
        </div>
      ),
    },
  ]

  return (
    <section className="panel guide">
      <header className="panel__head">
        <div>
          <h2>{t('guide.title')}</h2>
          <p>{t('guide.subtitle')}</p>
        </div>
      </header>
      <div className="guide__grid">
        <div className="guide__cards">
          {cards.map((card) => (
            <article key={card.title} className="guide-card">
              {card.visual}
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </article>
          ))}
        </div>
        <aside className="guide__compare">
          <h3>{t('guide.compare')}</h3>
          <p>{t('guide.compareBody')}</p>
          <div className="compare-examples">
            <code>H₂O</code>
            <code>2H₂O</code>
            <code>H₂O₂</code>
          </div>
        </aside>
      </div>
    </section>
  )
}
