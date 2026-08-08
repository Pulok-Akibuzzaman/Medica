const API = '';

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const button = input.nextElementSibling;
  const icon = button.querySelector('.material-icons');

  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = 'visibility_off';
  } else {
    input.type = 'password';
    icon.textContent = 'visibility';
  }
}

function getToken() { return localStorage.getItem('token'); }
function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function isLoggedIn() { return !!getToken(); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${url}`, { ...options, headers });
  const clone = res.clone();
  let data;
  try {
    data = await res.json();
  } catch (err) {
    const text = await clone.text();
    throw new Error(`Invalid JSON response from server: ${text.slice(0, 200)}`);
  }

  if (res.status === 401 || res.status === 403) {
    if (data.error && data.error.includes('expired')) {
      clearAuth();
      window.location.href = '/login.html';
      return;
    }
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function updateNav() {
  const user = getUser();
  const authLinks = document.getElementById('auth-links');
  const userLinks = document.getElementById('user-links');
  const adminLink = document.getElementById('admin-link');
  const userName = document.getElementById('user-name');

  if (!authLinks || !userLinks) return;

  if (isLoggedIn() && user) {
    authLinks.classList.add('hidden');
    userLinks.classList.remove('hidden');
    if (userName) userName.textContent = user.name;
    if (adminLink) {
      if (user.role === 'admin') adminLink.classList.remove('hidden');
      else adminLink.classList.add('hidden');
    }
    if (!document.getElementById('cart-link')) {
      const cart = document.createElement('a');
      cart.id = 'cart-link';
      cart.href = 'cart.html';
      cart.className = 'btn btn-secondary btn-sm';
      cart.title = 'My Cart';
      cart.innerHTML = '🛒 <span id="cart-count" style="display:none;background:var(--danger,#e53e3e);color:#fff;border-radius:10px;padding:0 6px;font-size:0.7rem;margin-left:2px"></span>';
      userLinks.prepend(cart);
    }
    updateCartBadge();
  } else {
    authLinks.classList.remove('hidden');
    userLinks.classList.add('hidden');
  }
}

// Update navigation links with i18n data attributes
function initNavTranslations() {
  // Map nav links to translation keys
  const navMappings = [
    { href: 'index.html', key: 'nav_home' },
    { href: 'medicines.html', key: 'nav_medicines' },
    { href: 'doctors.html', key: 'nav_doctors' },
    { href: 'diseases.html', key: 'nav_diseases' },
    { href: 'investigations.html', key: 'nav_investigations' },
    { href: 'chatbot.html', key: 'nav_assistant' },
    { href: 'admin.html', key: 'nav_admin' }
  ];

  navMappings.forEach(({ href, key }) => {
    const link = Array.from(document.querySelectorAll('.nav-links a')).find(a =>
      a.getAttribute('href') === href
    );
    if (link) link.setAttribute('data-i18n', key);
  });

  // Set auth button translations
  const loginLink = document.querySelector('.nav-actions a[href="login.html"]');
  const registerLink = document.querySelector('.nav-actions a[href="register.html"]');
  if (loginLink) loginLink.setAttribute('data-i18n', 'nav_login');
  if (registerLink) registerLink.setAttribute('data-i18n', 'nav_register');

  if (typeof i18n !== 'undefined') {
    i18n.updatePageLanguage();
  }
}

function formatPrice(price) {
  return `৳${Number(price || 0).toFixed(2)}`;
}

async function updateCartBadge() {
  if (!isLoggedIn()) return;
  try {
    const data = await apiFetch('/api/cart');
    const badge = document.getElementById('cart-count');
    if (badge) {
      const count = data.items.reduce((sum, i) => sum + i.quantity, 0);
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  } catch (e) { /* cart badge is non-critical */ }
}

async function addToCart(medicineId, quantity = 1) {
  if (!isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  await apiFetch('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ medicine_id: medicineId, quantity })
  });
  updateCartBadge();
  showToast('Item added to cart! 🛒', 'success');
  return true;
}

function logout() {
  clearAuth();
  window.location.href = '/';
}

// Shared "recommended medicines" card strip, used on the dashboard,
// medicines catalog, and cart pages against /api/recommendations.
function renderRecommendationCards(items) {
  return items.map(m => {
    const formStrength = m.dosage ? m.dosage.split('\n')[0] : '';
    return `
    <div class="card medicine-card" style="cursor:default">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.25rem">
        <span class="category-badge">${m.category}</span>
        ${formStrength ? `<span style="font-size:0.72rem;background:rgba(13,148,136,0.1);border:1px solid rgba(13,148,136,0.25);padding:2px 8px;border-radius:10px;color:var(--primary);font-weight:600">${formStrength}</span>` : ''}
      </div>
      <h3 style="cursor:pointer;margin-top:0.25rem" onclick="window.location.href='medicines.html?open=${m.id}'">${m.name}</h3>
      <p class="generic">${m.generic_name}${formStrength ? ` &bull; <span style="color:var(--text);font-weight:500">${formStrength}</span>` : ''}</p>
      ${m.reason ? `<p style="font-size:0.8rem;color:var(--primary);margin:0.25rem 0">✨ ${m.reason}</p>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem">
        <strong style="color:var(--primary)">${formatPrice(m.price)}</strong>
        <button class="btn btn-primary btn-sm" onclick="recommendationAddToCart(${m.id}, this)">🛒 Add</button>
      </div>
    </div>
  `;
  }).join('');
}

async function recommendationAddToCart(id, btn) {
  try {
    const added = await addToCart(id);
    if (added && btn) {
      const original = btn.textContent;
      btn.textContent = '✓ Added';
      setTimeout(() => { btn.textContent = original; }, 1500);
    }
  } catch (err) {
    alert(err.message);
  }
}

function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem">
      <span style="font-weight:bold">${icons[type] || 'ℹ️'}</span>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showAlert(container, message, type = 'error') {
  if (!container) {
    showToast(message, type === 'error' ? 'error' : 'success');
    return;
  }
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = message;
  container.prepend(div);
  setTimeout(() => {
    div.classList.add('fade-out');
    setTimeout(() => div.remove(), 500);
  }, 4500);
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) stars += '★';
    else if (i === full && half) stars += '★';
    else stars += '☆';
  }
  return stars;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function renderPagination(container, currentPage, totalPages, onPageChange) {
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.textContent = '← Prev';
  prev.disabled = currentPage <= 1;
  prev.onclick = () => onPageChange(currentPage - 1);
  container.appendChild(prev);

  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    addPageBtn(container, 1, currentPage, onPageChange);
    if (start > 2) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.className = 'page-info';
      container.appendChild(dots);
    }
  }

  for (let i = start; i <= end; i++) {
    addPageBtn(container, i, currentPage, onPageChange);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.className = 'page-info';
      container.appendChild(dots);
    }
    addPageBtn(container, totalPages, currentPage, onPageChange);
  }

  const next = document.createElement('button');
  next.textContent = 'Next →';
  next.disabled = currentPage >= totalPages;
  next.onclick = () => onPageChange(currentPage + 1);
  container.appendChild(next);
}

function addPageBtn(container, page, currentPage, onPageChange) {
  const btn = document.createElement('button');
  btn.textContent = page;
  if (page === currentPage) btn.classList.add('active');
  btn.onclick = () => onPageChange(page);
  container.appendChild(btn);
}

function simpleMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/- (.+)/g, '&bull; $1');
}

// --- Global medicine reminder polling ---
// Runs on every page (not just reminders.html) so a due reminder still
// notifies the user no matter what part of the site they're on.
//
// The native browser Notification is NOT relied on as the primary alert:
// requestPermission() only reliably grants when triggered by a direct user
// click, and startReminderPolling() below calls it automatically on page
// load — most browsers silently ignore or auto-deny that, and even a
// granted permission can be suppressed at the OS level (e.g. Windows Focus
// Assist) with no error thrown, so the "notification" can silently be a
// no-op while the alarm sound (Web Audio, unrelated to that permission)
// still plays. The self-contained in-page overlay below is what the user
// actually sees on every page; the native notification is a bonus on top
// when it happens to be available.
function playReminderAlarm() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) { /* audio not available */ }
}

let activeReminderId = null;

function ensureGlobalReminderOverlay() {
  let overlay = document.getElementById('global-reminder-overlay');
  if (overlay) return overlay;

  const style = document.createElement('style');
  style.textContent = `
    #global-reminder-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999;
    }
    #global-reminder-overlay .grm-card {
      background: var(--bg-card, #fff);
      border-radius: var(--radius, 12px);
      padding: 2rem; max-width: 420px; width: 90%;
      box-shadow: var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.3));
      text-align: center;
    }
    #global-reminder-overlay .grm-icon { font-size: 3.5rem; margin-bottom: 0.75rem; }
    #global-reminder-overlay .grm-title { font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text, #1a202c); }
    #global-reminder-overlay .grm-message { font-size: 1rem; color: var(--text-light, #718096); margin-bottom: 1.5rem; line-height: 1.5; }
    #global-reminder-overlay .grm-actions { display: flex; gap: 0.75rem; justify-content: center; }
    #global-reminder-overlay .grm-actions button {
      flex: 1; padding: 0.75rem 1rem; border: none; border-radius: 6px;
      font-size: 0.95rem; font-weight: 600; cursor: pointer;
    }
    #global-reminder-overlay .grm-btn-primary { background: var(--primary, #2b6cb0); color: #fff; }
    #global-reminder-overlay .grm-btn-secondary { background: var(--border, #e2e8f0); color: var(--text, #1a202c); }
  `;
  document.head.appendChild(style);

  overlay = document.createElement('div');
  overlay.id = 'global-reminder-overlay';
  overlay.innerHTML = `
    <div class="grm-card">
      <div class="grm-icon">💊</div>
      <div class="grm-title">Time to Take Medicine!</div>
      <div class="grm-message" id="grm-message"></div>
      <div class="grm-actions">
        <button class="grm-btn-primary" id="grm-ack-btn">I Took It ✓</button>
        <button class="grm-btn-secondary" id="grm-snooze-btn">Snooze 10 min</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('grm-ack-btn').addEventListener('click', async () => {
    if (activeReminderId) {
      try { await apiFetch(`/api/reminders/${activeReminderId}/acknowledge`, { method: 'POST' }); } catch (e) {}
    }
    overlay.style.display = 'none';
    activeReminderId = null;
  });
  document.getElementById('grm-snooze-btn').addEventListener('click', async () => {
    if (activeReminderId) {
      try {
        await apiFetch(`/api/reminders/${activeReminderId}/snooze`, {
          method: 'POST', body: JSON.stringify({ minutes: 10 })
        });
      } catch (e) {}
    }
    overlay.style.display = 'none';
    activeReminderId = null;
  });

  overlay.style.display = 'none';
  return overlay;
}

function showGlobalReminderOverlay(medicineName, dosage, reminderId) {
  activeReminderId = reminderId;
  const overlay = ensureGlobalReminderOverlay();
  document.getElementById('grm-message').textContent = dosage
    ? `Take ${medicineName} - ${dosage}`
    : `Take your ${medicineName}`;
  overlay.style.display = 'flex';
}

function fireReminderNotification(reminder) {
  playReminderAlarm();

  // reminders.html defines its own showReminderModal with a richer
  // in-page modal wired to its own reminder list refresh — prefer that
  // when present so the user isn't shown two overlays on that page.
  // Everywhere else, the self-contained global overlay above is used, so
  // the popup is guaranteed to appear regardless of native Notification
  // permission state.
  if (typeof window.showReminderModal === 'function') {
    window.showReminderModal(reminder.medicine_name, reminder.dosage, reminder.id);
  } else {
    showGlobalReminderOverlay(reminder.medicine_name, reminder.dosage, reminder.id);
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const message = reminder.dosage
        ? `Take ${reminder.medicine_name} - ${reminder.dosage}`
        : `Take your ${reminder.medicine_name}`;
      const notification = new Notification('💊 Medicine Reminder', {
        body: message,
        tag: `reminder-${reminder.id}`,
        requireInteraction: true,
        badge: '🏥',
        silent: false
      });
      notification.onclick = () => {
        window.focus();
        window.location.href = '/reminders.html';
        notification.close();
      };
    } catch (e) { /* notification failed to show */ }
  }
}

function checkReminders() {
  if (!isLoggedIn()) return;

  apiFetch('/api/reminders').then(data => {
    if (!data.reminders || data.reminders.length === 0) return;

    const now = new Date();
    const dayAbbr = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().slice(0, 3);

    data.reminders.forEach(reminder => {
      if (!reminder.is_active) return;

      if (reminder.snoozed_until) {
        const snoozeTime = new Date(reminder.snoozed_until);
        if (now < snoozeTime) return;
      }

      const [remHour, remMin] = reminder.reminder_time.split(':').map(Number);
      const scheduledToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), remHour, remMin, 0, 0);
      const secondsSinceScheduled = (now - scheduledToday) / 1000;

      const lastNotified = reminder.last_notified ? new Date(reminder.last_notified) : null;

      // Due if the scheduled time has passed today (within a grace window,
      // so a throttled/slow poll tick still catches it) and we haven't
      // already notified for today's slot.
      const GRACE_WINDOW_SECONDS = 15 * 60;
      const isTimeDue = secondsSinceScheduled >= 0 && secondsSinceScheduled <= GRACE_WINDOW_SECONDS;
      const alreadyNotifiedForThisSlot = lastNotified && lastNotified >= scheduledToday;

      const isDayMatch = reminder.days_of_week === 'daily' ||
        reminder.days_of_week.split(',').includes(dayAbbr) ||
        (reminder.days_of_week === 'weekdays' && !['sat', 'sun'].includes(dayAbbr)) ||
        (reminder.days_of_week === 'weekends' && ['sat', 'sun'].includes(dayAbbr));

      if (isTimeDue && isDayMatch && !alreadyNotifiedForThisSlot) {
        fireReminderNotification(reminder);

        apiFetch(`/api/reminders/${reminder.id}/notify`, {
          method: 'POST',
          body: JSON.stringify({ last_notified: new Date().toISOString() })
        }).catch(() => {});
      }
    });
  }).catch(() => {});
}

function startReminderPolling() {
  if (!isLoggedIn()) return;
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
  checkReminders();
  setInterval(checkReminders, 10000);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateNav();
  initNavTranslations();
  startReminderPolling();

  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') navLinks.classList.remove('open');
    });
  }

  // Setup nav dropdown toggle and click-outside / mouseleave handler
  document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('a');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
        if (!isOpen) dropdown.classList.add('open');
      });
    }

    dropdown.addEventListener('mouseleave', () => {
      dropdown.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown')) {
      document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
    }
  });

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
});
