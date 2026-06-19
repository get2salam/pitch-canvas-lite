const SPEC = {
  "slug": "pitch-canvas-lite",
  "title": "Pitch Canvas Lite",
  "description": "Shape a persuasive pitch with problem, proof, offer, and close blocks.",
  "lede": "Build sharper pitches with visible problem framing, proof, buyer fit, and the next rehearsal step.",
  "heroEyebrow": "Pitch design workspace",
  "boardTitle": "Pitch canvas board",
  "boardSubtitle": "A local-first board for tighter narrative, proof, and rehearsal timing.",
  "accent": "Get the pitch structure visible so problem, proof, offer, and close work together instead of fighting each other.",
  "itemLabel": "pitch block",
  "itemPluralLabel": "Pitch blocks",
  "labels": {
    "title": "Pitch block",
    "note": "Pitch angle",
    "category": "Block type",
    "state": "Status",
    "score": "Leverage",
    "effort": "Friction"
  },
  "metric": {
    "label": "Persuasion",
    "min": 1,
    "max": 10,
    "default": 7
  },
  "textOne": {
    "label": "Audience",
    "default": "Ideal buyer"
  },
  "textTwo": {
    "label": "Proof",
    "default": "Proof to reinforce this block"
  },
  "date": {
    "label": "Next rehearsal"
  },
  "categories": [
    "Problem",
    "Proof",
    "Offer",
    "Close"
  ],
  "states": [
    "Draft",
    "Sharpening",
    "Rehearsed",
    "Delivered"
  ],
  "completedStates": [
    "Delivered"
  ],
  "stateWeights": {
    "Draft": 2,
    "Sharpening": 7,
    "Rehearsed": 10,
    "Delivered": 3
  },
  "defaults": {
    "note": "Capture the exact angle that makes this block persuasive instead of generic."
  },
  "stats": {
    "totalLabel": "Blocks",
    "motionLabel": "In rehearsal",
    "dueLabel": "Due soon"
  },
  "insights": {
    "topLabel": "Strongest block",
    "dateLabel": "Next rehearsal slot",
    "metricLabel": "Sharpest persuasion"
  },
  "queue": {
    "eyebrow": "Rehearsal queue",
    "title": "What to tighten next",
    "empty": "Rehearsed and delivered pitch blocks stay out of the queue."
  },
  "mix": {
    "eyebrow": "Canvas mix",
    "title": "How the pitch is balanced"
  },
  "emptyTitle": "No pitch blocks yet",
  "emptyBody": "Add the blocks that make the pitch stronger, clearer, and easier to deliver.",
  "actions": [
    {
      "id": "rehearse",
      "label": "Schedule rehearsal",
      "mode": "advance",
      "state": "Rehearsed",
      "days": 2,
      "fromToday": true,
      "toast": "Scheduled the next rehearsal."
    },
    {
      "id": "proof-up",
      "label": "Strengthen proof",
      "mode": "advance",
      "metricDelta": 1,
      "scoreDelta": 1,
      "toast": "Raised the proof strength for this block."
    },
    {
      "id": "copy-angle",
      "label": "Copy pitch angle",
      "mode": "copy",
      "key": "note"
    }
  ],
  "theme": {
    "primary": "#f59e0b",
    "secondary": "#f97316",
    "panel": "#1a1008",
    "edge": "#6b3d16",
    "glow": "rgba(245, 158, 11, 0.22)"
  },
  "items": [
    {
      "title": "Wasted research hours",
      "category": "Problem",
      "state": "Sharpening",
      "score": 9,
      "effort": 3,
      "metric": 8,
      "textOne": "Small law firms",
      "textTwo": "Time-loss example",
      "date": "2026-04-26",
      "note": "Lead with the cost of bad search before talking about AI capability."
    },
    {
      "title": "Reliability proof",
      "category": "Proof",
      "state": "Rehearsed",
      "score": 8,
      "effort": 2,
      "metric": 9,
      "textOne": "Tech-aware buyers",
      "textTwo": "Consistency screenshots",
      "date": "2026-04-25",
      "note": "Use concrete output proof, not vague claims about intelligence."
    },
    {
      "title": "Close with next step",
      "category": "Close",
      "state": "Draft",
      "score": 7,
      "effort": 2,
      "metric": 6,
      "textOne": "Warm prospect",
      "textTwo": "Clear CTA",
      "date": "2026-04-28",
      "note": "Make the close feel obvious and low-friction instead of needy."
    }
  ]
};
const STORAGE_KEY = `${SPEC.slug}/state/v3`;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ITEMS = 1000;
const refs = {
  boardTitle: document.querySelector('[data-role="board-title"]'),
  boardSubtitle: document.querySelector('[data-role="board-subtitle"]'),
  stats: document.querySelector('[data-role="stats"]'),
  insights: document.querySelector('[data-role="insights"]'),
  count: document.querySelector('[data-role="count"]'),
  list: document.querySelector('[data-role="list"]'),
  editor: document.querySelector('[data-role="editor"]'),
  secondaryPrimary: document.querySelector('[data-role="secondary-primary"]'),
  secondarySecondary: document.querySelector('[data-role="secondary-secondary"]'),
  search: document.querySelector('[data-field="search"]'),
  category: document.querySelector('[data-field="category"]'),
  status: document.querySelector('[data-field="status"]'),
  importFile: document.querySelector('#import-file'),
};

const toastHost = (() => {
  const host = document.createElement('div');
  host.className = 'toast-host';
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-atomic', 'true');
  document.body.appendChild(host);
  return host;
})();

function showToast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  toastHost.appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 200);
  }, 2200);
}

function uid() {
  return `${SPEC.slug}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(value) {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime())
    && parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
}

function daysFromToday(value) {
  if (!isValidISODate(value)) return 999;
  const today = new Date(`${todayISO()}T00:00:00`);
  const target = new Date(`${value}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

function bumpDate(value, days) {
  const base = isValidISODate(value) ? value : todayISO();
  const date = new Date(`${base}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!isValidISODate(value)) return 'No date';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function completedStates() {
  return new Set(SPEC.completedStates || []);
}

function stateWeight(state) {
  return (SPEC.stateWeights || {})[state] ?? 0;
}

function toneForDate(item) {
  if (completedStates().has(item.state)) return 'success';
  const days = daysFromToday(item.date);
  if (days <= 0) return 'danger';
  if (days <= 2) return 'warn';
  return 'success';
}

function normalizeText(value, fallback, maxLength = 240) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function normalizeId(value, usedIds) {
  const base = typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : uid();
  if (!usedIds) return base;
  let next = base;
  while (usedIds.has(next)) next = uid();
  usedIds.add(next);
  return next;
}

function normalize(item = {}, usedIds) {
  if (!isPlainObject(item)) item = {};
  return {
    id: normalizeId(item.id, usedIds),
    title: normalizeText(item.title, `New ${SPEC.itemLabel}`, 120),
    note: normalizeText(item.note, SPEC.defaults.note, 1000),
    category: SPEC.categories.includes(item.category) ? item.category : SPEC.categories[0],
    state: SPEC.states.includes(item.state) ? item.state : SPEC.states[0],
    score: clamp(item.score ?? 7, 1, 10),
    effort: clamp(item.effort ?? 3, 1, 10),
    metric: clamp(item.metric ?? SPEC.metric.default ?? 6, SPEC.metric.min, SPEC.metric.max),
    textOne: normalizeText(item.textOne, SPEC.textOne.default, 160),
    textTwo: normalizeText(item.textTwo, SPEC.textTwo.default, 160),
    date: isValidISODate(item.date) ? item.date : todayISO(3),
  };
}

function normalizeItems(items = []) {
  const usedIds = new Set();
  return items.map((item) => normalize(item, usedIds));
}

function priority(item) {
  const completed = completedStates().has(item.state);
  const dueBoost = completed ? 0 : Math.max(0, 4 - Math.max(daysFromToday(item.date), 0)) * 4;
  return item.score * 6 + item.metric * 5 + dueBoost + stateWeight(item.state) - item.effort * 4;
}

function normalizeUi(ui) {
  const source = isPlainObject(ui) ? ui : {};
  return {
    search: typeof source.search === 'string' ? source.search : '',
    category: SPEC.categories.includes(source.category) ? source.category : 'all',
    status: SPEC.states.includes(source.status) ? source.status : 'all',
    selectedId: typeof source.selectedId === 'string' ? source.selectedId : null,
  };
}

function seedState() {
  return {
    boardTitle: SPEC.boardTitle,
    boardSubtitle: SPEC.boardSubtitle,
    items: normalizeItems(SPEC.items),
    ui: normalizeUi(),
  };
}

function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    return {
      ...seedState(),
      ...parsed,
      items: normalizeItems(parsed.items || []),
      ui: normalizeUi(parsed.ui),
    };
  } catch (error) {
    console.warn('Falling back to seed state', error);
    return seedState();
  }
}

let state = hydrate();
if (!state.ui.selectedId && state.items[0]) state.ui.selectedId = state.items[0].id;

let persistWarned = false;
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    persistWarned = false;
  } catch (error) {
    console.warn('Could not persist state', error);
    if (!persistWarned) {
      persistWarned = true;
      showToast('Could not save locally. Export a backup to avoid losing work.');
    }
  }
}

function filteredItems() {
  const query = state.ui.search.trim().toLowerCase();
  return [...state.items]
    .filter((item) => state.ui.category === 'all' || item.category === state.ui.category)
    .filter((item) => state.ui.status === 'all' || item.state === state.ui.status)
    .filter((item) => !query || `${item.title} ${item.note} ${item.category} ${item.state} ${item.textOne} ${item.textTwo}`.toLowerCase().includes(query))
    .sort((a, b) => priority(b) - priority(a) || daysFromToday(a.date) - daysFromToday(b.date));
}

function selectedItem() {
  return state.items.find((item) => item.id === state.ui.selectedId) || filteredItems()[0] || null;
}

function commit(nextState) {
  state = nextState;
  if (!state.ui.selectedId && state.items[0]) state.ui.selectedId = state.items[0].id;
  persist();
  render();
}

function updateSelected(field, value) {
  const target = selectedItem();
  if (!target) return;
  commit({
    ...state,
    items: state.items.map((item) => {
      if (item.id !== target.id) return item;
      const next = { ...item, [field]: value };
      if (['score', 'effort', 'metric'].includes(field)) {
        const bounds = field === 'metric' ? SPEC.metric : { min: 1, max: 10 };
        next[field] = clamp(value, bounds.min, bounds.max);
      }
      return next;
    }),
  });
}

function addItem() {
  const item = normalize({ title: `New ${SPEC.itemLabel}`, note: SPEC.defaults.note, textOne: SPEC.textOne.default, textTwo: SPEC.textTwo.default });
  commit({
    ...state,
    items: [item, ...state.items],
    ui: { ...state.ui, selectedId: item.id },
  });
  showToast(`Added a new ${SPEC.itemLabel}.`);
  const titleInput = refs.editor.querySelector('[data-item-field="title"]');
  if (titleInput) {
    titleInput.focus();
    titleInput.select();
  }
}

function removeSelected() {
  const target = selectedItem();
  if (!target) return;
  if (!window.confirm(`Remove "${target.title}"? This cannot be undone.`)) return;
  const nextItems = state.items.filter((item) => item.id !== target.id);
  commit({
    ...state,
    items: nextItems,
    ui: { ...state.ui, selectedId: nextItems[0]?.id || null },
  });
  showToast(`Removed ${SPEC.itemLabel}.`);
}

function exportState() {
  const blob = new Blob([JSON.stringify({ schema: `${SPEC.slug}/v3`, ...state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${SPEC.slug}-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded backup.');
}

async function importState(file) {
  if (file.size > MAX_IMPORT_BYTES) {
    const limitMb = Math.round(MAX_IMPORT_BYTES / (1024 * 1024));
    throw new Error(`backup is larger than ${limitMb} MB`);
  }
  const raw = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('file is not valid JSON');
  }
  if (!isPlainObject(parsed)) {
    throw new Error('backup must be a JSON object');
  }
  if (!Array.isArray(parsed.items)) {
    throw new Error('backup is missing an "items" array');
  }
  if (parsed.items.length > MAX_IMPORT_ITEMS) {
    throw new Error(`backup contains more than ${MAX_IMPORT_ITEMS} ${SPEC.itemPluralLabel.toLowerCase()}`);
  }
  const invalidIndex = parsed.items.findIndex((item) => !isPlainObject(item));
  if (invalidIndex !== -1) {
    throw new Error(`backup item at index ${invalidIndex} is not an object`);
  }
  commit({
    ...seedState(),
    ...parsed,
    items: normalizeItems(parsed.items),
    ui: normalizeUi(parsed.ui),
  });
  showToast(`Imported ${parsed.items.length} ${parsed.items.length === 1 ? SPEC.itemLabel : SPEC.itemPluralLabel.toLowerCase()}.`);
}

async function copyValue(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(`Copied ${label}.`);
  } catch {
    window.prompt(`Copy ${label}:`, value);
  }
}

function runAction(action) {
  const target = selectedItem();
  if (!target) return;
  if (action.mode === 'copy') {
    copyValue(target[action.key] || '', action.label.toLowerCase());
    return;
  }

  const metricMin = SPEC.metric.min;
  const metricMax = SPEC.metric.max;

  commit({
    ...state,
    items: state.items.map((item) => {
      if (item.id !== target.id) return item;
      const next = { ...item };
      if (action.state) next.state = action.state;
      if (action.days !== undefined) next.date = bumpDate(action.fromToday ? todayISO() : item.date, action.days);
      if (action.metricDelta) next.metric = clamp(item.metric + action.metricDelta, metricMin, metricMax);
      if (action.scoreDelta) next.score = clamp(item.score + action.scoreDelta, 1, 10);
      if (action.effortDelta) next.effort = clamp(item.effort + action.effortDelta, 1, 10);
      return next;
    }),
  });
  showToast(action.toast || action.label);
}

function renderStats(items) {
  const completed = state.items.filter((item) => completedStates().has(item.state)).length;
  const inMotion = state.items.filter((item) => !completedStates().has(item.state) && item.state !== SPEC.states[0]).length;
  const dueSoon = state.items.filter((item) => !completedStates().has(item.state) && daysFromToday(item.date) <= 3).length;
  const avgMetric = state.items.length ? (state.items.reduce((sum, item) => sum + item.metric, 0) / state.items.length).toFixed(1) : '0.0';
  const cards = [
    [SPEC.stats.totalLabel || SPEC.itemPluralLabel, String(state.items.length), `tracked ${SPEC.itemPluralLabel.toLowerCase()} on the board`],
    [SPEC.stats.motionLabel || 'In motion', String(inMotion), `${completed} completed or parked`],
    [SPEC.stats.dueLabel || 'Due soon', String(dueSoon), `${items.length} visible under current filters`],
    [SPEC.metric.label, avgMetric, `average ${SPEC.metric.label.toLowerCase()} across the board`],
  ];
  refs.stats.innerHTML = cards.map(([label, valueText, note]) => `
    <article class="card stat">
      <span>${label}</span>
      <strong>${valueText}</strong>
      <small>${note}</small>
    </article>
  `).join('');
  refs.count.textContent = items[0] ? `Top: ${items[0].title}` : `No ${SPEC.itemPluralLabel.toLowerCase()}`;
}

function renderInsights(items) {
  const nextSlot = [...state.items].filter((item) => !completedStates().has(item.state)).sort((a, b) => daysFromToday(a.date) - daysFromToday(b.date))[0];
  const strongestMetric = [...state.items].sort((a, b) => b.metric - a.metric)[0];
  const bestBet = items[0];
  const cards = [
    {
      label: SPEC.insights.topLabel || 'Best current bet',
      title: bestBet?.title || `No ${SPEC.itemLabel} yet`,
      body: bestBet ? `Priority ${priority(bestBet)} with ${SPEC.metric.label.toLowerCase()} ${bestBet.metric}/${SPEC.metric.max}.` : 'Add a record and the best current bet will surface here.',
    },
    {
      label: SPEC.insights.dateLabel || SPEC.date.label,
      title: nextSlot?.title || 'Nothing queued',
      body: nextSlot ? `${formatDate(nextSlot.date)} with ${SPEC.textTwo.label.toLowerCase()}: ${nextSlot.textTwo}.` : 'Your next review slot will surface here.',
    },
    {
      label: SPEC.insights.metricLabel || `Highest ${SPEC.metric.label.toLowerCase()}`,
      title: strongestMetric?.title || `No ${SPEC.itemLabel} yet`,
      body: strongestMetric ? `${SPEC.metric.label} ${strongestMetric.metric}/${SPEC.metric.max} and state ${strongestMetric.state}.` : 'Metric standouts appear here once the board has data.',
    },
  ];
  refs.insights.innerHTML = cards.map((card) => `
    <article class="card insight-card">
      <p class="eyebrow">${escapeHtml(card.label)}</p>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.body)}</p>
    </article>
  `).join('');
}

function renderList(items) {
  if (!items.length) {
    const isFiltered = state.items.length > 0;
    const title = isFiltered ? `No matching ${SPEC.itemPluralLabel.toLowerCase()}` : SPEC.emptyTitle;
    const body = isFiltered ? 'Clear the search or filters to see the full board.' : SPEC.emptyBody;
    refs.list.innerHTML = `
      <div class="empty">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(body)}</p>
      </div>
    `;
    return;
  }

  refs.list.innerHTML = items.map((item) => {
    const isSelected = item.id === state.ui.selectedId;
    return `
    <button class="item ${isSelected ? 'is-selected' : ''}" type="button" data-id="${item.id}" aria-current="${isSelected ? 'true' : 'false'}">
      <div class="item-top">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="score">${priority(item)}</span>
      </div>
      <p>${escapeHtml(item.note)}</p>
      <div class="badge-row">
        <span class="pill ${toneForDate(item)}">${formatDate(item.date)}</span>
        <span class="pill">${escapeHtml(item.textOne)}</span>
        <span class="pill">${escapeHtml(SPEC.metric.label)} ${item.metric}/${SPEC.metric.max}</span>
      </div>
      <div class="meta">
        <span>${escapeHtml(item.category)}</span>
        <span>${escapeHtml(item.state)}</span>
        <span>${escapeHtml(SPEC.textTwo.label)}: ${escapeHtml(item.textTwo)}</span>
        <span>Friction ${item.effort}/10</span>
      </div>
    </button>
  `;
  }).join('');
}

function renderEditor(item) {
  if (!item) {
    refs.editor.innerHTML = `
      <div class="empty">
        <strong>No selection</strong>
        <p>Pick a ${SPEC.itemLabel} or create a new one.</p>
      </div>
    `;
    return;
  }

  refs.editor.innerHTML = `
    <div class="editor-head">
      <div>
        <p class="eyebrow">${SPEC.editorEyebrow || `${SPEC.itemLabel} editor`}</p>
        <h3>${escapeHtml(item.title)}</h3>
      </div>
      <span class="score">Priority ${priority(item)}</span>
    </div>
    <div class="editor-grid">
      <label class="field">
        <span>${SPEC.labels.title}</span>
        <input type="text" data-item-field="title" value="${escapeHtml(item.title)}" />
      </label>
      <label class="field">
        <span>${SPEC.textOne.label}</span>
        <input type="text" data-item-field="textOne" value="${escapeHtml(item.textOne)}" />
      </label>
      <label class="field">
        <span>${SPEC.textTwo.label}</span>
        <input type="text" data-item-field="textTwo" value="${escapeHtml(item.textTwo)}" />
      </label>
      <label class="field">
        <span>${SPEC.labels.note}</span>
        <textarea data-item-field="note">${escapeHtml(item.note)}</textarea>
      </label>
      <div class="field-grid">
        <label class="field">
          <span>${SPEC.labels.category}</span>
          <select data-item-field="category">${SPEC.categories.map((entry) => `<option value="${entry}" ${item.category === entry ? 'selected' : ''}>${entry}</option>`).join('')}</select>
        </label>
        <label class="field">
          <span>${SPEC.labels.state}</span>
          <select data-item-field="state">${SPEC.states.map((entry) => `<option value="${entry}" ${item.state === entry ? 'selected' : ''}>${entry}</option>`).join('')}</select>
        </label>
      </div>
      <div class="field-grid">
        <label class="field">
          <span>${SPEC.date.label}</span>
          <input type="date" data-item-field="date" value="${item.date}" />
        </label>
        <label class="field range-wrap">
          <span>${SPEC.metric.label}</span>
          <input type="range" min="${SPEC.metric.min}" max="${SPEC.metric.max}" data-item-field="metric" value="${item.metric}" />
          <output>${item.metric} / ${SPEC.metric.max}</output>
        </label>
      </div>
      <div class="field-grid three">
        <label class="field range-wrap">
          <span>${SPEC.labels.score}</span>
          <input type="range" min="1" max="10" data-item-field="score" value="${item.score}" />
          <output>${item.score} / 10</output>
        </label>
        <label class="field range-wrap">
          <span>${SPEC.labels.effort}</span>
          <input type="range" min="1" max="10" data-item-field="effort" value="${item.effort}" />
          <output>${item.effort} / 10</output>
        </label>
        <label class="field range-wrap">
          <span>Priority</span>
          <input type="range" min="0" max="100" value="${Math.min(100, priority(item))}" disabled />
          <output>${priority(item)}</output>
        </label>
      </div>
      <div class="quick-actions">
        ${SPEC.actions.map((action) => `<button class="btn" type="button" data-action-id="${action.id}">${action.label}</button>`).join('')}
      </div>
      <div class="editor-actions">
        <span class="helper">${SPEC.date.label} ${formatDate(item.date)} and ${SPEC.metric.label.toLowerCase()} ${item.metric}/${SPEC.metric.max}.</span>
        <button class="btn btn-danger" type="button" data-action="remove-current">Remove</button>
      </div>
    </div>
  `;
}

function renderPanels() {
  const queue = [...state.items].filter((item) => !completedStates().has(item.state)).sort((a, b) => daysFromToday(a.date) - daysFromToday(b.date));
  refs.secondaryPrimary.innerHTML = `
    <div class="secondary-head">
      <div>
        <p class="eyebrow">${SPEC.queue.eyebrow}</p>
        <h3>${SPEC.queue.title}</h3>
      </div>
      <span class="chip">${queue.length} pending</span>
    </div>
    <div class="stack">
      ${queue.slice(0, 4).map((item) => `
        <div class="mini-card">
          <div class="inline-split">
            <strong>${escapeHtml(item.title)}</strong>
            <span class="pill ${toneForDate(item)}">${formatDate(item.date)}</span>
          </div>
          <p>${escapeHtml(item.textOne)} · ${escapeHtml(item.textTwo)} · ${escapeHtml(SPEC.metric.label.toLowerCase())} ${item.metric}/${SPEC.metric.max}.</p>
        </div>
      `).join('') || `<div class="empty"><strong>No pending ${SPEC.itemPluralLabel.toLowerCase()}</strong><p>${SPEC.queue.empty}</p></div>`}
    </div>
  `;

  const byCategory = SPEC.categories.map((entry) => ({ entry, count: state.items.filter((item) => item.category === entry).length }));
  const strongest = state.items.length ? escapeHtml([...state.items].sort((a, b) => b.metric - a.metric)[0].title) : '—';
  refs.secondarySecondary.innerHTML = `
    <div class="secondary-head">
      <div>
        <p class="eyebrow">${SPEC.mix.eyebrow}</p>
        <h3>${SPEC.mix.title}</h3>
      </div>
      <span class="chip">${state.items.length} total</span>
    </div>
    <ul class="metric-list">
      ${byCategory.map(({ entry, count }) => `<li><span>${entry}</span><strong>${count}</strong></li>`).join('')}
      <li><span>Strongest ${SPEC.metric.label.toLowerCase()}</span><strong>${strongest}</strong></li>
    </ul>
  `;
}

function render() {
  refs.boardTitle.textContent = state.boardTitle;
  refs.boardSubtitle.textContent = state.boardSubtitle;
  refs.search.value = state.ui.search;
  refs.category.innerHTML = `<option value="all">All ${SPEC.labels.category.toLowerCase()}</option>${SPEC.categories.map((entry) => `<option value="${entry}" ${state.ui.category === entry ? 'selected' : ''}>${entry}</option>`).join('')}`;
  refs.status.innerHTML = `<option value="all">All ${SPEC.labels.state.toLowerCase()}</option>${SPEC.states.map((entry) => `<option value="${entry}" ${state.ui.status === entry ? 'selected' : ''}>${entry}</option>`).join('')}`;
  const items = filteredItems();
  if (!items.some((item) => item.id === state.ui.selectedId)) state.ui.selectedId = items[0]?.id || null;
  renderStats(items);
  renderInsights(items);
  renderList(items);
  renderEditor(selectedItem());
  renderPanels();
}

document.addEventListener('click', (event) => {
  const itemButton = event.target.closest('.item');
  if (itemButton) {
    commit({ ...state, ui: { ...state.ui, selectedId: itemButton.dataset.id } });
    return;
  }

  const explicit = event.target.closest('[data-action]')?.dataset.action;
  if (explicit === 'new') { addItem(); return; }
  if (explicit === 'reset') {
    if (state.items.length && !window.confirm('Replace the current board with the sample? Existing pitch blocks will be lost.')) return;
    commit(seedState());
    showToast('Re-seeded sample board.');
    return;
  }
  if (explicit === 'remove-current') { removeSelected(); return; }
  if (explicit === 'export') { exportState(); return; }
  if (explicit === 'import') { refs.importFile.click(); return; }

  const actionId = event.target.closest('[data-action-id]')?.dataset.actionId;
  if (actionId) {
    const action = SPEC.actions.find((entry) => entry.id === actionId);
    if (action) runAction(action);
  }
});

document.addEventListener('input', (event) => {
  const field = event.target.dataset.field;
  if (field === 'search') {
    commit({ ...state, ui: { ...state.ui, search: event.target.value } });
    return;
  }
  const itemField = event.target.dataset.itemField;
  if (itemField) updateSelected(itemField, event.target.value);
});

document.addEventListener('change', async (event) => {
  const field = event.target.dataset.field;
  if (field === 'category' || field === 'status') {
    commit({ ...state, ui: { ...state.ui, [field]: event.target.value } });
    return;
  }
  if (event.target.id === 'import-file') {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importState(file);
    } catch (error) {
      console.error(error);
      showToast(`Import failed: ${error.message || 'unknown error'}.`);
    } finally {
      event.target.value = '';
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.isComposing) return;
  if (event.key === 'Escape' && event.target === refs.search && state.ui.search) {
    event.preventDefault();
    commit({ ...state, ui: { ...state.ui, search: '' } });
    refs.search.focus();
    return;
  }
  if (event.target.closest('input, textarea, select')) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    addItem();
    return;
  }
  if (event.key === '/') {
    event.preventDefault();
    refs.search.focus();
  }
});

render();
