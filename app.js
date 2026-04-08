// ========== DAYANARIE ABUNDANTE - Trading Calendar ==========

const TRADE_FEE = 1.48; // Fee por operacion (win o loss)

const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const MOTIVATIONAL_QUOTES = [
  // Lunes
  ["Nuevo lunes, nueva oportunidad. El mercado premia la disciplina.", "Empieza la semana con mentalidad ganadora. Tu constancia es tu mejor estrategia.", "Cada lunes es un reset. Olvida la semana pasada y enfocate en ejecutar tu plan.", "Los traders exitosos no esperan motivacion, crean habitos. Arranca fuerte.", "Esta semana puede ser la que cambie todo. Confía en tu proceso."],
  // Martes
  ["Ya llevas un dia. No pares, la consistencia construye imperios.", "Martes de ejecucion. Sigue tu plan, no tus emociones.", "El 90% falla porque abandona. Tu sigues aqui. Eso ya te hace diferente.", "Cada operacion es un paso mas cerca de tus 10 millones.", "No se trata de una gran operacion, se trata de muchas buenas decisiones."],
  // Miercoles
  ["Mitad de semana. Revisa tu progreso y ajusta sin miedo.", "Miercoles de guerrero. Ya pasaste la mitad, termina fuerte.", "Los mercados no perdonan la indisciplina. Mantente enfocado.", "Tu futuro yo te agradecera por no rendirte hoy.", "Cada dia que tradeas con disciplina es una victoria, sin importar el resultado."],
  // Jueves
  ["Casi terminas la semana. Mantén tu disciplina hasta el final.", "Jueves de poder. No relajes tu estrategia, termina como empezaste.", "Las grandes fortunas se construyen un dia a la vez. Hoy es ese dia.", "Recuerda por que empezaste. Esos 10 millones no se van a ganar solos.", "La paciencia es la madre de todas las ganancias. Sigue tu plan."],
  // Viernes
  ["Ultimo dia de trading. Cierra la semana con orgullo.", "Viernes de cierre. Revisa, aprende y prepárate para la proxima semana.", "Una semana mas en el camino a 10 millones. Cada semana cuenta.", "Termina la semana sin arrepentimientos. Opera con inteligencia.", "Celebra tu disciplina de esta semana. El resultado es consecuencia del proceso."],
  // Sabado
  ["Descansa, recarga y analiza tu semana. Los mejores traders estudian los fines de semana.", "Sabado de reflexion. Revisa tus operaciones y encuentra patrones.", "El descanso es parte de la estrategia. Recarga tu mente.", "Hoy estudia, manana ejecuta. El conocimiento es tu mejor inversion.", "Disfruta tu sabado. El equilibrio es clave para la longevidad en trading."],
  // Domingo
  ["Manana empieza otra semana de oportunidades. Prepara tu plan.", "Domingo de visualizacion. Imagina donde estaras en 12 meses si sigues asi.", "Descansa pero no pierdas el enfoque. Tu meta de 10 millones te espera.", "Prepara tu mente para la semana. Los ganadores planean, los perdedores improvisan.", "Un domingo de preparacion vale mas que cinco dias de improvisacion."]
];

// ========== STATE ==========
let state = {
  accounts: [],
  entries: {},    // { "accountId_YYYY-MM-DD": { result: "win"|"loss", amount: number, notes: string } }
  withdrawals: [], // { id, accountId, date, grossAmount, fee, netAmount }
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedAccountId: 'all',
  startYear: new Date().getFullYear(),
  startMonth: new Date().getMonth()
};

// ========== FIREBASE ==========
const firebaseConfig = {
  apiKey: "AIzaSyAWTUvDy_UsNAWxKsKz0OgGqkA9mok-xjU",
  authDomain: "panel-de-administracion-5578c.firebaseapp.com",
  projectId: "panel-de-administracion-5578c",
  storageBucket: "panel-de-administracion-5578c.firebasestorage.app",
  messagingSenderId: "749010711047",
  appId: "1:749010711047:web:5c15db153ac7751801f0a2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUserPin = null;
let syncTimeout = null;

function getUserDocRef() {
  if (!currentUserPin) return null;
  // Hash the PIN to use as document ID (simple hash for privacy)
  const hash = btoa(currentUserPin).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  return db.collection('trading_users').doc(hash);
}

// ========== PERSISTENCE ==========
function saveState() {
  // Save locally always
  localStorage.setItem('10millones_state', JSON.stringify(state));

  // Debounce cloud sync (save to Firebase 1 sec after last change)
  if (syncTimeout) clearTimeout(syncTimeout);
  setSyncStatus('syncing');
  syncTimeout = setTimeout(() => syncToCloud(), 1000);
}

async function syncToCloud() {
  const ref = getUserDocRef();
  if (!ref) return;
  try {
    const dataToSync = {
      accounts: state.accounts,
      entries: state.entries,
      withdrawals: state.withdrawals,
      updatedAt: new Date().toISOString()
    };
    await ref.set(dataToSync, { merge: true });
    setSyncStatus('synced');
  } catch (err) {
    console.error('Sync error:', err);
    setSyncStatus('error');
  }
}

async function loadFromCloud() {
  const ref = getUserDocRef();
  if (!ref) return false;
  try {
    const doc = await ref.get();
    if (doc.exists) {
      const data = doc.data();
      state.accounts = data.accounts || [];
      state.entries = data.entries || {};
      state.withdrawals = data.withdrawals || [];
      // Save to local too
      localStorage.setItem('10millones_state', JSON.stringify(state));
      return true;
    }
    return false;
  } catch (err) {
    console.error('Load from cloud error:', err);
    return false;
  }
}

function setSyncStatus(status) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.classList.remove('syncing');
  if (status === 'syncing') {
    el.textContent = 'Guardando...';
    el.classList.add('syncing');
  } else if (status === 'synced') {
    el.textContent = 'Sincronizado';
  } else {
    el.textContent = 'Error de sync';
  }
}

function loadStateLocal() {
  const saved = localStorage.getItem('10millones_state');
  if (saved) {
    const parsed = JSON.parse(saved);
    state = { ...state, ...parsed };
  }
}

function ensureDefaultAccount() {
  if (state.accounts.length === 0) {
    state.accounts.push({
      id: generateId(),
      name: 'Cuenta Principal',
      monthlyCost: 50,
      withdrawalFee: 10,
      startDate: new Date().toISOString().split('T')[0],
      color: '#c6a84b'
    });
    saveState();
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ========== MOTIVATION ==========
function getMotivation() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0, Sun=6
  const quotes = MOTIVATIONAL_QUOTES[idx];
  const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  return quotes[weekOfYear % quotes.length];
}

function renderMotivation() {
  document.getElementById('motivationBox').textContent = `"${getMotivation()}"`;
}

// ========== ACCOUNTS ==========
function renderAccounts() {
  const list = document.getElementById('accountsList');
  let html = `<div class="account-chip ${state.selectedAccountId === 'all' ? 'active' : ''}" data-id="all">
    <span class="chip-dot"></span>Todas
  </div>`;

  state.accounts.forEach(acc => {
    html += `<div class="account-chip ${state.selectedAccountId === acc.id ? 'active' : ''}" data-id="${acc.id}">
      <span class="chip-dot" style="background:${acc.color}"></span>
      ${acc.name}
      ${state.accounts.length > 1 ? `<span class="delete-account" data-del="${acc.id}">&times;</span>` : ''}
    </div>`;
  });

  list.innerHTML = html;

  // Click handlers
  list.querySelectorAll('.account-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-account')) return;
      state.selectedAccountId = chip.dataset.id;
      saveState();
      renderAll();
    });
  });

  list.querySelectorAll('.delete-account').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const accId = btn.dataset.del;
      if (confirm('Eliminar esta cuenta y todos sus registros?')) {
        state.accounts = state.accounts.filter(a => a.id !== accId);
        // Remove entries for this account
        Object.keys(state.entries).forEach(key => {
          if (key.startsWith(accId + '_')) delete state.entries[key];
        });
        state.withdrawals = state.withdrawals.filter(w => w.accountId !== accId);
        if (state.selectedAccountId === accId) state.selectedAccountId = 'all';
        saveState();
        renderAll();
      }
    });
  });
}

function populateAccountSelects() {
  const selects = ['modalAccountSelect', 'withdrawalAccountSelect'];
  selects.forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  });
}

// ========== CALENDAR ==========
function renderCalendar() {
  const { currentMonth, currentYear } = state;

  document.getElementById('monthTitle').textContent = `${MONTHS_ES[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  let startDay = firstDay.getDay(); // 0=Sun
  startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Mon=0

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();

  let html = '';

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    html += '<div class="day-cell empty"></div>';
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = date.toDateString() === today.toDateString();

    // Get entries for this day
    const dayEntries = getDayEntries(dateStr);

    let cellClass = 'day-cell';
    if (isToday) cellClass += ' today';

    if (isWeekend) {
      cellClass += ' weekend';
    } else if (dayEntries.length > 0) {
      // Determine overall result
      const totalAmount = dayEntries.reduce((sum, e) => {
        return sum + (e.result === 'win' ? e.amount : -e.amount);
      }, 0);
      cellClass += totalAmount >= 0 ? ' win' : ' loss';
    } else {
      cellClass += ' weekday';
    }

    let amountHtml = '';
    if (dayEntries.length > 0) {
      const totalAmount = dayEntries.reduce((sum, e) => {
        return sum + (e.result === 'win' ? e.amount : -e.amount);
      }, 0);
      const sign = totalAmount >= 0 ? '+' : '';
      amountHtml = `<div class="day-amount">${sign}$${Math.abs(totalAmount).toFixed(0)}</div>`;

      if (dayEntries.length > 1 && state.selectedAccountId === 'all') {
        let dotsHtml = '<div class="day-multi-dot">';
        dayEntries.forEach(e => {
          dotsHtml += `<span class="dot dot-${e.result}"></span>`;
        });
        dotsHtml += '</div>';
        amountHtml += dotsHtml;
      }
    }

    const clickable = !isWeekend ? `data-date="${dateStr}"` : '';

    html += `<div class="${cellClass}" ${clickable}>
      <div class="day-number">${d}</div>
      ${amountHtml}
    </div>`;
  }

  document.getElementById('calendarGrid').innerHTML = html;

  // Click handlers for day cells
  document.querySelectorAll('.day-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => openDayModal(cell.dataset.date));
  });
}

function getDayEntries(dateStr) {
  const entries = [];
  const accountsToCheck = state.selectedAccountId === 'all'
    ? state.accounts
    : state.accounts.filter(a => a.id === state.selectedAccountId);

  accountsToCheck.forEach(acc => {
    const key = `${acc.id}_${dateStr}`;
    if (state.entries[key]) {
      entries.push({ ...state.entries[key], accountId: acc.id, accountName: acc.name });
    }
  });

  return entries;
}

// ========== DAY MODAL ==========
let currentEditDate = null;
let currentEditResult = 'win';

function openDayModal(dateStr) {
  currentEditDate = dateStr;
  const [y, m, d] = dateStr.split('-');
  document.getElementById('modalTitle').textContent = `${parseInt(d)} de ${MONTHS_ES[parseInt(m) - 1]}, ${y}`;

  populateAccountSelects();

  const accId = state.selectedAccountId === 'all' ? state.accounts[0].id : state.selectedAccountId;
  document.getElementById('modalAccountSelect').value = accId;

  loadEntryForModal(accId, dateStr);

  document.getElementById('dayModal').classList.add('show');
}

function loadEntryForModal(accId, dateStr) {
  const key = `${accId}_${dateStr}`;
  const entry = state.entries[key];

  if (entry) {
    currentEditResult = entry.result;
    document.getElementById('amountInput').value = entry.amount;
    document.getElementById('notesInput').value = entry.notes || '';
    document.getElementById('deleteDayEntry').style.display = 'block';
  } else {
    currentEditResult = 'win';
    document.getElementById('amountInput').value = '';
    document.getElementById('notesInput').value = '';
    document.getElementById('deleteDayEntry').style.display = 'none';
  }

  updateToggleButtons();
}

function updateToggleButtons() {
  const winBtn = document.getElementById('toggleWin');
  const lossBtn = document.getElementById('toggleLoss');
  winBtn.classList.toggle('active', currentEditResult === 'win');
  lossBtn.classList.toggle('active', currentEditResult === 'loss');
}

// ========== STATS ==========
function renderStats() {
  const { currentMonth, currentYear } = state;
  const monthEntries = getMonthEntries(currentMonth, currentYear);

  let wins = 0, losses = 0, winAmount = 0, lossAmount = 0;
  monthEntries.forEach(e => {
    if (e.result === 'win') { wins++; winAmount += e.amount; }
    else { losses++; lossAmount += e.amount; }
  });

  const net = winAmount - lossAmount;
  const totalDays = wins + losses;
  const tradeFees = totalDays * TRADE_FEE;
  const winRate = totalDays > 0 ? ((wins / totalDays) * 100).toFixed(0) : 0;

  // Monthly costs for active accounts
  const monthlyCost = getActiveMonthlyCost(currentMonth, currentYear);
  const netAfterCosts = net - monthlyCost - tradeFees;

  const netClass = netAfterCosts >= 0 ? 'positive' : 'negative';
  const netSign = netAfterCosts >= 0 ? '+' : '-';

  document.getElementById('statsOverview').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Ganancias del Mes</div>
      <div class="stat-value positive">+$${winAmount.toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Perdidas del Mes</div>
      <div class="stat-value negative">-$${lossAmount.toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Fees Operacion ($${TRADE_FEE} x${totalDays})</div>
      <div class="stat-value negative">-$${tradeFees.toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Neto Real</div>
      <div class="stat-value ${netClass}">${netSign}$${Math.abs(netAfterCosts).toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value">${winRate}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Dias Operados</div>
      <div class="stat-value">${totalDays}</div>
    </div>
  `;
}

function getMonthEntries(month, year) {
  const entries = [];
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const accountsToCheck = state.selectedAccountId === 'all'
    ? state.accounts
    : state.accounts.filter(a => a.id === state.selectedAccountId);

  Object.keys(state.entries).forEach(key => {
    const [accId, ...dateParts] = key.split('_');
    const dateStr = dateParts.join('_');
    if (dateStr.startsWith(prefix) && accountsToCheck.some(a => a.id === accId)) {
      entries.push({ ...state.entries[key], accountId: accId, date: dateStr });
    }
  });

  return entries;
}

function getActiveMonthlyCost(month, year) {
  const accountsToCheck = state.selectedAccountId === 'all'
    ? state.accounts
    : state.accounts.filter(a => a.id === state.selectedAccountId);

  return accountsToCheck.reduce((sum, acc) => {
    const start = new Date(acc.startDate);
    const monthStart = new Date(year, month, 1);
    return sum + (start <= monthStart || (start.getMonth() === month && start.getFullYear() === year) ? acc.monthlyCost : 0);
  }, 0);
}

// ========== MONTHLY REPORT ==========
function renderMonthlyReport() {
  const { currentMonth, currentYear } = state;
  const monthEntries = getMonthEntries(currentMonth, currentYear);

  let wins = 0, losses = 0, winAmount = 0, lossAmount = 0;
  let bestDay = 0, worstDay = 0;

  monthEntries.forEach(e => {
    if (e.result === 'win') {
      wins++;
      winAmount += e.amount;
      if (e.amount > bestDay) bestDay = e.amount;
    } else {
      losses++;
      lossAmount += e.amount;
      if (e.amount > worstDay) worstDay = e.amount;
    }
  });

  const monthlyCost = getActiveMonthlyCost(currentMonth, currentYear);
  const monthWithdrawals = getMonthWithdrawals(currentMonth, currentYear);
  const totalWithdrawn = monthWithdrawals.reduce((s, w) => s + w.grossAmount, 0);
  const totalFees = monthWithdrawals.reduce((s, w) => s + w.fee, 0);
  const netReceived = monthWithdrawals.reduce((s, w) => s + w.netAmount, 0);

  const net = winAmount - lossAmount;
  const totalDays = wins + losses;
  const tradeFees = totalDays * TRADE_FEE;
  const profit = net - monthlyCost - tradeFees;
  const avgWin = wins > 0 ? winAmount / wins : 0;
  const avgLoss = losses > 0 ? lossAmount / losses : 0;

  document.getElementById('monthlyReport').innerHTML = `
    <h3>Reporte de ${MONTHS_ES[currentMonth]} ${currentYear}</h3>
    <div class="report-grid">
      <div class="report-item">
        <div class="label">Dias Ganados</div>
        <div class="value" style="color:var(--win-text)">${wins}</div>
      </div>
      <div class="report-item">
        <div class="label">Dias Perdidos</div>
        <div class="value" style="color:var(--loss-text)">${losses}</div>
      </div>
      <div class="report-item">
        <div class="label">Total Ganancias</div>
        <div class="value" style="color:var(--win-text)">+$${winAmount.toFixed(2)}</div>
      </div>
      <div class="report-item">
        <div class="label">Total Perdidas</div>
        <div class="value" style="color:var(--loss-text)">-$${lossAmount.toFixed(2)}</div>
      </div>
      <div class="report-item">
        <div class="label">Mejor Dia</div>
        <div class="value" style="color:var(--win-text)">+$${bestDay.toFixed(2)}</div>
      </div>
      <div class="report-item">
        <div class="label">Peor Dia</div>
        <div class="value" style="color:var(--loss-text)">-$${worstDay.toFixed(2)}</div>
      </div>
      <div class="report-item">
        <div class="label">Promedio Ganancia</div>
        <div class="value">$${avgWin.toFixed(2)}</div>
      </div>
      <div class="report-item">
        <div class="label">Promedio Perdida</div>
        <div class="value">$${avgLoss.toFixed(2)}</div>
      </div>
      <div class="report-item">
        <div class="label">Fees Operacion ($${TRADE_FEE} x${totalDays})</div>
        <div class="value" style="color:var(--loss-text)">-$${tradeFees.toFixed(2)}</div>
      </div>
      <div class="report-item">
        <div class="label">Costos Mensuales</div>
        <div class="value" style="color:var(--loss-text)">-$${monthlyCost.toFixed(2)}</div>
      </div>
      <div class="report-item">
        <div class="label">Profit Neto Real</div>
        <div class="value" style="color:${profit >= 0 ? 'var(--win-text)' : 'var(--loss-text)'}">
          ${profit >= 0 ? '+' : '-'}$${Math.abs(profit).toFixed(2)}
        </div>
      </div>
      <div class="report-item">
        <div class="label">Retirado (Bruto)</div>
        <div class="value">$${totalWithdrawn.toFixed(2)}</div>
      </div>
      <div class="report-item">
        <div class="label">Comisiones Retiro</div>
        <div class="value" style="color:var(--loss-text)">-$${totalFees.toFixed(2)}</div>
      </div>
    </div>
  `;
}

function getMonthWithdrawals(month, year) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const accountsToCheck = state.selectedAccountId === 'all'
    ? state.accounts
    : state.accounts.filter(a => a.id === state.selectedAccountId);

  return state.withdrawals.filter(w =>
    w.date.startsWith(prefix) && accountsToCheck.some(a => a.id === w.accountId)
  );
}

// ========== WITHDRAWALS ==========
function renderWithdrawals() {
  const { currentMonth, currentYear } = state;
  const monthWithdrawals = getMonthWithdrawals(currentMonth, currentYear);

  const list = document.getElementById('withdrawalsList');

  if (monthWithdrawals.length === 0) {
    list.innerHTML = '<div class="no-withdrawals">No hay retiros este mes</div>';
    return;
  }

  list.innerHTML = monthWithdrawals.map(w => {
    const acc = state.accounts.find(a => a.id === w.accountId);
    const accName = acc ? acc.name : 'Cuenta eliminada';
    const [y, m, d] = w.date.split('-');
    return `<div class="withdrawal-item">
      <div class="w-info">
        <span class="w-date">${parseInt(d)}/${parseInt(m)}/${y}</span>
        <span class="w-account">${accName}</span>
      </div>
      <div class="w-amounts">
        <div class="w-gross">$${w.grossAmount.toFixed(2)}</div>
        <div class="w-fee">Comision: -$${w.fee.toFixed(2)} | Neto: $${w.netAmount.toFixed(2)}</div>
      </div>
      <span class="w-delete" data-wid="${w.id}">&times;</span>
    </div>`;
  }).join('');

  list.querySelectorAll('.w-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      state.withdrawals = state.withdrawals.filter(w => w.id !== btn.dataset.wid);
      saveState();
      renderAll();
    });
  });
}

// ========== YEAR OVERVIEW ==========
function renderYearOverview() {
  const year = state.currentYear;
  let totalWin = 0, totalLoss = 0, totalCost = 0, totalWithdrawnFees = 0, totalNetReceived = 0;
  let totalWins = 0, totalLosses = 0;

  for (let m = 0; m < 12; m++) {
    const entries = getMonthEntries(m, year);
    entries.forEach(e => {
      if (e.result === 'win') { totalWins++; totalWin += e.amount; }
      else { totalLosses++; totalLoss += e.amount; }
    });
    totalCost += getActiveMonthlyCost(m, year);
  }

  const yearWithdrawals = state.withdrawals.filter(w => w.date.startsWith(String(year)));
  const accountsToCheck = state.selectedAccountId === 'all'
    ? state.accounts
    : state.accounts.filter(a => a.id === state.selectedAccountId);

  const filteredWithdrawals = yearWithdrawals.filter(w => accountsToCheck.some(a => a.id === w.accountId));
  totalWithdrawnFees = filteredWithdrawals.reduce((s, w) => s + w.fee, 0);
  totalNetReceived = filteredWithdrawals.reduce((s, w) => s + w.netAmount, 0);

  const netTrading = totalWin - totalLoss;
  const totalDays = totalWins + totalLosses;
  const totalTradeFees = totalDays * TRADE_FEE;
  const netAfterAll = netTrading - totalCost - totalWithdrawnFees - totalTradeFees;
  const winRate = totalDays > 0 ? ((totalWins / totalDays) * 100).toFixed(0) : 0;

  document.getElementById('yearStats').innerHTML = `
    <div class="report-item">
      <div class="label">Ganancias Totales</div>
      <div class="value" style="color:var(--win-text)">+$${totalWin.toFixed(2)}</div>
    </div>
    <div class="report-item">
      <div class="label">Perdidas Totales</div>
      <div class="value" style="color:var(--loss-text)">-$${totalLoss.toFixed(2)}</div>
    </div>
    <div class="report-item">
      <div class="label">Net Trading</div>
      <div class="value" style="color:${netTrading >= 0 ? 'var(--win-text)' : 'var(--loss-text)'}">
        ${netTrading >= 0 ? '+' : '-'}$${Math.abs(netTrading).toFixed(2)}
      </div>
    </div>
    <div class="report-item">
      <div class="label">Fees Operacion ($${TRADE_FEE} x${totalDays})</div>
      <div class="value" style="color:var(--loss-text)">-$${totalTradeFees.toFixed(2)}</div>
    </div>
    <div class="report-item">
      <div class="label">Costos Anuales</div>
      <div class="value" style="color:var(--loss-text)">-$${totalCost.toFixed(2)}</div>
    </div>
    <div class="report-item">
      <div class="label">Comisiones Retiro</div>
      <div class="value" style="color:var(--loss-text)">-$${totalWithdrawnFees.toFixed(2)}</div>
    </div>
    <div class="report-item">
      <div class="label">Neto Recibido (Retiros)</div>
      <div class="value">$${totalNetReceived.toFixed(2)}</div>
    </div>
    <div class="report-item">
      <div class="label">Profit Final Real</div>
      <div class="value" style="color:${netAfterAll >= 0 ? 'var(--win-text)' : 'var(--loss-text)'}">
        ${netAfterAll >= 0 ? '+' : '-'}$${Math.abs(netAfterAll).toFixed(2)}
      </div>
    </div>
    <div class="report-item">
      <div class="label">Win Rate Anual</div>
      <div class="value">${winRate}% (${totalDays} dias)</div>
    </div>
  `;
}

// ========== RENDER ALL ==========
function renderAll() {
  renderMotivation();
  renderAccounts();
  renderCalendar();
  renderStats();
  renderMonthlyReport();
  renderWithdrawals();
  renderYearOverview();
  populateAccountSelects();
}

// ========== LOGIN / AUTH ==========
async function handleLogin() {
  const pin = document.getElementById('pinInput').value.trim();
  if (pin.length < 4) {
    alert('El PIN debe tener al menos 4 digitos');
    return;
  }

  currentUserPin = pin;
  localStorage.setItem('da_pin', pin);

  // Try loading from cloud first
  const cloudLoaded = await loadFromCloud();
  if (!cloudLoaded) {
    // No cloud data — load local or start fresh
    loadStateLocal();
  }

  ensureDefaultAccount();
  showMainApp();
}

function showMainApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  renderAll();
  setSyncStatus('synced');
}

function handleLogout() {
  currentUserPin = null;
  localStorage.removeItem('da_pin');
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('pinInput').value = '';
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in
  const savedPin = localStorage.getItem('da_pin');
  if (savedPin) {
    currentUserPin = savedPin;
    loadFromCloud().then(cloudLoaded => {
      if (!cloudLoaded) loadStateLocal();
      ensureDefaultAccount();
      showMainApp();
    });
  }

  // Login
  document.getElementById('btnLogin').addEventListener('click', handleLogin);
  document.getElementById('pinInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Logout
  document.getElementById('btnLogout').addEventListener('click', handleLogout);

  // Navigation
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    saveState();
    renderAll();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    saveState();
    renderAll();
  });

  // Day Modal
  document.getElementById('closeDayModal').addEventListener('click', () => {
    document.getElementById('dayModal').classList.remove('show');
  });

  document.getElementById('dayModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('dayModal')) {
      document.getElementById('dayModal').classList.remove('show');
    }
  });

  document.getElementById('toggleWin').addEventListener('click', () => {
    currentEditResult = 'win';
    updateToggleButtons();
  });

  document.getElementById('toggleLoss').addEventListener('click', () => {
    currentEditResult = 'loss';
    updateToggleButtons();
  });

  document.getElementById('modalAccountSelect').addEventListener('change', (e) => {
    loadEntryForModal(e.target.value, currentEditDate);
  });

  document.getElementById('saveDayEntry').addEventListener('click', () => {
    const accId = document.getElementById('modalAccountSelect').value;
    const amount = parseFloat(document.getElementById('amountInput').value);
    const notes = document.getElementById('notesInput').value.trim();

    if (isNaN(amount) || amount <= 0) {
      alert('Ingresa un monto valido');
      return;
    }

    const key = `${accId}_${currentEditDate}`;
    state.entries[key] = {
      result: currentEditResult,
      amount: amount,
      notes: notes
    };

    saveState();
    document.getElementById('dayModal').classList.remove('show');
    renderAll();
  });

  document.getElementById('deleteDayEntry').addEventListener('click', () => {
    const accId = document.getElementById('modalAccountSelect').value;
    const key = `${accId}_${currentEditDate}`;
    if (confirm('Eliminar este registro?')) {
      delete state.entries[key];
      saveState();
      document.getElementById('dayModal').classList.remove('show');
      renderAll();
    }
  });

  // Account Modal
  document.getElementById('btnAddAccount').addEventListener('click', () => {
    document.getElementById('accountName').value = '';
    document.getElementById('accountCost').value = '50';
    document.getElementById('accountFee').value = '10';
    document.getElementById('accountStartDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('accountModal').classList.add('show');
  });

  document.getElementById('closeAccountModal').addEventListener('click', () => {
    document.getElementById('accountModal').classList.remove('show');
  });

  document.getElementById('accountModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('accountModal')) {
      document.getElementById('accountModal').classList.remove('show');
    }
  });

  const accountColors = ['#e74c8b', '#4cc9f0', '#f4a261', '#06d6a0', '#8338ec', '#ff6b6b'];

  document.getElementById('saveAccount').addEventListener('click', () => {
    const name = document.getElementById('accountName').value.trim();
    const cost = parseFloat(document.getElementById('accountCost').value);
    const fee = parseFloat(document.getElementById('accountFee').value);
    const startDate = document.getElementById('accountStartDate').value;

    if (!name) { alert('Ingresa un nombre para la cuenta'); return; }
    if (isNaN(cost) || cost < 0) { alert('Costo mensual invalido'); return; }
    if (isNaN(fee) || fee < 0 || fee > 100) { alert('Comision invalida'); return; }
    if (!startDate) { alert('Selecciona fecha de inicio'); return; }

    state.accounts.push({
      id: generateId(),
      name,
      monthlyCost: cost,
      withdrawalFee: fee,
      startDate,
      color: accountColors[state.accounts.length % accountColors.length]
    });

    saveState();
    document.getElementById('accountModal').classList.remove('show');
    renderAll();
  });

  // Withdrawal Modal
  document.getElementById('btnAddWithdrawal').addEventListener('click', () => {
    populateAccountSelects();
    document.getElementById('withdrawalDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('withdrawalAmount').value = '';
    updateWithdrawalCalc();
    document.getElementById('withdrawalModal').classList.add('show');
  });

  document.getElementById('closeWithdrawalModal').addEventListener('click', () => {
    document.getElementById('withdrawalModal').classList.remove('show');
  });

  document.getElementById('withdrawalModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('withdrawalModal')) {
      document.getElementById('withdrawalModal').classList.remove('show');
    }
  });

  document.getElementById('withdrawalAmount').addEventListener('input', updateWithdrawalCalc);
  document.getElementById('withdrawalAccountSelect').addEventListener('change', updateWithdrawalCalc);

  document.getElementById('saveWithdrawal').addEventListener('click', () => {
    const accId = document.getElementById('withdrawalAccountSelect').value;
    const date = document.getElementById('withdrawalDate').value;
    const grossAmount = parseFloat(document.getElementById('withdrawalAmount').value);

    if (!date) { alert('Selecciona una fecha'); return; }
    if (isNaN(grossAmount) || grossAmount <= 0) { alert('Ingresa un monto valido'); return; }

    const acc = state.accounts.find(a => a.id === accId);
    const feePercent = acc ? acc.withdrawalFee : 10;
    const fee = grossAmount * (feePercent / 100);
    const netAmount = grossAmount - fee;

    state.withdrawals.push({
      id: generateId(),
      accountId: accId,
      date,
      grossAmount,
      fee,
      netAmount
    });

    saveState();
    document.getElementById('withdrawalModal').classList.remove('show');
    renderAll();
  });
});

function updateWithdrawalCalc() {
  const accId = document.getElementById('withdrawalAccountSelect').value;
  const amount = parseFloat(document.getElementById('withdrawalAmount').value) || 0;
  const acc = state.accounts.find(a => a.id === accId);
  const feePercent = acc ? acc.withdrawalFee : 10;
  const fee = amount * (feePercent / 100);
  const net = amount - fee;

  document.getElementById('feeAmount').textContent = `$${fee.toFixed(2)}`;
  document.getElementById('netAmount').textContent = `$${net.toFixed(2)}`;
}
