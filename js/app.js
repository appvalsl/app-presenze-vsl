import { getSupabase } from './supabase-client.js';import { getSupabase } from './supabase',
    'Sgrossatura',
    'Segno a dima e boetta',
    'Cardatura fine',
    'Incollaggio suola',
    'Incollaggio tomaia',
    'Suolatura',
    'Pulizia',
    'Inchiodatura'
  ],
  'RIFINITURA 1': [],
  'RIFINITURA 2': [],
  'MAGAZZINO SEMILAVORATI': [],
  'MAGAZZINO SPEDIZIONI': [],
  'CONTROLLO TOMAIA': []
};

const APP_STATE_KEY = 'presenze-app-state-v2';

const els = {
  subtitle: document.getElementById('subtitle'),
  statusBadge: document.getElementById('statusBadge'),
  btnLogout: document.getElementById('btnLogout'),

  authSection: document.getElementById('authSection'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  btnLogin: document.getElementById('btnLogin'),
  authErrors: document.getElementById('authErrors'),

  setupSection: document.getElementById('setupSection'),
  line: document.getElementById('line'),
  date: document.getElementById('date'),
  startTime: document.getElementById('startTime'),
  endTime: document.getElementById('endTime'),
  lunchMin: document.getElementById('lunchMin'),
  snackMin: document.getElementById('snackMin'),
  stopsMin: document.getElementById('stopsMin'),
  stopsNote: document.getElementById('stopsNote'),
  btnLoadRows: document.getElementById('btnLoadRows'),
  setupErrors: document.getElementById('setupErrors'),

  step1: document.getElementById('step1'),
  step2: document.getElementById('step2'),
  step3: document.getElementById('step3'),
  btnPrevStep: document.getElementById('btnPrevStep'),
  btnNextStep: document.getElementById('btnNextStep'),
  wizardStepBadge: document.getElementById('wizardStepBadge'),
  wizardProgressBar: document.getElementById('wizardProgressBar'),
  setupReview: document.getElementById('setupReview'),

  rowsSection: document.getElementById('rowsSection'),
  setupSummary: document.getElementById('setupSummary'),
  rowsCount: document.getElementById('rowsCount'),
  rowsBody: document.getElementById('rowsBody'),
  btnSaveDb: document.getElementById('btnSaveDb'),
  btnBackSetup: document.getElementById('btnBackSetup'),
  rowsErrors: document.getElementById('rowsErrors'),

  loading: document.getElementById('loading')
};

const state = {
  supabase: null,
  currentUser: null,
  allOperators: [],
  rows: [],
  setup: null,
  currentStep: 1,
  activeView: 'setup'
};

function normalizeLineName(value) {
  const u = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

  if (u === 'CALZOLERIA 1') return 'CALZOLERIA 1';
  if (u === 'CALZOLERIA 2') return 'CALZOLERIA 2';
  if (u === 'RIFINITURA 1') return 'RIFINITURA 1';
  if (u === 'RIFINITURA 2') return 'RIFINITURA 2';
  if (u === 'CONTROLLO TOMAIA') return 'CONTROLLO TOMAIA';
  if (u === 'MAGAZZINO SPEDIZIONI') return 'MAGAZZINO SPEDIZIONI';
  if (u.startsWith('MAGAZZINO SEMILAVORATI')) return 'MAGAZZINO SEMILAVORATI';

  return u;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[char];
  });
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function safeString(value) {
  return String(value ?? '').trim();
}

function showLoading(show) {
  if (!els.loading) return;
  els.loading.classList.toggle('hidden', !show);
}

function showErrors(el, list) {
  if (!el) return;

  if (!list || !list.length) {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }

  el.classList.remove('hidden');
  el.innerHTML = `
    <ul style="margin:0; padding-left:18px;">
      ${list.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}
    </ul>
  `;
}

function clearErrors(el) {
  showErrors(el, []);
}

function timeToMinutes(t) {
  if (!t || !String(t).includes(':')) return null;
  const [h, m] = String(t).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function minutesToHM(min) {
  const safeMin = Math.max(0, Math.round(Number(min) || 0));
  const h = Math.floor(safeMin / 60);
  const m = safeMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function minutesToQuarterHours(min) {
  return Math.round(((Number(min) || 0) / 60) * 4) / 4;
}

function parseHoursInputToMinutes(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) return 0;
  return Math.round(hours * 60);
}

function renderLines() {
  if (!els.line) return;

  els.line.innerHTML =
    '<option value="">Seleziona...</option>' +
    LINES.map((line) => `<option value="${escapeHtml(line)}">${escapeHtml(line)}</option>`).join('');
}

function getTodayLocalISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setDefaultDateIfEmpty() {
  if (els.date && !els.date.value) {
    els.date.value = getTodayLocalISODate();
  }
}

function getSetupFromUI() {
  return {
    line: normalizeLineName(els.line?.value || ''),
    date: els.date?.value || '',
    startTime: els.startTime?.value || '',
    endTime: els.endTime?.value || '',
    lunchMin: Number(els.lunchMin?.value || 0),
    snackMin: Number(els.snackMin?.value || 0),
    stopsMin: Number(els.stopsMin?.value || 0),
    stopsNote: els.stopsNote?.value || ''
  };
}

function applySetupToUI(setup) {
  if (!setup) return;

  if (els.line) els.line.value = setup.line || '';
  if (els.date) els.date.value = setup.date || '';
  if (els.startTime) els.startTime.value = setup.startTime || '';
  if (els.endTime) els.endTime.value = setup.endTime || '';
  if (els.lunchMin) els.lunchMin.value = String(setup.lunchMin ?? 60);
  if (els.snackMin) els.snackMin.value = String(setup.snackMin ?? 10);
  if (els.stopsMin) els.stopsMin.value = String(setup.stopsMin ?? 0);
  if (els.stopsNote) els.stopsNote.value = setup.stopsNote || '';

  syncAllQuickButtons();
}

function getAppSnapshot() {
  return {
    currentStep: state.currentStep,
    activeView: state.activeView,
    setup: getSetupFromUI(),
    rows: state.rows
  };
}

function saveAppState() {
  try {
    sessionStorage.setItem(APP_STATE_KEY, JSON.stringify(getAppSnapshot()));
  } catch (err) {
    console.warn('Impossibile salvare stato app', err);
  }
}

function clearAppState() {
  try {
    sessionStorage.removeItem(APP_STATE_KEY);
  } catch (err) {
    console.warn('Impossibile pulire stato app', err);
  }
}

function restoreAppState() {
  try {
    const raw = sessionStorage.getItem(APP_STATE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);

    if (data.setup) {
      applySetupToUI(data.setup);
      state.setup = { ...data.setup };
    } else {
      setDefaultDateIfEmpty();
    }

    state.currentStep = Number(data.currentStep || 1);
    if (![1, 2, 3].includes(state.currentStep)) {
      state.currentStep = 1;
    }

    state.activeView = data.activeView === 'rows' ? 'rows' : 'setup';
    state.rows = Array.isArray(data.rows) ? data.rows : [];

    renderWizard();

    if (state.activeView === 'rows' && state.rows.length && state.setup) {
      els.setupSection?.classList.add('hidden');
      els.rowsSection?.classList.remove('hidden');
      if (els.subtitle) els.subtitle.textContent = 'Presenze';
      renderRows();
    } else {
      els.setupSection?.classList.remove('hidden');
      els.rowsSection?.classList.add('hidden');
      if (els.subtitle) els.subtitle.textContent = 'Setup';
    }

    return true;
  } catch (err) {
    console.warn('Impossibile ripristinare stato app', err);
    return false;
  }
}

function validateSetup(setup) {
  const errors = [];

  if (!setup.line) errors.push('Seleziona una linea.');
  if (!setup.date) errors.push('Seleziona una data.');
  if (!setup.startTime) errors.push('Inserisci l’orario di inizio.');
  if (!setup.endTime) errors.push('Inserisci l’orario di fine.');

  if (setup.lunchMin < 0) errors.push('Pausa pranzo negativa non valida.');
  if (setup.snackMin < 0) errors.push('Pausa snack negativa non valida.');
  if (setup.stopsMin < 0) errors.push('Fermi negativi non validi.');

  const sm = timeToMinutes(setup.startTime);
  let em = timeToMinutes(setup.endTime);

  if (sm == null || em == null) {
    errors.push('Orari non validi.');
  } else {
    if (em <= sm) em += 1440;
    const net = (em - sm) - setup.lunchMin - setup.snackMin - setup.stopsMin;
    if (net < 0) errors.push('Il tempo produttivo base è negativo.');
  }

  return errors;
}

function validateWizardStep(step) {
  const setup = getSetupFromUI();
  clearErrors(els.setupErrors);

  if (step === 1) {
    if (!setup.line) {
      showErrors(els.setupErrors, ['Seleziona una linea prima di continuare.']);
      return false;
    }
    return true;
  }

  if (step === 2) {
    const errors = [];

    if (!setup.date) errors.push('Inserisci la data.');
    if (!setup.startTime) errors.push('Inserisci l’orario di inizio.');
    if (!setup.endTime) errors.push('Inserisci l’orario di fine.');
    if (setup.lunchMin < 0) errors.push('Pausa pranzo negativa non valida.');
    if (setup.snackMin < 0) errors.push('Pausa snack negativa non valida.');
    if (setup.stopsMin < 0) errors.push('Fermi negativi non validi.');

    const sm = timeToMinutes(setup.startTime);
    let em = timeToMinutes(setup.endTime);

    if (sm != null && em != null && em <= sm) {
      em += 1440;
    }

    if (sm == null || em == null) {
      if (setup.startTime || setup.endTime) {
        errors.push('Orari non validi.');
      }
    } else {
      const net = (em - sm) - setup.lunchMin - setup.snackMin - setup.stopsMin;
      if (net < 0) {
        errors.push('Il tempo produttivo base è negativo.');
      }
    }

    if (errors.length) {
      showErrors(els.setupErrors, errors);
      return false;
    }

    return true;
  }

  return true;
}

function renderWizard() {
  if (!els.step1 || !els.step2 || !els.step3) return;

  els.step1.classList.add('hidden');
  els.step2.classList.add('hidden');
  els.step3.classList.add('hidden');

  if (state.currentStep === 1) els.step1.classList.remove('hidden');
  if (state.currentStep === 2) els.step2.classList.remove('hidden');
  if (state.currentStep === 3) els.step3.classList.remove('hidden');

  if (els.wizardStepBadge) {
    els.wizardStepBadge.textContent = `Step ${state.currentStep}/3`;
  }

  if (els.wizardProgressBar) {
    els.wizardProgressBar.style.width = `${(state.currentStep / 3) * 100}%

console.log('app.js caricato correttamente');

const LINES = [
  'CALZOLERIA 1',
  'CALZOLERIA 2',
  'RIFINITURA 1',
  'RIFINITURA 2',
  'MAGAZZINO SEMILAVORATI',
  'MAGAZZINO SPEDIZIONI',
  'CONTROLLO TOMAIA'
];

const STATIONS_BY_LINE = {
  'CALZOLERIA 1': [
    'Assente',
    'Responsabile linea 1',
    'Carico manovia',
    'Premonta',
    'Montaggio manuale',
    'Carico e grattatura strutture',
    'Ribattitura e rimozione chiodi',
    'Sgrossatura e ribattitura',
    'Segno a dima e boetta',
    'Cardatura fine',
    'Incollaggio suola',
    'Incollaggio tomaia',
    'Suolatura',
    'Pulizia',
    'Inchiodatura'
  ],
  'CALZOLERIA 2': [
    'Assente',
    'Responsabile linea 2',
    'Carico manovia',
    'Premonta',
    'Montaggio manuale',
    'Calzera',
    'Carico e grattatura strutture',
