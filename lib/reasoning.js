// Режим «Рассуждение». Модель пишет ход мыслей в тегах <reasoning>, а ответ — в <answer>.
// Рассуждение сохраняется в тексте сообщения блоком, как и файлы, поэтому база не меняется.

export const REASONING_INSTRUCTION =
  'Режим рассуждения включён. Прежде чем ответить, продумай вопрос. ' +
  'Сначала напиши ход мыслей внутри тегов <reasoning>…</reasoning>: что спрашивают, какие есть варианты, что проверяешь. ' +
  'Затем дай итоговый ответ внутри тегов <answer>…</answer>. Пиши на языке вопроса. Сами теги в ответе не упоминай.';

const TAG_REASON = /<reasoning>([\s\S]*?)<\/reasoning>/i;
const TAG_ANSWER = /<answer>([\s\S]*?)<\/answer>/i;

// Разбирает ответ модели. Если тегов нет, весь текст считается ответом.
export function parseReasoningAnswer(raw) {
  const text = String(raw || '').trim();
  const r = TAG_REASON.exec(text);
  const a = TAG_ANSWER.exec(text);
  if (!r && !a) return { thinking: '', answer: text };

  const thinking = r ? r[1].trim() : '';
  let answer = a ? a[1].trim() : text.replace(TAG_REASON, '').replace(/<\/?answer>/gi, '').trim();
  if (!answer) answer = thinking || text;
  return { thinking: answer === thinking ? '' : thinking, answer };
}

export function buildReasoningContent(thinking, seconds, answer) {
  if (!thinking) return answer;
  return `[Рассуждение · ${seconds} с]\n${thinking}\n[Конец рассуждения]\n\n${answer}`;
}

const REASON_BLOCK = /^\[Рассуждение(?: · (\d+) с)?\]\n([\s\S]*?)\n\[Конец рассуждения\]\n*/;

// Разбирает сохранённое сообщение на рассуждение и ответ (для показа)
export function splitReasoning(content) {
  const s = String(content || '');
  const m = REASON_BLOCK.exec(s);
  if (!m) return { thinking: '', seconds: null, answer: s };
  return {
    thinking: m[2],
    seconds: m[1] ? Number(m[1]) : null,
    answer: s.slice(m[0].length),
  };
}

// Для истории модели берём только ответ, без рассуждений
export function answerOnly(content) {
  return splitReasoning(content).answer;
}
