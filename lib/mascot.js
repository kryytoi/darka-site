// Пиксельный скорпион, вид сбоку, смотрит влево. Холст 24×20 пикселей.
// Фигуры строятся кодом (эллипсы, линии, кривая хвоста), поэтому их легко менять.
// Символы: '.' — пусто, b — тело, d — тень, h — свет, e — глаз, w — жало, k — ноутбук, g — клавиши, s — экран.

export const W = 24;
export const H = 20;

function canvas() {
  return Array.from({ length: H }, () => Array(W).fill('.'));
}

function put(c, x, y, ch) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px >= 0 && px < W && py >= 0 && py < H) c[py][px] = ch;
}

function line(c, x0, y0, x1, y1, ch) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    put(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, ch);
  }
}

function ellipse(c, cx, cy, rx, ry, ch) {
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) c[y][x] = ch;
    }
  }
}

// Квадратичная кривая Безье, толщина 2 пикселя; цвет меняется по длине
function curve(c, p0, p1, p2, colorAt) {
  for (let i = 0; i <= 200; i += 1) {
    const t = i / 200;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    const ch = colorAt(t);
    put(c, x, y, ch);
    put(c, x + 1, y, ch);
  }
}

const toRows = (c) => c.map((r) => r.join(''));

// Тело: хвост, брюшко с полосками, головогрудь, голова, ножки и клешня
export const BODY = (() => {
  const c = canvas();
  // ножки (тень, за телом)
  line(c, 7, 14, 4, 19, 'd');
  line(c, 10, 15, 9, 19, 'd');
  line(c, 14, 15, 16, 19, 'd');
  // хвост: изгиб вверх и назад, жало на конце
  curve(c, [17, 11], [24, 9], [20, 0], (t) => (t > 0.8 ? 'w' : t < 0.3 ? 'd' : 'b'));
  // брюшко с сегментами
  ellipse(c, 15, 13, 4, 3.2, 'b');
  line(c, 12, 10, 12, 16, 'd');
  line(c, 16, 10, 16, 16, 'd');
  // перетяжка между брюшком и головогрудью
  ellipse(c, 11, 12.5, 1.5, 2, 'd');
  // головогрудь
  ellipse(c, 8, 12, 3.4, 3, 'b');
  line(c, 6, 9.5, 9, 9.5, 'h');
  // голова и глаз
  ellipse(c, 5, 11, 1.8, 1.8, 'b');
  put(c, 4, 10, 'e');
  // клешни в поднятом положении: дальняя тёмная, ближняя светлая
  line(c, 5, 12, 2, 10, 'd');
  ellipse(c, 1.5, 9.5, 1.5, 1.1, 'd');
  line(c, 5, 10, 3, 7, 'b');
  ellipse(c, 2.5, 6, 2, 1.5, 'b');
  // открытый зазор между челюстями
  line(c, 0, 6, 2, 6.5, '.');
  return toRows(c);
})();

// Ноутбук перед скорпионом: крышка, клавиатура и основание
export const LAPTOP = (() => {
  const c = canvas();
  for (let x = 1; x <= 20; x += 1) {
    put(c, x, 11, 'k');
    put(c, x, 12, 'k');
    put(c, x, 13, 'g');
  }
  for (let x = 0; x <= 21; x += 1) {
    put(c, x, 14, 'k');
    put(c, x, 15, 'k');
  }
  for (let x = 9; x <= 12; x += 1) put(c, x, 11, 's');
  return toRows(c);
})();

// Руки на клавишах: кадр A и кадр B меняются местами, получается печать
function armFrame(tipX, tipY) {
  const c = canvas();
  line(c, 6, 10, tipX, tipY, 'b');
  put(c, tipX, tipY, 'h');
  return toRows(c);
}
export const ARM_A = armFrame(3, 13);
export const ARM_B = armFrame(8, 13);

// Список пикселей для отрисовки. Пустые символы пропускаются.
export function gridPixels(rows) {
  const out = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const c = row[x];
      if (c !== '.') out.push({ x, y, c });
    }
  });
  return out;
}
