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
  const data = await res.json();

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
  return true;
}

function logout() {
  clearAuth();
  window.location.href = '/';
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

function showAlert(container, message, type = 'error') {
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = message;
  container.prepend(div);
  setTimeout(() => div.remove(), 5000);
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

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateNav();

  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') navLinks.classList.remove('open');
    });
  }

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
});
