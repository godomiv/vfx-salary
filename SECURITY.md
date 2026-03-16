# Security Audit & Fix Instructions

> Аудит проведён 16 марта 2026. Проект — чисто фронтенд (GitHub Pages), сервера нет.

---

## Приоритет патчей

| # | Файл | Сложность | Эффект |
|---|------|-----------|--------|
| 1 | `js/table.js` — добавить `esc()` | 5 мин | Закрывает XSS |
| 2 | `index.html` — добавить CSP мета-тег | 2 мин | Второй слой защиты |
| 3 | `index.html` — добавить SRI к скриптам | 10 мин | Защита от CDN-компромисса |
| 4 | Google Sheets — настроить доступ | 5 мин | Защита от флуда |

---

## 1. 🔴 XSS в `js/table.js` — главный баг

Строки из Google Sheets вставляются напрямую в `innerHTML` без экранирования.
Если кто-то в Google Forms напишет в поле «Город» `<img src=x onerror=alert(1)>` — это выполнится у всех посетителей.

### Исправление

**Шаг 1.** В начало `js/table.js` добавь функцию экранирования:

```js
// HTML escape — защита от XSS
function esc(s) {
  if (!s) return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

**Шаг 2.** Замени функцию `rowHTML`:

```js
function rowHTML(d, maxSal) {
  const bw = Math.round((d.salary / maxSal) * 80);
  const isMy = mySalary > 0 && Math.abs(d.salary - mySalary) < 150;
  return `<tr class="${isMy ? 'my-row' : ''}">
    <td>${esc(d.city)}</td>
    <td><span class="lvl-badge" style="background:${LEVEL_COLORS[d.level]}22;color:${LEVEL_COLORS[d.level]}">${esc(d.level)}</span></td>
    <td class="dept-cell">${esc(d.dept)}</td>
    <td class="sal-cell">${fmtSalary(d.salary)}<span class="sal-bar" style="width:${bw}px"></span>${isMy ? '<span class="my-dot"></span>' : ''}</td>
    <td>${expLabel(d.exp)}</td>
    <td>${EMP_LABELS[d.emp] || '—'}</td>
    <td>${FMT_LABELS[d.fmt] || '—'}</td>
    <td style="color:var(--text-dim);font-size:.8rem">${d.afterTax ? 'после' : 'до'} нал.</td>
    <td class="extra-cell" title="${esc(d.projects)}">${esc(d.projects)}</td>
    <td class="extra-cell" title="${esc(d.software)}">${esc(d.software)}</td>
  </tr>`;
}
```

---

## 2. 🟠 CSP мета-тег в `index.html`

Добавь в `<head>` сразу после `<meta charset="UTF-8">`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com;
  font-src https://fonts.gstatic.com;
  connect-src 'self' https://docs.google.com https://sheets.googleapis.com;
  img-src 'self' data:;
">
```

Это заблокирует выполнение любых инжектированных скриптов — второй слой защиты поверх `esc()`.

---

## 3. 🟡 SRI для CDN-библиотек в `index.html`

Замени теги скриптов — добавь атрибут `integrity`. Точные хэши генерируй на [srihash.org](https://www.srihash.org/).

```html
<!-- БЫЛО -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>

<!-- СТАЛО -->
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
  integrity="sha384-СЮДА_ХЭШ_С_srihash.org"
  crossorigin="anonymous"></script>
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"
  integrity="sha384-СЮДА_ХЭШ_С_srihash.org"
  crossorigin="anonymous"></script>
```

> Зайди на https://www.srihash.org/, вставь каждый URL — получишь готовый тег с правильным хэшем.

---

## 4. 🟡 Защита Google Sheets от флуда

CSV_URL обфусцирован через XOR+Base64 в `js/constants.js`, но это не настоящая защита —
URL легко декодируется в консоли браузера:

```js
// Любой может сделать это в DevTools:
const _x=(s,k=0x5f)=>atob(s).split('').map(c=>String.fromCharCode(c.charCodeAt(0)^k)).join('');
_x('...значение CSV_URL...');
```

### Что сделать в Google Sheets (без сервера):

1. `Файл → Поделиться → Опубликовать в интернете` — публикуй **только лист с результатами**
2. В настройках доступа: **просмотр** открыт, **редактирование** — только ты
3. В Google Forms включи защиту от спама: `Настройки → Ответы → Ограничить до 1 ответа` (требует Google-аккаунт)
4. Можно добавить проверку reCAPTCHA в форму через `Надстройки → Form Limiter`

---

## Что уже сделано правильно ✅

- Нет серверной части — нет SQL-инъекций, нет утечки секретов на бэкенде
- Валидация зарплат при парсинге: `salary < 50 || salary > 100000` отфильтровывает мусор
- Частичное экранирование атрибутов (`&quot;`) в `title` уже есть
- Репозиторий публичный, нет `.env` или токенов в коде
