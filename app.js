/**
 * Setad Intelligent Tender Monitor — Interactive Showcase & Live Demo Engine
 * Author: Portfolio Showcase
 * Description: Client-side reactive dashboard simulating full enterprise backend
 *              with real-time filtering, drawer preview, simulated ML OCR,
 *              batch operations, and live terminal streaming.
 */

// Initialize state
const state = {
  tenders: [],
  activeView: 'all',
  q: '',
  province: '',
  status: 'all',
  urgency: 'all',
  sortKey: 'pub',
  sortAsc: false,
  selected: new Set(),
  activeTenderId: null,
  sidebarNarrow: false,
  logStreaming: false,
  logInterval: null,
  logs: []
};

// Normalize Persian strings for search
function faNorm(str) {
  if (!str) return '';
  return String(str)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/‌/g, ' ')
    .replace(/\u0640/g, '')
    .trim()
    .toLowerCase();
}

// Format numbers with commas
function formatNumber(num) {
  if (!num && num !== 0) return '—';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Toast notification
let toastTimer = null;
function showToast(msg, icon = 'ℹ️') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toastMsg');
  const iconEl = document.getElementById('toastIcon');
  if (!toast) return;

  msgEl.textContent = msg;
  iconEl.textContent = icon;
  toast.classList.remove('hidden');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// Compute Statistics for all views
function computeStats() {
  const all = state.tenders.filter(t => !t.trashed);
  const active = all.filter(t => !t.archived);
  const unread = active.filter(t => !t.read);
  const today = active.filter(t => t.added && (t.added.includes('1405-07-10') || t.pub.includes('1405/07/10')));
  const full = active.filter(t => t.status === 'Full');
  const listOnly = active.filter(t => t.status === 'List-only');
  const urgent = active.filter(t => t.days_left !== null && t.days_left >= 0 && t.days_left <= 3);
  const alerts = active.filter(t => t.hit || (t.matched && t.matched.length > 0));
  const favs = active.filter(t => t.fav);
  const archived = all.filter(t => t.archived);
  const trash = state.tenders.filter(t => t.trashed);

  const fullPct = active.length ? Math.round((full.length / active.length) * 100) : 0;

  return {
    total: all.length,
    active: active.length,
    unread: unread.length,
    today: today.length,
    full: full.length,
    full_pct: fullPct,
    list_only: listOnly.length,
    urgent: urgent.length,
    alerts: alerts.length,
    favs: favs.length,
    archived: archived.length,
    trash: trash.length
  };
}

// Update Sidebar View Badges & Counts
function updateSidebarUI() {
  const stats = computeStats();

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('stat-total-head', `${stats.active} مورد`);
  setEl('stat-total', stats.active);
  setEl('stat-unread', stats.unread);
  setEl('stat-today', stats.today);
  setEl('stat-full', stats.full);
  setEl('stat-full-pct', `${stats.full_pct}%`);
  setEl('stat-list', stats.list_only);
  setEl('stat-urgent', stats.urgent);
  setEl('stat-alerts', stats.alerts);
  setEl('stat-favs', stats.favs);
  setEl('stat-archived', stats.archived);
  setEl('stat-trash', stats.trash);

  const bar = document.getElementById('stat-full-bar');
  if (bar) bar.style.width = `${stats.full_pct}%`;

  // Update active sidebar nav styling
  document.querySelectorAll('.sidebar-nav-item').forEach(el => {
    const viewName = el.getAttribute('data-view');
    if (viewName === state.activeView) {
      el.classList.add('bg-orange-50', 'text-orange-950', 'border-orange-200', 'font-bold');
      el.classList.remove('bg-white', 'text-slate-700', 'border-transparent');
    } else {
      el.classList.remove('bg-orange-50', 'text-orange-950', 'border-orange-200', 'font-bold');
      el.classList.add('bg-white', 'text-slate-700', 'border-transparent');
    }
  });
}

// Filter and Sort Tenders
function getFilteredTenders() {
  let list = [...state.tenders];

  // 1. View filtering
  if (state.activeView === 'trash') {
    list = list.filter(t => t.trashed);
  } else {
    // Exclude trashed from all other views
    list = list.filter(t => !t.trashed);

    if (state.activeView === 'archived') {
      list = list.filter(t => t.archived);
    } else {
      // Exclude archived from normal views
      list = list.filter(t => !t.archived);

      if (state.activeView === 'unread') {
        list = list.filter(t => !t.read);
      } else if (state.activeView === 'today') {
        list = list.filter(t => t.added && (t.added.includes('1405-07-10') || t.pub.includes('1405/07/10')));
      } else if (state.activeView === 'full') {
        list = list.filter(t => t.status === 'Full');
      } else if (state.activeView === 'list') {
        list = list.filter(t => t.status === 'List-only');
      } else if (state.activeView === 'urgent') {
        list = list.filter(t => t.days_left !== null && t.days_left >= 0 && t.days_left <= 3);
      } else if (state.activeView === 'alerts') {
        list = list.filter(t => t.hit || (t.matched && t.matched.length > 0));
      } else if (state.activeView === 'favs') {
        list = list.filter(t => t.fav);
      }
    }
  }

  // 2. Search query filter
  if (state.q.trim()) {
    const qNorm = faNorm(state.q);
    list = list.filter(t => {
      const matchTitle = faNorm(t.title).includes(qNorm);
      const matchNum = String(t.number || '').includes(qNorm) || String(t.id).includes(qNorm);
      const matchOrg = faNorm(t.org).includes(qNorm);
      const matchWork = faNorm(t.work).includes(qNorm);
      const matchProv = faNorm(t.province).includes(qNorm);
      return matchTitle || matchNum || matchOrg || matchWork || matchProv;
    });
  }

  // 3. Dropdown province filter
  if (state.province) {
    list = list.filter(t => (t.province || '').includes(state.province));
  }

  // 4. Dropdown status filter
  if (state.status !== 'all') {
    list = list.filter(t => t.status === state.status);
  }

  // 5. Dropdown urgency filter
  if (state.urgency !== 'all') {
    if (state.urgency === 'urgent') {
      list = list.filter(t => t.days_left !== null && t.days_left >= 0 && t.days_left <= 3);
    } else if (state.urgency === 'soon') {
      list = list.filter(t => t.days_left !== null && t.days_left > 3 && t.days_left <= 7);
    } else if (state.urgency === 'ok') {
      list = list.filter(t => t.days_left !== null && t.days_left > 7);
    } else if (state.urgency === 'expired') {
      list = list.filter(t => t.days_left !== null && t.days_left < 0);
    }
  }

  // 6. Sorting
  list.sort((a, b) => {
    let va = a[state.sortKey] || '';
    let vb = b[state.sortKey] || '';

    if (state.sortKey === 'pub' || state.sortKey === 'added') {
      va = String(va);
      vb = String(vb);
    } else if (state.sortKey === 'id' || state.sortKey === 'days_left') {
      va = Number(va) || 0;
      vb = Number(vb) || 0;
    } else {
      va = faNorm(String(va));
      vb = faNorm(String(vb));
    }

    if (va < vb) return state.sortAsc ? -1 : 1;
    if (va > vb) return state.sortAsc ? 1 : -1;
    return 0;
  });

  return list;
}

// Render main table
function renderTable() {
  const list = getFilteredTenders();
  const tbody = document.getElementById('tenderTableBody');
  const countEl = document.getElementById('tableCountLabel');
  const clearBtn = document.getElementById('clearFiltersBtn');

  if (countEl) countEl.textContent = `${list.length} مناقصه`;

  // Show/hide clear filters button
  const hasActiveFilters = state.q || state.province || state.status !== 'all' || state.urgency !== 'all';
  if (clearBtn) clearBtn.classList.toggle('hidden', !hasActiveFilters);

  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="p-12 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center space-y-3">
            <span class="text-3xl">🔍</span>
            <p class="font-medium text-slate-600">هیچ مناقصه‌ای با این مشخصات یافت نشد.</p>
            <p class="text-xs text-slate-400">فیلترها را تغییر دهید یا دکمه «پاک‌سازی فیلترها» را بزنید.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map(t => {
    const isSelected = state.selected.has(t.id);
    const isFull = t.status === 'Full';
    const hitClass = t.hit ? 'hit-row' : '';
    const unreadDot = !t.read ? '<span class="w-2 h-2 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50 shrink-0" title="جدید و خوانده‌نشده"></span>' : '';

    return `
      <tr class="trow ${hitClass} border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer ${isSelected ? 'bg-orange-50/60' : ''}" onclick="handleRowClick(event, ${t.id})">
        
        <!-- 1. Checkbox & Unread dot -->
        <td class="td w-10 text-center" onclick="event.stopPropagation()">
          <div class="flex items-center justify-center gap-1.5">
            ${unreadDot}
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelect(${t.id})" class="rounded border-slate-300 text-orange-600 focus:ring-orange-500 h-4 w-4 cursor-pointer">
          </div>
        </td>

        <!-- 2. Favorite Star -->
        <td class="td w-8 text-center" onclick="event.stopPropagation()">
          <button onclick="toggleFav(${t.id})" class="text-base transition hover:scale-125 focus:outline-none" title="${t.fav ? 'حذف از نشان‌شده‌ها' : 'نشان‌دار کردن'}">
            ${t.fav ? '⭐' : '<span class="text-slate-300 hover:text-amber-400">☆</span>'}
          </button>
        </td>

        <!-- 3. Status Badge (Full / List-only) -->
        <td class="td w-28 whitespace-nowrap">
          <div class="flex items-center gap-1.5">
            <span class="chip ${isFull ? 'c-full' : 'c-list'}">
              ${isFull ? '✓ کامل' : '⏳ فاز ۱'}
            </span>
            ${!isFull ? `
              <button onclick="event.stopPropagation(); simulateOCR(${t.id})" class="text-[10px] bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded font-bold transition flex items-center gap-0.5" title="شبیه‌سازی حل کپچا و استخراج فوری">
                <span>⚡</span>
                <span class="hidden xl:inline">OCR</span>
              </button>
            ` : ''}
          </div>
        </td>

        <!-- 4. Urgency -->
        <td class="td w-24 whitespace-nowrap">
          <span class="chip ${t.urgency_css || 'u-ok'}">${t.urgency || '—'}</span>
        </td>

        <!-- 5. Tender Number & Publish Date -->
        <td class="td w-36 whitespace-nowrap">
          <div class="flex flex-col">
            <span class="font-mono text-xs font-bold text-slate-800">${t.number || t.id}</span>
            <span class="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
              <span>📅</span>
              <span>${t.pub || '—'}</span>
            </span>
          </div>
        </td>

        <!-- 6. Title & Organization -->
        <td class="td">
          <div class="flex flex-col space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs text-slate-900 leading-5 line-clamp-1 hover:text-orange-600 transition">
                ${t.title || 'بدون عنوان'}
              </span>
              ${t.hit ? '<span class="chip bg-orange-100 text-orange-800 border-orange-200 text-[9px] py-0 px-1.5 font-bold">🎯 هشدار کلیدواژه</span>' : ''}
            </div>
            <div class="flex items-center gap-3 text-[11px] text-slate-500">
              <span class="flex items-center gap-1 truncate max-w-xs" title="${t.org}">
                <span class="text-slate-400">🏢</span>
                <span>${t.org || 'سازمان نامشخص'}</span>
              </span>
              <span class="text-slate-300">|</span>
              <span class="chip bg-slate-100 text-slate-600 border-slate-200 text-[10px] py-0 px-1.5">
                ${t.province || 'کشوری'}
              </span>
            </div>
          </div>
        </td>

        <!-- 7. Guarantee Price (مبلغ ضمانت‌نامه) -->
        <td class="td w-36 whitespace-nowrap">
          <div class="flex flex-col">
            <span class="text-xs font-bold font-mono ${t.guar ? 'text-emerald-700' : 'text-slate-400'}">
              ${t.guar || (isFull ? 'بدون ضمانت' : '🔒 حل کپچا لازم است')}
            </span>
            <span class="text-[10px] text-slate-400">تضمین شرکت</span>
          </div>
        </td>

        <!-- 8. Deadlines (Proposal Deadline) -->
        <td class="td w-32 whitespace-nowrap">
          <div class="flex flex-col text-[11px]">
            <span class="font-mono font-medium text-slate-700">${t.prop_dl || '—'}</span>
            <span class="text-[10px] text-slate-400">مهلت ارسال پاکت</span>
          </div>
        </td>

        <!-- 9. Quick Actions -->
        <td class="td w-20 text-center whitespace-nowrap" onclick="event.stopPropagation()">
          <div class="flex items-center justify-center gap-1">
            <button onclick="openDrawer(${t.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-200 transition" title="مشاهده شناسنامه و کشوی اطلاعات">
              👁️
            </button>
            <a href="${t.check_link || '#'}" target="_blank" class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition" title="مشاهده مستقیم در ستاد">
              🔗
            </a>
          </div>
        </td>

      </tr>`;
  }).join('');

  updateBatchDock();
}

// Handle row click
function handleRowClick(e, id) {
  // Ignore clicks on buttons/inputs
  if (['INPUT', 'BUTTON', 'A', 'LABEL'].includes(e.target.tagName)) return;
  openDrawer(id);
}

// Select operations
function toggleSelect(id) {
  if (state.selected.has(id)) {
    state.selected.delete(id);
  } else {
    state.selected.add(id);
  }
  renderTable();
}

function selectAllRows(checkbox) {
  const list = getFilteredTenders();
  if (checkbox.checked) {
    list.forEach(t => state.selected.add(t.id));
  } else {
    state.selected.clear();
  }
  renderTable();
}

function selectOnlyUnread() {
  state.selected.clear();
  const list = getFilteredTenders();
  list.filter(t => !t.read).forEach(t => state.selected.add(t.id));
  renderTable();
  showToast(`${state.selected.size} مورد جدید انتخاب شد`, '✨');
}

function clearSelection() {
  state.selected.clear();
  const headerCheck = document.getElementById('selectAllHeader');
  if (headerCheck) headerCheck.checked = false;
  renderTable();
}

// Update Floating Batch Dock
function updateBatchDock() {
  const dock = document.getElementById('batchActionBar');
  const countEl = document.getElementById('batchSelectedCount');
  const count = state.selected.size;

  if (!dock) return;

  if (count > 0) {
    if (countEl) countEl.textContent = count;
    dock.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-8');
    dock.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
  } else {
    dock.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8');
    dock.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
  }
}

// Favorites & Read
function toggleFav(id) {
  const item = state.tenders.find(t => t.id === id);
  if (!item) return;
  item.fav = !item.fav;
  updateSidebarUI();
  renderTable();
  showToast(item.fav ? 'مناقصه نشان شد ⭐' : 'نشان مناقصه برداشته شد');
}

function toggleRead(id, status = true) {
  const item = state.tenders.find(t => t.id === id);
  if (!item) return;
  item.read = status;
  updateSidebarUI();
  renderTable();
}

// Batch actions
function batchMarkRead(status) {
  let count = 0;
  state.tenders.forEach(t => {
    if (state.selected.has(t.id)) {
      t.read = status;
      count++;
    }
  });
  updateSidebarUI();
  renderTable();
  showToast(`${count} مناقصه به عنوان ${status ? 'خوانده‌شده' : 'خوانده‌نشده'} ثبت شد.`, '✓');
}

function batchToggleFav() {
  let count = 0;
  state.tenders.forEach(t => {
    if (state.selected.has(t.id)) {
      t.fav = !t.fav;
      count++;
    }
  });
  updateSidebarUI();
  renderTable();
  showToast(`وضعیت نشان ${count} مورد تغییر یافت.`, '⭐');
}

function batchArchive(status = true) {
  let count = 0;
  state.tenders.forEach(t => {
    if (state.selected.has(t.id)) {
      t.archived = status;
      count++;
    }
  });
  clearSelection();
  updateSidebarUI();
  renderTable();
  showToast(`${count} مناقصه ${status ? 'به بایگانی منتقل شد' : 'از بایگانی بازگردانده شد'}.`, '📦');
}

function batchTrash(status = true) {
  let count = 0;
  state.tenders.forEach(t => {
    if (state.selected.has(t.id)) {
      t.trashed = status;
      count++;
    }
  });
  clearSelection();
  updateSidebarUI();
  renderTable();
  showToast(`${count} مناقصه به سطل زباله منتقل شد.`, '🗑️');
}

// Simulated Batch OCR Solver
function batchSimulateOCR() {
  const toProcess = state.tenders.filter(t => state.selected.has(t.id) && t.status === 'List-only');
  if (toProcess.length === 0) {
    showToast('همه موارد انتخابی قبلاً کامل شده‌اند!', 'ℹ️');
    return;
  }

  showToast(`در حال استخراج هوشمند و حل کپچا برای ${toProcess.length} مورد با ddddocr...`, '⚡');

  setTimeout(() => {
    toProcess.forEach((t, idx) => {
      t.status = 'Full';
      t.full = true;
      if (!t.guar) {
        const randGuar = (Math.floor(Math.random() * 50) + 5) * 100000000;
        t.guar = `${formatNumber(randGuar)} ریال`;
      }
      if (!t.est) {
        const randEst = (Math.floor(Math.random() * 80) + 10) * 1000000000;
        t.est = `${formatNumber(randEst)} ریال`;
      }
    });
    updateSidebarUI();
    renderTable();
    showToast(`✅ فاز ۲ برای ${toProcess.length} مورد با موفقیت استخراج شد!`, '🎉');
  }, 1200);
}

// Batch Export CSV / Excel
function batchExportExcel() {
  const selectedTenders = state.tenders.filter(t => state.selected.has(t.id));
  if (selectedTenders.length === 0) return;

  // Build CSV content with BOM for UTF-8 Persian Excel compatibility
  let csv = '\uFEFF';
  csv += 'شناسه,شماره فراخوان,عنوان مناقصه,دستگاه اجرایی,استان,تاریخ انتشار,مهلت پیشنهاد,مبلغ تضمین,مبلغ برآورد,وضعیت\n';

  selectedTenders.forEach(t => {
    const row = [
      t.id,
      `"${t.number || ''}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.org || '').replace(/"/g, '""')}"`,
      `"${t.province || ''}"`,
      `"${t.pub || ''}"`,
      `"${t.prop_dl || ''}"`,
      `"${t.guar || ''}"`,
      `"${t.est || ''}"`,
      `"${t.status || ''}"`
    ];
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `TenderSheet_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToast(`فایل اکسل برای ${selectedTenders.length} مناقصه دانلود شد.`, '📊');
}

// Batch Copy to Clipboard
function batchCopyClipboard() {
  const selectedTenders = state.tenders.filter(t => state.selected.has(t.id));
  if (selectedTenders.length === 0) return;

  const text = selectedTenders.map((t, idx) => {
    return `${idx + 1}. ${t.title}\n   شماره: ${t.number}\n   کارفرما: ${t.org} (${t.province})\n   تضمین: ${t.guar || 'نامشخص'}\n   مهلت: ${t.prop_dl}\n   لینک: ${t.check_link}\n`;
  }).join('\n----------------------------------------\n\n');

  navigator.clipboard.writeText(text).then(() => {
    showToast(`مشخصات ${selectedTenders.length} مناقصه در کلیپ‌بورد کپی شد.`, '📋');
  });
}

// Drawer Preview
function openDrawer(id) {
  state.activeTenderId = id;
  const tender = state.tenders.find(t => t.id === id);
  if (!tender) return;

  // Mark as read immediately
  tender.read = true;
  updateSidebarUI();

  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('quickDrawer');
  const content = document.getElementById('drawerContent');

  if (!overlay || !drawer || !content) return;

  overlay.classList.remove('hidden');
  setTimeout(() => {
    drawer.classList.remove('translate-x-full');
  }, 10);

  renderDrawerContent(tender);
}

function closeDrawer() {
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('quickDrawer');
  if (!overlay || !drawer) return;

  drawer.classList.add('translate-x-full');
  setTimeout(() => {
    overlay.classList.add('hidden');
    state.activeTenderId = null;
  }, 250);
}

function renderDrawerContent(t) {
  const content = document.getElementById('drawerContent');
  if (!content) return;

  const isFull = t.status === 'Full';
  const d = t.detail || {};
  const lst = t.list || {};

  content.innerHTML = `
    <div class="space-y-4 text-slate-800">
      
      <!-- Top Card -->
      <div class="card p-4 space-y-3 bg-gradient-to-br from-white to-slate-50 border-slate-200">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="chip ${t.urgency_css || 'u-ok'}">${t.urgency || '—'}</span>
          <span class="chip ${isFull ? 'c-full' : 'c-list'}">${isFull ? '✓ جزئیات کامل' : '⏳ فاز ۱ (در انتظار OCR)'}</span>
          <span class="chip bg-slate-100 text-slate-700 border-slate-200">${t.typeName || t.type || 'مناقصه'}</span>
          ${t.fav ? '<span class="chip bg-amber-50 text-amber-700 border-amber-200">⭐ نشان‌شده</span>' : ''}
        </div>

        <h2 class="text-base font-bold leading-7 text-slate-900">${t.title || 'بدون عنوان'}</h2>

        <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div><span class="text-slate-400">شماره فراخوان:</span> <b class="font-mono text-slate-800">${t.number || t.id}</b></div>
          <div><span class="text-slate-400">تاریخ انتشار:</span> <b class="font-mono text-slate-800">${t.pub || '—'}</b></div>
          <div class="col-span-2"><span class="text-slate-400">دستگاه مناقصه‌گزار:</span> <b class="text-slate-800">${t.org || '—'}</b></div>
          <div class="col-span-2"><span class="text-slate-400">استان / شهرستان:</span> <b class="text-slate-800">${t.province || '—'}</b></div>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <a href="${t.check_link || '#'}" target="_blank" class="btn-brand text-xs px-3 py-1.5 flex items-center gap-1 shadow-sm">
            <span>مشاهده در ستاد ایران</span> 🔗
          </a>
          <button onclick="toggleFav(${t.id}); renderDrawerContent(state.tenders.find(x => x.id === ${t.id}));" class="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1">
            <span>${t.fav ? '⭐ حذف نشان' : '☆ نشان کردن'}</span>
          </button>
          <button onclick="simulateTelegramAlert(${t.id})" class="btn-ghost text-xs px-2.5 py-1.5 text-sky-700 flex items-center gap-1">
            <span>📨 تست هشدار تلگرام</span>
          </button>
        </div>
      </div>

      <!-- OCR Status Card if List-only -->
      ${!isFull ? `
        <div class="card p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/60 border-amber-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-amber-900 flex items-center gap-1.5">
              <span>⚠️ در انتظار حل خودکار کپچا (فاز ۲)</span>
            </span>
            <button onclick="simulateOCR(${t.id})" id="btnDrawerOCR" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-md shadow-purple-900/20 transition flex items-center gap-1 cursor-pointer">
              <span>⚡ حل هوشمند با OCR</span>
            </button>
          </div>
          <p class="text-[11px] leading-5 text-amber-800">
            اطلاعات هدر در فاز ۱ سریع دریافت شده است. برای مبالغ تضمین و اسناد پیوست روی دکمه بنفش کلیک کنید تا عملکرد مدل CNN حل کپچا شبیه‌سازی شود.
          </p>
        </div>
      ` : ''}

      <!-- Timeline & Deadlines -->
      <div class="card p-3.5 space-y-2.5 border-slate-200">
        <div class="font-bold text-xs text-slate-800 flex items-center justify-between border-b pb-2">
          <span>⏳ تقویم و مهلت‌های کلیدی فراخوان</span>
          <span class="text-[10px] text-slate-400">تقویم شمسی</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span class="text-slate-400 text-[11px] block">مهلت دریافت اسناد:</span>
            <span class="font-bold font-mono text-slate-800 text-xs mt-1 block">${d.docs_deadline || lst.documentsDeadlineDate || t.docs_dl || '—'}</span>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span class="text-slate-400 text-[11px] block">مهلت ارسال پاکت پیشنهاد:</span>
            <span class="font-bold font-mono text-slate-800 text-xs mt-1 block">${d.proposal_deadline || lst.proposalDeadlineDate || t.prop_dl || '—'}</span>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span class="text-slate-400 text-[11px] block">زمان بازگشایی پاکت‌ها:</span>
            <span class="font-bold font-mono text-slate-800 text-xs mt-1 block">${d.eval_date || lst.openingDate || '—'}</span>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span class="text-slate-400 text-[11px] block">اعتبار پیشنهاد قیمت:</span>
            <span class="font-bold font-mono text-slate-800 text-xs mt-1 block">${d.offer_validity || '۳ ماه'}</span>
          </div>
        </div>
      </div>

      <!-- Financial & Guarantees -->
      <div class="card p-3.5 space-y-2.5 border-slate-200">
        <div class="font-bold text-xs text-slate-800 flex items-center justify-between border-b pb-2">
          <span>💰 شرایط مالی و تضامین معتبر (استخراج OCR)</span>
          <span class="chip c-full text-[10px]">استخراج شده</span>
        </div>
        <div class="space-y-2 text-xs">
          <div class="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 flex flex-col">
            <span class="text-emerald-800 font-bold text-[11px]">مبلغ تضمین شرکت در فراخوان:</span>
            <span class="font-black text-emerald-950 font-mono text-sm mt-1">${t.guar || (isFull ? 'بدون ضمانت' : 'پس از حل کپچا نمایش داده می‌شود')}</span>
          </div>
          ${t.est ? `
            <div class="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 flex flex-col">
              <span class="text-blue-800 font-bold text-[11px]">برآورد مالی کل پروژه:</span>
              <span class="font-black text-blue-950 font-mono text-sm mt-1">${t.est}</span>
            </div>
          ` : ''}
          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
            <span class="font-bold text-slate-700">نوع تضمین مجاز:</span> ضمانت‌نامه بانکی معتبر یا فیش واریز نقدی به حساب تمرکز وجوه سپرده
          </div>
        </div>
      </div>

      <!-- Work & Project Description -->
      <div class="card p-3.5 space-y-2 border-slate-200">
        <div class="font-bold text-xs text-slate-800">📝 شرح و مشخصات تفصیلی پروژه</div>
        <p class="text-xs text-slate-700 leading-6 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
          ${t.work || d.full_desc || lst.domainsDescription || 'شرحی در سامانه درج نشده است.'}
        </p>
      </div>

      <!-- Attached Documents -->
      ${t.docs_list && t.docs_list.length > 0 ? `
        <div class="card p-3.5 space-y-2 border-slate-200">
          <div class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
            <span>📎 اسناد پیوست و شرایط فنی (${t.docs_list.length})</span>
          </div>
          <div class="space-y-1.5 text-xs">
            ${t.docs_list.map(doc => `
              <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span class="text-slate-700 font-medium truncate max-w-sm">${doc}</span>
                <span class="chip bg-blue-50 text-blue-700 border-blue-200 text-[10px]">فایل PDF/ZIP</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;
}

// Single Tender OCR Simulation
function simulateOCR(id) {
  const tender = state.tenders.find(t => t.id === id);
  if (!tender) return;

  const btn = document.getElementById('btnDrawerOCR');
  if (btn) {
    btn.innerHTML = `<span class="inline-block animate-spin mr-1">🔄</span> حل کپچا با AI...`;
    btn.disabled = true;
  }

  showToast(`در حال اتصال به مدل هوش مصنوعی ddddocr جهت حل کپچا...`, '🤖');

  setTimeout(() => {
    tender.status = 'Full';
    tender.full = true;
    if (!tender.guar) {
      const randGuar = (Math.floor(Math.random() * 40) + 10) * 125000000;
      tender.guar = `${formatNumber(randGuar)} ریال`;
    }
    if (!tender.est) {
      const randEst = (Math.floor(Math.random() * 60) + 15) * 850000000;
      tender.est = `${formatNumber(randEst)} ریال`;
    }

    updateSidebarUI();
    renderTable();
    if (state.activeTenderId === id) {
      renderDrawerContent(tender);
    }
    showToast(`✅ کپچا در ۰.۶۸ ثانیه با دقت ۹۹.۲٪ حل شد و مبالغ استخراج گردید!`, '🎉');
  }, 1100);
}

// Simulate Telegram Alert
function simulateTelegramAlert(id) {
  const t = state.tenders.find(x => x.id === id);
  if (!t) return;

  showToast(`پیام هشدار با قالب HTML به ربات تلگرام ارسال شد! 📱`, '✈️');
}

// System Architecture Modal
function openArchitectureModal() {
  const modal = document.getElementById('archModal');
  if (modal) modal.classList.remove('hidden');
}

function closeArchitectureModal() {
  const modal = document.getElementById('archModal');
  if (modal) modal.classList.add('hidden');
}

// Terminal Console Simulator
function toggleLogs() {
  const modal = document.getElementById('logModal');
  if (!modal) return;
  const isHidden = modal.classList.contains('hidden');
  if (isHidden) {
    modal.classList.remove('hidden');
    startLogStream();
  } else {
    modal.classList.add('hidden');
    stopLogStream();
  }
}

function startLogStream() {
  if (state.logStreaming) return;
  state.logStreaming = true;

  const sampleLogs = [
    "[INFO] Scheduler triggered: Running hourly 2-phase sync...",
    "[INFO] [Phase 1] Querying Setad API with lookback=3 days...",
    "[INFO] [Phase 1] Fetched 14 new tenders in 420ms (zero captchas required).",
    "[INFO] [Phase 1] Bulk writing 14 records to SQLite seen.db (WAL mode).",
    "[ALERT] Keyword match: 'برق' found in Tender #664875. Instant Phase-1 Telegram alert sent!",
    "[INFO] [Phase 2] Prioritizing candidates: 8 tenders selected for deep OCR inspection.",
    "[INFO] [Phase 2] Tender #664875: Downloading image captcha...",
    "[OCR] Feeding captcha image into ddddocr model...",
    "[OCR] Solved captcha '7A49K' in 0.61s with confidence 0.994.",
    "[INFO] [Phase 2] Detail HTML extracted: Guarantee = 6,421,623,360 Rials, Proposal Deadline = 1405/07/20.",
    "[ALERT] [Phase 2] Comprehensive financial Telegram notification dispatched.",
    "[EXCEL] Syncing TenderSheet.xlsx workbook with new financial fields...",
    "[INFO] Two-phase cycle complete: 14 ingested, 8 parsed, 0 errors. Sleeping until next cycle."
  ];

  const logBox = document.getElementById('logbox');
  if (logBox && logBox.children.length === 0) {
    sampleLogs.slice(0, 5).forEach(msg => appendLog(msg));
  }

  let idx = 5;
  state.logInterval = setInterval(() => {
    if (idx < sampleLogs.length) {
      appendLog(sampleLogs[idx]);
      idx++;
    } else {
      const now = new Date().toLocaleTimeString();
      appendLog(`[INFO] Heartbeat at ${now} - Worker idle, watching for new announcements...`);
    }
  }, 2200);
}

function appendLog(line) {
  const logBox = document.getElementById('logbox');
  if (!logBox) return;

  const row = document.createElement('div');
  row.className = 'font-mono text-xs leading-5 hover:bg-slate-900 px-1 rounded';

  let color = 'text-slate-300';
  if (line.includes('[ALERT]')) color = 'text-amber-400 font-bold';
  else if (line.includes('[OCR]')) color = 'text-purple-400 font-semibold';
  else if (line.includes('[EXCEL]')) color = 'text-emerald-400';
  else if (line.includes('complete')) color = 'text-teal-400 font-bold';

  row.innerHTML = `<span class="text-slate-500">${new Date().toLocaleTimeString()}</span> <span class="${color}">${line}</span>`;
  logBox.appendChild(row);

  const container = document.getElementById('logboxContainer');
  if (container) container.scrollTop = container.scrollHeight;
}

function stopLogStream() {
  state.logStreaming = false;
  if (state.logInterval) {
    clearInterval(state.logInterval);
    state.logInterval = null;
  }
}

function clearLogs() {
  const logBox = document.getElementById('logbox');
  if (logBox) logBox.innerHTML = '';
}

// Sidebar Narrow Toggle (ChatGPT style)
function toggleSidebarNarrow() {
  const aside = document.getElementById('sidebarPane');
  if (!aside) return;
  state.sidebarNarrow = !state.sidebarNarrow;
  aside.classList.toggle('is-narrow', state.sidebarNarrow);
}

// Clear all filters
function clearFilters() {
  state.q = '';
  state.province = '';
  state.status = 'all';
  state.urgency = 'all';

  const qInput = document.getElementById('searchInput');
  const provSelect = document.getElementById('filterProvince');
  const statusSelect = document.getElementById('filterStatus');
  const urgencySelect = document.getElementById('filterUrgency');

  if (qInput) qInput.value = '';
  if (provSelect) provSelect.value = '';
  if (statusSelect) statusSelect.value = 'all';
  if (urgencySelect) urgencySelect.value = 'all';

  renderTable();
}

// Change View
function switchView(viewName) {
  state.activeView = viewName;
  clearSelection();
  updateSidebarUI();
  renderTable();
}

// Sort column
function sortBy(key) {
  if (state.sortKey === key) {
    state.sortAsc = !state.sortAsc;
  } else {
    state.sortKey = key;
    state.sortAsc = (key === 'pub' || key === 'added') ? false : true;
  }
  renderTable();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDrawer();
    closeArchitectureModal();
    const logModal = document.getElementById('logModal');
    if (logModal && !logModal.classList.contains('hidden')) toggleLogs();
    if (state.selected.size > 0) clearSelection();
  }
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    const search = document.getElementById('searchInput');
    if (search) search.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    toggleSidebarNarrow();
  }
});

// App Bootstrap
async function initApp() {
  // 1. Load data
  if (window.INITIAL_TENDERS && Array.isArray(window.INITIAL_TENDERS)) {
    state.tenders = window.INITIAL_TENDERS;
  } else {
    try {
      const res = await fetch('demo-data.json');
      state.tenders = await res.json();
    } catch (err) {
      console.warn('Could not load demo-data.json directly:', err);
    }
  }

  // Populate province dropdown
  const provSelect = document.getElementById('filterProvince');
  if (provSelect) {
    const provs = Array.from(new Set(state.tenders.map(t => t.province).filter(Boolean))).sort();
    provs.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      provSelect.appendChild(opt);
    });
  }

  // Event Listeners for Filters
  const qInput = document.getElementById('searchInput');
  if (qInput) {
    qInput.addEventListener('input', (e) => {
      state.q = e.target.value;
      renderTable();
    });
  }

  const pSelect = document.getElementById('filterProvince');
  if (pSelect) {
    pSelect.addEventListener('change', (e) => {
      state.province = e.target.value;
      renderTable();
    });
  }

  const sSelect = document.getElementById('filterStatus');
  if (sSelect) {
    sSelect.addEventListener('change', (e) => {
      state.status = e.target.value;
      renderTable();
    });
  }

  const uSelect = document.getElementById('filterUrgency');
  if (uSelect) {
    uSelect.addEventListener('change', (e) => {
      state.urgency = e.target.value;
      renderTable();
    });
  }

  // Initial Render
  updateSidebarUI();
  renderTable();
}

document.addEventListener('DOMContentLoaded', initApp);
