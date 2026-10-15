'use client';

import { useEffect, useState } from 'react';
import Scorpion from '@/components/Scorpion';

const STAGES_REASONING = ['Читаю вопрос…', 'Прикидываю варианты…', 'Проверяю логику…', 'Собираю ответ…'];
const STAGES_PLAIN = ['Печатаю ответ…', 'Подбираю слова…'];

// Пока модель думает: скорпион за ноутбуком и меняющиеся подписи со временем
export function ThinkingRow({ modelName, modelColor, reasoning }) {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const stages = reasoning ? STAGES_REASONING : STAGES_PLAIN;
  const stage = stages[Math.floor(sec / 3) % stages.length];

  return (
    <div className="msg-bot thinking-row" role="status" aria-live="polite">
      <div className="think-stage">
        <Scorpion mode="type" size={72} />
      </div>
      <div className="body">
        <div className="who" style={{ color: modelColor }}>
          {modelName}
          {reasoning ? ' · рассуждает' : ''}
        </div>
        <div className="think-text">
          {stage} <span className="think-sec">{sec} с</span>
        </div>
      </div>
    </div>
  );
}

// Сохранённый ход рассуждений: свёрнут по умолчанию, раскрывается по нажатию
export function ReasoningBlock({ thinking, seconds }) {
  return (
    <details className="reasoning">
      <summary>{seconds ? `Рассуждение · ${seconds} с` : 'Рассуждение'}</summary>
      <div className="reasoning-body">{thinking}</div>
    </details>
  );
}
