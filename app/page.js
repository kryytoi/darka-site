import Link from 'next/link';
import Brand from '@/components/Brand';
import HeaderActions, { CtaButton } from '@/components/HeaderActions';
import { MODELS } from '@/lib/models';

const DETAILS = {
  quiziw: {
    ver: '7.0 · флагман',
    text: 'Самая вдумчивая. Разбирает сложные задачи по шагам, работает с длинными документами и кодом, задаёт уточняющие вопросы.',
    items: ['Анализ и исследования', 'Код и данные', 'Длинные тексты'],
    id: 'darka-quiziw-7-0',
  },
  shadow: {
    ver: '1.0 · лаконичная',
    text: 'Отвечает коротко и сразу по делу. Хороша для повседневных вопросов, правок и задач, где важнее скорость, чем глубина.',
    items: ['Быстрые ответы', 'Правка и сокращение текста', 'Выжимки и сортировка'],
    id: 'darka-shadow-1-0',
  },
  darka01: {
    ver: '0.1 · первая',
    text: 'Простая и надёжная основа. Подходит, чтобы познакомиться с Darka и решать несложные повседневные задачи.',
    items: ['Вопросы и объяснения', 'Черновики писем и заметок', 'Знакомство с Darka'],
    id: 'darka-0-1',
  },
  darka02: {
    ver: '0.2 · со стилем',
    text: 'Пишет образно и с настроением. Для историй, идей и текстов с характером — там, где важен голос, а не только точность.',
    items: ['Рассказы и сценарии', 'Названия и слоганы', 'Творческие эксперименты'],
    id: 'darka-0-2-enchanted',
  },
};

const NAMES = {
  quiziw: 'Darka Quiziw',
  shadow: 'Darka Shadow',
  darka01: 'Darka',
  darka02: 'Darka Enchanted',
};

export default function Home() {
  return (
    <>
      <header className="wrap site-header" id="top">
        <Brand />
        <nav className="nav" aria-label="Основная навигация">
          <a href="#models">Модели</a>
          <a href="#use">Возможности</a>
          <a href="#limits">Честность</a>
          <a href="#pricing">Доступ</a>
        </nav>
        <HeaderActions />
      </header>

      <section className="wrap hero">
        <div className="hero-text">
          <div className="eyebrow">Нейросеть · четыре модели</div>
          <h1>
            Ум, с которым можно <em>думать вслух.</em>
          </h1>
          <p className="lead">
            Darka помогает писать, разбираться в сложном и придумывать новое. Выберите модель под задачу: от быстрой и
            лаконичной до самой вдумчивой.
          </p>
          <div className="hero-cta">
            <CtaButton />
            <a href="#models" className="btn btn-ghost btn-lg">
              Выбрать модель
            </a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-box">
            <span className="corner tl">Darka</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" />
            <span className="corner br">4 модели</span>
          </div>
        </div>
      </section>

      <section className="section" id="models">
        <div className="wrap section-inner">
          <div className="eyebrow">01 — Модели</div>
          <h2>Четыре модели. Один голос.</h2>
          <p className="sub">
            Не знаете, какую выбрать? Начните с Quiziw 7.0 — она подойдёт для большинства задач. Остальные пригодятся,
            когда нужна скорость, простота или стиль.
          </p>
          <div className="cards">
            {MODELS.map((m) => {
              const d = DETAILS[m.id];
              return (
                <article className="card" key={m.id} style={{ borderTop: `3px solid ${m.color}` }}>
                  <div className="top">
                    <span className="dot" style={{ background: m.color }} aria-hidden="true" />
                    <span className={m.plan === 'pro' ? 'pill solid' : 'pill'}>{m.plan === 'pro' ? 'Pro' : 'Бесплатно'}</span>
                  </div>
                  <div>
                    <h3>{NAMES[m.id]}</h3>
                    <div className="ver" style={{ color: m.color }}>
                      {d.ver}
                    </div>
                  </div>
                  <p>{d.text}</p>
                  <ul>
                    {d.items.map((i) => (
                      <li key={i}>— {i}</li>
                    ))}
                  </ul>
                  <div className="foot">{d.id}</div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" id="use">
        <div className="wrap section-inner">
          <div className="eyebrow">02 — Возможности</div>
          <h2 style={{ marginBottom: 56 }}>Для чего люди открывают Darka</h2>
          <div className="rows">
            <Link href="/chat" className="row">
              <span className="n">01</span>
              <span className="t">Писать</span>
              <span className="d">Письма, статьи, резюме и речи. Darka предлагает структуру и помогает найти нужный тон.</span>
              <span className="m">Quiziw 7.0</span>
            </Link>
            <Link href="/chat" className="row">
              <span className="n">02</span>
              <span className="t">Разбираться</span>
              <span className="d">Длинные тексты, таблицы и код. Вставьте материал и задайте вопрос, а Darka найдёт главное.</span>
              <span className="m">Quiziw 7.0</span>
            </Link>
            <Link href="/chat" className="row">
              <span className="n">03</span>
              <span className="t">Успевать</span>
              <span className="d">Быстрые справки, правки и выжимки на ходу. Короткие ответы без лишних слов.</span>
              <span className="m">Shadow 1.0</span>
            </Link>
            <Link href="/chat" className="row">
              <span className="n">04</span>
              <span className="t">Придумывать</span>
              <span className="d">Истории, названия, сюжеты и необычные ракурсы. Для идей, которым нужен характер.</span>
              <span className="m">0.2 Enchanted</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section alt" id="limits">
        <div className="wrap section-inner">
          <div className="split">
            <div>
              <div className="eyebrow">03 — Честность</div>
              <h2>Что Darka не умеет — и говорит об этом прямо.</h2>
              <p className="sub" style={{ marginBottom: 0 }}>
                Доверие начинается с ясных границ. Вот три вещи, о которых стоит помнить, работая с любой из моделей.
              </p>
            </div>
            <div>
              <div className="limit">
                <b>A</b>
                <div>
                  <h4>Она может ошибаться</h4>
                  <p>Иногда ответ звучит уверенно, но неверен. Важные факты, цифры и ссылки стоит проверять.</p>
                </div>
              </div>
              <div className="limit">
                <b>B</b>
                <div>
                  <h4>Знания ограничены датой обучения</h4>
                  <p>О свежих событиях Darka может не знать.</p>
                </div>
              </div>
              <div className="limit">
                <b>C</b>
                <div>
                  <h4>Она не заменяет специалиста</h4>
                  <p>
                    В вопросах здоровья, права и денег Darka объяснит и подготовит к разговору, но решение лучше принимать с
                    профессионалом.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap section-inner">
          <div className="eyebrow">04 — Доступ</div>
          <h2 style={{ marginBottom: 56 }}>Начните бесплатно. Расширьте доступ, когда понадобится.</h2>
          <div className="plans">
            <article className="plan">
              <h3>Бесплатно</h3>
              <p>Для знакомства с Darka. Достаточно создать аккаунт.</p>
              <ul>
                <li>— Darka 0.1</li>
                <li>— Darka Shadow 1.0</li>
                <li>— Сохранение истории разговоров</li>
              </ul>
              <Link href="/register" className="btn btn-ghost">
                Создать аккаунт
              </Link>
            </article>
            <article className="plan hot">
              <h3>Pro</h3>
              <p>Для тех, кому нужны самые сильные модели. Подписку подключает администратор.</p>
              <ul>
                <li>— Darka Quiziw 7.0</li>
                <li>— Darka 0.2 Enchanted</li>
                <li>— Все модели из бесплатного доступа</li>
              </ul>
              <Link href="/register" className="btn btn-primary">
                Создать аккаунт и запросить Pro
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap closing">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          <h2 className="serif">Начните с вопроса.</h2>
          <CtaButton>Открыть Darka</CtaButton>
        </div>
      </section>

      <footer className="wrap footer">
        <span>© 2026 Darka</span>
        <span style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <a href="#models">Модели</a>
          <a href="#limits">Честность</a>
          <Link href="/login">Войти</Link>
        </span>
      </footer>
    </>
  );
}
