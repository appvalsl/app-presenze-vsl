import { getSupabase } from './supabase-client.js';

 document.getElementById('snackMin'),const LINES = [
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
  if (!els.date.value) {
    els.date.value = getTodayLocalISODate();
  }
}

function getSetupFromUI() {
  return {
    line: normalizeLineName(els.line.value),
    date: els.date.value,
    startTime: els.startTime.value,
    endTime: els.endTime.value,
    lunchMin: Number(els.lunchMin.value || 0),
    snackMin: Number(els.snackMin.value || 0),
    stopsMin: Number(els.stopsMin.value || 0),
    stopsNote: els.stopsNote.value || ''
  };
}

function applySetupToUI(setup) {
  if (!setup) return;

  els.line.value = setup.line || '';
  els.date.value = setup.date || '';
  els.startTime.value = setup.startTime || '';
  els.endTime.value = setup.endTime || '';
  els.lunchMin.value = String(setup.lunchMin ?? 60);
  els.snackMin.value = String(setup.snackMin ?? 10);
  els.stopsMin.value = String(setup.stopsMin ?? 0);
  els.stopsNote.value = setup.stopsNote || '';

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
      els.setupSection.classList.add('hidden');
      els.rowsSection.classList.remove('hidden');
      els.subtitle.textContent = 'Presenze';
      renderRows();
    } else {
      els.setupSection.classList.remove('hidden');
      els.rowsSection.classList.add('hidden');
      els.subtitle.textContent = 'Setup';
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
  els.step1.classList.add('hidden');
  els.step2.classList.add('hidden');
  els.step3.classList.add('hidden');

  if (state.currentStep === 1) els.step1.classList.remove('hidden');
  if (state.currentStep === 2) els.step2.classList.remove('hidden');
  if (state.currentStep === 3) els.step3.classList.remove('hidden');

  els.wizardStepBadge.textContent = `Step ${state.currentStep}/3`;
  els.wizardProgressBar.style.width = `${(state.currentStep / 3) * 100}%`;

  els.btnPrevStep.classList.toggle('hidden', state.currentStep === 1);
  els.btnNextStep.classList.toggle('hidden', state.currentStep === 3);
  els.btnLoadRows.classList.toggle('hidden', state.currentStep !== 3);

  if (state.currentStep === 3) {
    updateSetupReview();
  }
}

function updateSetupReview() {
  const setup = getSetupFromUI();
  const selectedLineText = els.line.selectedOptions?.[0]?.textContent?.trim() || '—';
  const note = setup.stopsNote?.trim() || 'Nessuna nota';

  els.setupReview.innerHTML = `
    <div class="setup-review-row">
      <div class="setup-review-label">Linea</div>
      <div class="setup-review-value">${escapeHtml(selectedLineText)}</div>
    </div>
    <div class="setup-review-row">
      <div class="setup-review-label">Data</div>
      <div class="setup-review-value">${escapeHtml(setup.date || '—')}</div>
    </div>
    <div class="setup-review-row">
      <div class="setup-review-label">Inizio</div>
      <div class="setup-review-value">${escapeHtml(setup.startTime || '—')}</div>
    </div>
    <div class="setup-review-row">
      <div class="setup-review-label">Fine</div>
      <div class="setup-review-value">${escapeHtml(setup.endTime || '—')}</div>
    </div>
    <div class="setup-review-row">
      <div class="setup-review-label">Pausa pranzo</div>
      <div class="setup-review-value">${escapeHtml(String(setup.lunchMin || 0))} min</div>
    </div>
    <div class="setup-review-row">
      <div class="setup-review-label">Pausa snack</div>
      <div class="setup-review-value">${escapeHtml(String(setup.snackMin || 0))} min</div>
    </div>
    <div class="setup-review-row">
      <div class="setup-review-label">Fermi</div>
      <div class="setup-review-value">${escapeHtml(String(setup.stopsMin || 0))} min</div>
    </div>
    <div class="setup-review-row">
      <div class="setup-review-label">Nota fermi</div>
      <div class="setup-review-value">${escapeHtml(note)}</div>
    </div>
  `;
}

function resetWizardToStep1() {
  state.currentStep = 1;
  state.activeView = 'setup';
  clearErrors(els.setupErrors);
  setDefaultDateIfEmpty();
  syncAllQuickButtons();
  renderWizard();
  saveAppState();
}

function goToStep3() {
  state.currentStep = 3;
  state.activeView = 'setup';
  clearErrors(els.setupErrors);
  syncAllQuickButtons();
  renderWizard();
  saveAppState();
}

function workMinutesExcludingLunch(setup) {
  const sm = timeToMinutes(setup.startTime);
  let em = timeToMinutes(setup.endTime);

  if (sm == null || em == null) return 0;
  if (em <= sm) em += 1440;

  return Math.max(0, Math.round((em - sm) - setup.lunchMin));
}

function finalMinutes(row) {
  const s = state.setup;
  if (!s) return 0;

  return Math.max(
    0,
    Number(row.workMin || 0) -
      Number(s.snackMin || 0) -
      Number(s.stopsMin || 0) -
      Number(row.eventoMin || 0) -
      Number(row.assembleaMin || 0) -
      Number(row.scioperoMin || 0)
  );
}

function makeRowFromOperator(op, setup) {
  return {
    id: op.id || null,
    stabilimento: op.stabilimento,
    cognome: op.cognome,
    nome: op.nome,
    idOperatore: op.idOperatore,
    idCdc: op.idCdc,
    macroLineaProduzione: op.macroLineaProduzione,
    lineaProduzione: normalizeLineName(op.lineaProduzione),
    postazione: op.postazione || '',
    oreStandard: Number(op.oreStandard || 8),
    workMin: workMinutesExcludingLunch(setup),
    eventoMin: 0,
    assembleaMin: 0,
    scioperoMin: 0
  };
}

function renderRows() {
  const currentLine = state.setup?.line || '';
  const stations = STATIONS_BY_LINE[currentLine] || [];

  els.rowsBody.innerHTML = state.rows
    .map((r, idx) => {
      const stationOptions = [
        '<option value="">(Non assegnata)</option>',
        ...stations.map(
          (station) =>
            `<option value="${escapeHtml(station)}" ${station === r.postazione ? 'selected' : ''}>${escapeHtml(station)}</option>`
        )
      ].join('');

      return `
        <tr data-idx="${idx}">
          <td>
            <div class="row-name">
              <strong>${escapeHtml(r.cognome)} ${escapeHtml(r.nome)}</strong>
              <small>${escapeHtml(r.idOperatore)} · ${escapeHtml(r.idCdc || '')}</small>
            </div>
          </td>
          <td>${Number(r.oreStandard || 0)}</td>
          <td>
            <input data-field="workMinHours" type="number" step="0.25" min="0" value="${minutesToQuarterHours(r.workMin)}" />
          </td>
          <td>
            <input data-field="eventoMin" type="number" step="1" min="0" value="${Number(r.eventoMin || 0)}" />
          </td>
          <td>
            <input data-field="assembleaMin" type="number" step="1" min="0" value="${Number(r.assembleaMin || 0)}" />
          </td>
          <td>
            <input data-field="scioperoMin" type="number" step="1" min="0" value="${Number(r.scioperoMin || 0)}" />
          </td>
          <td>
            <select data-field="postazione">
              ${stationOptions}
            </select>
          </td>
          <td class="final-cell">${minutesToHM(finalMinutes(r))}</td>
        </tr>
      `;
    })
    .join('');

  els.rowsCount.textContent = `Righe: ${state.rows.length}`;

  if (state.setup) {
    els.setupSummary.textContent =
      `Data: ${state.setup.date} · ` +
      `Linea: ${state.setup.line} · ` +
      `${state.setup.startTime}-${state.setup.endTime} · ` +
      `Pranzo ${state.setup.lunchMin}m · ` +
      `Snack ${state.setup.snackMin}m · ` +
      `Fermi ${state.setup.stopsMin}m`;
  } else {
    els.setupSummary.textContent = '';
  }
}

function updateSingleRowFinalCell(target) {
  const tr = target.closest('tr[data-idx]');
  if (!tr) return;

  const idx = Number(tr.dataset.idx);
  if (!Number.isFinite(idx) || !state.rows[idx]) return;

  const finalCell = tr.querySelector('.final-cell');
  if (finalCell) {
    finalCell.textContent = minutesToHM(finalMinutes(state.rows[idx]));
  }
}

function mapOperatorRecord(raw) {
  return {
    id: pickFirst(raw.id, raw.ID),
    stabilimento: safeString(pickFirst(raw.stabilimento, raw.stabilimento_nome)),
    cognome: safeString(pickFirst(raw.cognome, raw.last_name, raw.lastname)),
    nome: safeString(pickFirst(raw.nome, raw.first_name, raw.firstname)),
    idOperatore: safeString(
      pickFirst(raw.idOperatore, raw.id_operatore, raw.codice_operatore, raw.codice)
    ),
    idCdc: safeString(
      pickFirst(raw.idCdc, raw.id_cdc, raw.cdc, raw.centro_di_costo)
    ),
    macroLineaProduzione: safeString(
      pickFirst(raw.macroLineaProduzione, raw.macro_linea_produzione)
    ),
    lineaProduzione: normalizeLineName(
      pickFirst(
        raw.lineaProduzione,
        raw.linea_produzione,
        raw.line_name,
        raw.linea,
        raw.line
      )
    ),
    postazione: safeString(
      pickFirst(raw.postazione, raw.station, raw.stazione)
    ),
    oreStandard: Number(
      pickFirst(raw.oreStandard, raw.ore_standard, raw.standard_hours, 8)
    ) || 8
  };
}

async function loadOperatorsFromDb() {
  const res = await state.supabase
    .from('operators')
    .select('*');

  if (res.error) throw res.error;

  const rawData = res.data || [];

  state.allOperators = rawData
    .map(mapOperatorRecord)
    .sort((a, b) => {
      const aKey = `${a.cognome} ${a.nome}`.trim();
      const bKey = `${b.cognome} ${b.nome}`.trim();
      return aKey.localeCompare(bKey, 'it');
    });

  console.log('Operatori caricati:', state.allOperators.length);
  console.log('Esempio primo operatore:', state.allOperators[0]);
  console.log(
    'Linee trovate negli operatori:',
    [...new Set(state.allOperators.map((o) => o.lineaProduzione).filter(Boolean))]
  );
}

function loadRowsForSelectedLine() {
  clearErrors(els.setupErrors);
  clearErrors(els.rowsErrors);

  state.setup = getSetupFromUI();
  const errors = validateSetup(state.setup);

  if (errors.length) {
    showErrors(els.setupErrors, errors);
    return;
  }

  const selectedLine = normalizeLineName(state.setup.line);

  const operators = state.allOperators.filter((op) => {
    return normalizeLineName(op.lineaProduzione) === selectedLine;
  });

  console.log('Linea selezionata:', selectedLine);
  console.log('Operatori filtrati:', operators.length);

  if (!operators.length) {
    const availableLines = [
      ...new Set(state.allOperators.map((o) => o.lineaProduzione).filter(Boolean))
    ];

    showErrors(els.setupErrors, [
      'Nessun operatore trovato per la linea selezionata.',
      `Linee presenti nella tabella operators: ${availableLines.join(', ') || 'nessuna'}`
    ]);
    return;
  }

  state.rows = operators.map((op) => makeRowFromOperator(op, state.setup));
  state.activeView = 'rows';

  renderRows();

  els.setupSection.classList.add('hidden');
  els.rowsSection.classList.remove('hidden');
  els.subtitle.textContent = 'Presenze';

  saveAppState();
}

async function saveToDatabase() {
  const setup = state.setup;

  const sessionPayload = {
    work_date: setup.date,
    line_name: setup.line,
    start_time: setup.startTime,
    end_time: setup.endTime,
    lunch_min: setup.lunchMin,
    snack_min: setup.snackMin,
    stops_min: setup.stopsMin,
    stops_note: setup.stopsNote || null,
    base_work_minutes: workMinutesExcludingLunch(setup),
    base_net_minutes: Math.max(
      0,
      workMinutesExcludingLunch(setup) - setup.snackMin - setup.stopsMin
    ),
    created_by: state.currentUser.id
  };

  const sessionRes = await state.supabase
    .from('attendance_sessions')
    .upsert(sessionPayload, { onConflict: 'work_date,line_name' })
    .select()
    .single();

  if (sessionRes.error) throw sessionRes.error;

  const deleteRes = await state.supabase
    .from('attendance_rows')
    .delete()
    .eq('attendance_session_id', sessionRes.data.id);

  if (deleteRes.error) throw deleteRes.error;

  const rowsPayload = state.rows.map((r, idx) => ({
    attendance_session_id: sessionRes.data.id,
    operator_id: r.id,
    sort_order: idx + 1,
    stabilimento: r.stabilimento,
    cognome: r.cognome,
    nome: r.nome,
    id_operatore: r.idOperatore,
    id_cdc: r.idCdc,
    macro_linea_produzione: r.macroLineaProduzione,
    line_orig: r.lineaProduzione,
    line_day: setup.line,
    postazione: r.postazione || null,
    ore_standard: Number(r.oreStandard || 0),
    work_min: Number(r.workMin || 0),
    evento_min: Number(r.eventoMin || 0),
    assemblea_min: Number(r.assembleaMin || 0),
    sciopero_min: Number(r.scioperoMin || 0),
    final_min: finalMinutes(r),
    dirty: true,
    removed: false,
    created_by: state.currentUser.id
  }));

  const rowsRes = await state.supabase
    .from('attendance_rows')
    .insert(rowsPayload);

  if (rowsRes.error) throw rowsRes.error;
}

async function signIn() {
  clearErrors(els.authErrors);

  const email = (els.loginEmail.value || '').trim();
  const password = els.loginPassword.value || '';

  if (!email || !password) {
    showErrors(els.authErrors, ['Inserisci email e password.']);
    return;
  }

  showLoading(true);

  try {
    const res = await state.supabase.auth.signInWithPassword({ email, password });
    if (res.error) throw res.error;
  } catch (err) {
    showErrors(els.authErrors, [err.message || 'Errore di login']);
  } finally {
    showLoading(false);
  }
}

async function signOut() {
  clearAppState();
  await state.supabase.auth.signOut();
}

async function handleSession(session) {
  state.currentUser = session?.user || null;

  if (!state.currentUser) {
    state.rows = [];
    state.setup = null;
    state.activeView = 'setup';

    els.authSection.classList.remove('hidden');
    els.setupSection.classList.add('hidden');
    els.rowsSection.classList.add('hidden');
    els.btnLogout.classList.add('hidden');

    els.statusBadge.textContent = 'Accesso richiesto';
    els.subtitle.textContent = 'Login';

    return;
  }

  els.authSection.classList.add('hidden');
  els.btnLogout.classList.remove('hidden');
  els.statusBadge.textContent = state.currentUser.email;

  await loadOperatorsFromDb();

  const restored = restoreAppState();
  if (!restored) {
    els.setupSection.classList.remove('hidden');
    els.rowsSection.classList.add('hidden');
    els.subtitle.textContent = 'Setup';
    setDefaultDateIfEmpty();
    resetWizardToStep1();
  }
}

/* =========================
   QUICK BUTTONS
========================= */

function updateQuickButtonsForInput(targetId) {
  const group = document.querySelector(`.quick-buttons[data-target="${targetId}"]`);
  const input = document.getElementById(targetId);

  if (!group || !input) return;

  const currentValue = String(input.value ?? '');

  group.querySelectorAll('button').forEach((btn) => {
    const btnValue = String(btn.dataset.value ?? '');
    btn.classList.toggle('active', btnValue === currentValue);
  });
}

function syncAllQuickButtons() {
  ['startTime', 'endTime', 'lunchMin', 'snackMin', 'stopsMin'].forEach(updateQuickButtonsForInput);
}

function bindQuickButtons() {
  document.querySelectorAll('.quick-buttons').forEach((group) => {
    const targetId = group.dataset.target;
    const input = document.getElementById(targetId);

    if (!targetId || !input) return;

    group.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value ?? '';
        input.value = value;

        updateQuickButtonsForInput(targetId);

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        saveAppState();
      });
    });
  });

  [els.startTime, els.endTime, els.lunchMin, els.snackMin, els.stopsMin]
    .filter(Boolean)
    .forEach((input) => {
      const sync = () => updateQuickButtonsForInput(input.id);
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
    });

  syncAllQuickButtons();
}

/* =========================
   EVENTS
========================= */

function bindWizardEvents() {
  els.btnNextStep?.addEventListener('click', () => {
    if (!validateWizardStep(state.currentStep)) return;

    if (state.currentStep < 3) {
      state.currentStep += 1;
      renderWizard();
      saveAppState();
    }
  });

  els.btnPrevStep?.addEventListener('click', () => {
    clearErrors(els.setupErrors);

    if (state.currentStep > 1) {
      state.currentStep -= 1;
      renderWizard();
      saveAppState();
    }
  });

  [els.line, els.date, els.startTime, els.endTime, els.lunchMin, els.snackMin, els.stopsMin, els.stopsNote]
    .filter(Boolean)
    .forEach((element) => {
      const eventName = element.tagName === 'TEXTAREA' ? 'input' : 'change';

      element.addEventListener(eventName, () => {
        clearErrors(els.setupErrors);

        if (state.currentStep === 3) {
          updateSetupReview();
        }

        saveAppState();
      });

      if (element.tagName === 'INPUT' && ['number', 'time', 'date'].includes(element.type)) {
        element.addEventListener('input', () => {
          clearErrors(els.setupErrors);

          if (state.currentStep === 3) {
            updateSetupReview();
          }

          saveAppState();
        });
      }
    });
}

function bindRowsEvents() {
  const handleRowFieldUpdate = (target) => {
    const tr = target.closest('tr[data-idx]');
    if (!tr) return;

    const idx = Number(tr.dataset.idx);
    if (!Number.isFinite(idx) || !state.rows[idx]) return;

    const field = target.dataset.field;
    if (!field) return;

    if (field === 'workMinHours') {
      state.rows[idx].workMin = parseHoursInputToMinutes(target.value || 0);
    } else if (field === 'eventoMin' || field === 'assembleaMin' || field === 'scioperoMin') {
      state.rows[idx][field] = Math.max(0, Number(target.value || 0));
    } else if (field === 'postazione') {
      state.rows[idx].postazione = target.value || '';
    }

    updateSingleRowFinalCell(target);
    saveAppState();
  };

  els.rowsBody?.addEventListener('input', (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches('[data-field]')) return;
    handleRowFieldUpdate(target);
  });

  els.rowsBody?.addEventListener('change', (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches('[data-field]')) return;
    handleRowFieldUpdate(target);
  });
}

function bindMainEvents() {
  els.btnLogin?.addEventListener('click', signIn);
  els.btnLogout?.addEventListener('click', signOut);

  els.loginPassword?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      signIn();
    }
  });

  els.btnLoadRows?.addEventListener('click', loadRowsForSelectedLine);

  els.btnBackSetup?.addEventListener('click', () => {
    state.activeView = 'setup';
    els.rowsSection.classList.add('hidden');
    els.setupSection.classList.remove('hidden');
    els.subtitle.textContent = 'Setup';
    goToStep3();
  });

  els.btnSaveDb?.addEventListener('click', async () => {
    clearErrors(els.rowsErrors);

    if (!state.rows.length) {
      showErrors(els.rowsErrors, ['Non ci sono righe da salvare.']);
      return;
    }

    showLoading(true);

    try {
      await saveToDatabase();
      els.statusBadge.textContent = 'Presenze salvate';
      alert('Presenze salvate correttamente nel database.');
      saveAppState();
    } catch (err) {
      console.error(err);
      showErrors(els.rowsErrors, [err.message || 'Errore durante il salvataggio nel database']);
    } finally {
      showLoading(false);
    }
  });
}

async function init() {
  state.supabase = await getSupabase();

  renderLines();
  setDefaultDateIfEmpty();
  renderWizard();
  bindQuickButtons();

  bindWizardEvents();
  bindRowsEvents();
  bindMainEvents();

  window.addEventListener('beforeunload', saveAppState);
  window.addEventListener('pagehide', saveAppState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveAppState();
    }
  });

  const current = await state.supabase.auth.getSession();
  await handleSession(current.data.session);

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    await handleSession(session);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  init().catch((err) => {
    console.error(err);
    els.statusBadge.textContent = 'Errore';
    showErrors(els.authErrors, [err.message || 'Errore inizializzazione']);
  });
});
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
    'Ribattitura e rimozione chiodi',
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
