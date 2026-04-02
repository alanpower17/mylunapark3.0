// ============================================================
//  MyLunaPark - Utils
//  Funzioni di utilità condivise: toast, loading, debounce, ecc.
// ============================================================

// ---- TOAST NOTIFICATIONS ----
function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: "fa-check-circle",
    error:   "fa-times-circle",
    warning: "fa-exclamation-triangle",
    info:    "fa-info-circle"
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info} toast-icon"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Auto-rimuovi dopo 'duration' ms
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---- LOADING OVERLAY ----
function showLoading(visible) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.toggle('hidden', !visible);
  }
}

// ---- MODALE GLOBALE ----
function showModal(contentHtml) {
  const modal   = document.getElementById('globalModal');
  const content = document.getElementById('globalModalContent');
  if (!modal || !content) return;

  content.innerHTML = contentHtml;
  modal.classList.remove('hidden');
  modal.classList.add('show');
}

function closeModal() {
  const modal = document.getElementById('globalModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('show');
  }
}

// Chiudi modale cliccando fuori
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('globalModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
});

// ---- ESCAPE HTML ----
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ---- DEBOUNCE ----
function debounce(fn, delay = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ---- FORMATTA DATA ----
function formatDate(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("it-IT", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

// ---- FORMATTA DISTANZA ----
function formatDistance(km) {
  if (km === null || km === undefined) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ---- SKELETON CARD ----
function renderSkeletonCards(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="card">
      <div class="skeleton" style="height: 10rem;"></div>
      <div class="card-body space-y-2">
        <div class="skeleton h-5 w-3/4"></div>
        <div class="skeleton h-4 w-1/2"></div>
        <div class="skeleton h-4 w-1/3"></div>
        <div class="skeleton h-8 w-full mt-2" style="border-radius:0.5rem;"></div>
      </div>
    </div>
  `).join('');
}

// ---- AGGIORNA BOTTOM NAV ACTIVE ----
function updateBottomNav(page) {
  document.querySelectorAll('.bottom-nav-btn').forEach(btn => btn.classList.remove('active'));

  const map = {
    home:      'btnHome',
    search:    'btnSearch',
    favorites: 'btnFavorites',
    profile:   'btnProfile',
    map:       'btnMap'
  };

  if (map[page]) {
    const el = document.getElementById(map[page]);
    if (el) el.classList.add('active');
  }
}

// ---- RENDER EMPTY STATE ----
function renderEmptyState(icon, message, actionHtml = "") {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <p>${message}</p>
      ${actionHtml}
    </div>
  `;
}

// ---- AVATAR INIZIALI ----
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || "")
    .join("");
}

// ---- ROLE LABEL ----
function getRoleLabel(role) {
  const labels = {
    admin:      "👑 Admin",
    organizer:  "🏟️ Organizzatore",
    rideowner:  "🎠 Gestore Giostra",
    user:       "👤 Utente"
  };
  return labels[role] || "👤 Utente";
}

function getRoleClass(role) {
  return `role-${role || 'user'}`;
}
