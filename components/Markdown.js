// Небольшой безопасный рендер markdown: абзацы, списки, заголовки, **жирный**, `код` и блоки кода.
// Ничего не вставляется как HTML, поэтому XSS через ответ модели невозможен.
import { Fragment } from 'react';

function inline(text, keyPrefix) {
  const out = [];
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) out.push(<code key={`${keyPrefix}-${i++}`}>{tok.slice(1, -1)}</code>);
    else out.push(<strong key={`${keyPrefix}-${i++}`}>{tok.slice(2, -2)}</strong>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function withBreaks(lines, key) {
  return lines.map((l, i) => (
    <Fragment key={`${key}-l${i}`}>
      {i > 0 && <br />}
      {inline(l, `${key}-${i}`)}
    </Fragment>
  ));
}

function renderText(text, keyBase) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  return blocks.map((block, bi) => {
    const key = `${keyBase}-b${bi}`;
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
      return (
        <ul key={key}>
          {lines.map((l, i) => (
            <li key={i}>{inline(l.replace(/^\s*[-*•]\s+/, ''), `${key}-${i}`)}</li>
          ))}
        </ul>
      );
    }
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      return (
        <ol key={key}>
          {lines.map((l, i) => (
            <li key={i}>{inline(l.replace(/^\s*\d+[.)]\s+/, ''), `${key}-${i}`)}</li>
          ))}
        </ol>
      );
    }
    const h = /^#{1,4}\s+(.*)$/.exec(lines[0]);
    if (h) {
      return (
        <Fragment key={key}>
          <h4>{inline(h[1], `${key}-h`)}</h4>
          {lines.length > 1 && <p>{withBreaks(lines.slice(1), key)}</p>}
        </Fragment>
      );
    }
    return <p key={key}>{withBreaks(lines, key)}</p>;
  });
}

export default function Markdown({ text }) {
  const parts = String(text || '').split(/```/);
  return (
    <div className="msg-text">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          // первая строка после ``` — это язык, её убираем
          const code = part.replace(/^[^\n]*\n/, '').replace(/\n$/, '');
          return (
            <pre key={i}>
              <code>{code}</code>
            </pre>
          );
        }
        return <Fragment key={i}>{renderText(part, `p${i}`)}</Fragment>;
      })}
    </div>
  );
}
