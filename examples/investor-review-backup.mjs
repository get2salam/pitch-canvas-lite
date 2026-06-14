const today = new Date('2026-05-01T00:00:00Z');

function isoDate(offsetDays) {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

const items = [
  {
    title: 'Pain narrative opening',
    category: 'Problem',
    state: 'Sharpening',
    score: 9,
    effort: 3,
    metric: 8,
    textOne: 'Seed-stage investors',
    textTwo: 'User interview quote',
    date: isoDate(1),
    note: 'Open with the expensive workflow gap before naming the product category.',
  },
  {
    title: 'Traction proof slide',
    category: 'Proof',
    state: 'Draft',
    score: 8,
    effort: 4,
    metric: 7,
    textOne: 'Partner meeting',
    textTwo: 'Pilot usage chart',
    date: isoDate(3),
    note: 'Replace vanity metrics with a before-and-after usage proof point.',
  },
  {
    title: 'Low-friction next step',
    category: 'Close',
    state: 'Rehearsed',
    score: 7,
    effort: 2,
    metric: 8,
    textOne: 'Warm intro',
    textTwo: 'Calendar CTA',
    date: isoDate(5),
    note: 'Ask for a specific follow-up review instead of a generic update call.',
  },
];

const backup = {
  schema: 'pitch-canvas-lite/v3',
  boardTitle: 'Investor review pitch canvas',
  boardSubtitle: 'A compact rehearsal board for tightening narrative, proof, and close before an investor meeting.',
  items,
  ui: {
    search: '',
    category: 'all',
    status: 'all',
    selectedId: null,
  },
};

console.log(JSON.stringify(backup, null, 2));
