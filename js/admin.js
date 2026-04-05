// ADMIN DASHBOARD
// ============================================================

async function renderAdminDashboard(tab = "pending") {
  const main = document.getElementById('mainContent');

  if (!currentUser || currentUser.role !== 'admin') {
    main.innerHTML = renderEmptyState("🔒", "Accesso non autorizzato");
    return;
  }

  showLoading(true);

  const [pending, approved, rejected] = await Promise.all([
    getParksByStatus("pending"),
    getParksByStatus("approved"),
    getParksByStatus("rejected")
  ]);

  let parks = [];
  if (tab === "pending") parks = pending;
  if (tab === "approved") parks = approved;
  if (tab === "rejected") parks = rejected;

  // HTML BASE
  let html = `
    <h1 class="section-title">👑 Admin Dashboard</h1>

    <div class="grid grid-cols-3 gap-2 mb-4 text-center">
      <div class="bg-card p-3 rounded">
        <div class="text-yellow-400 font-bold">${pending.length}</div>
        <div class="text-xs">Pending</div>
      </div>
      <div class="bg-card p-3 rounded">
        <div class="text-green-400 font-bold">${approved.length}</div>
        <div class="text-xs">Approvati</div>
      </div>
      <div class="bg-card p-3 rounded">
        <div class="text-red-400 font-bold">${rejected.length}</div>
        <div class="text-xs">Rifiutati</div>
      </div>
    </div>

    <div class="flex gap-2 mb-4">
      <button onclick="renderAdminDashboard('pending')" class="px-3 py-1 rounded ${tab==='pending'?'bg-yellow-500 text-black':'bg-card'}">Pending</button>
      <button onclick="renderAdminDashboard('approved')" class="px-3 py-1 rounded ${tab==='approved'?'bg-green-600':'bg-card'}">Approvati</button>
      <button onclick="renderAdminDashboard('rejected')" class="px-3 py-1 rounded ${tab==='rejected'?'bg-red-600':'bg-card'}">Rifiutati</button>
    </div>
  `;

  // LISTA PARCHI
  if (parks.length === 0) {
    html += `<p>Nessun risultato</p>`;
  } else {
    html += parks.map(p => `
      <div class="bg-card p-4 rounded-lg mb-3 border border-amber/20">
        <div class="flex justify-between">
          <div>
            <h3 class="font-bold">${p.name || p.nome}</h3>
            <p class="text-sm text-gray-400">${p.city || p.citta}</p>
          </div>
          <span class="text-xs px-2 py-1 rounded ${
            p.status === 'pending' ? 'bg-yellow-500 text-black' :
            p.status === 'approved' ? 'bg-green-600' :
            'bg-red-600'
          }">
            ${p.status}
          </span>
        </div>

        ${p.status === 'pending' ? `
          <div class="flex gap-2 mt-3">
            <button onclick="approveParkUI('${p.id}')" class="bg-green-600 px-3 py-1 rounded">Approva</button>
            <button onclick="rejectParkUI('${p.id}')" class="bg-red-600 px-3 py-1 rounded">Rifiuta</button>
          </div>
        ` : ""}
      </div>
    `).join("");
  }

  main.innerHTML = html;

  showLoading(false);
}

  // COSTRUZIONE HTML UNIFICATA
  // Parte 1: Intestazione e Parchi da approvare
  let html = `
    <h1 class="section-title"><i class="fas fa-cog text-amber"></i>Pannello Admin</h1>

    <div class="admin-section">
      <h2 class="text-xl font-bold mb-4">Parchi da approvare</h2>
  `;

  if (parks.length === 0) {
    html += `<p>Nessun parco in attesa</p>`;
  } else {
    html += parks.map(p => `
      <div class="bg-card p-4 rounded-lg mb-3">
        <h3 class="font-bold">${p.name || p.nome}</h3>
        <p class="text-sm text-gray-400">${p.city || p.citta}</p>
        <div class="flex gap-2 mt-3">
          <button onclick="approveParkUI('${p.id}')" class="bg-green-600 px-3 py-1 rounded">
            Approva
          </button>
          <button onclick="rejectParkUI('${p.id}')" class="bg-red-600 px-3 py-1 rounded">
            Rifiuta
          </button>
        </div>
      </div>
    `).join("");
  }
  html += `</div>`; // Chiudi sezione parchi

  // Parte 2: Aggiungiamo in coda il resto del Pannello (Sponsor e Utenti)
  html += `
    <div class="admin-section">
      <h2><i class="fas fa-ad"></i>Crea Nuovo Sponsor</h2>
      <div class="space-y-3">
        <div class="form-group">
          <label>Nome Sponsor</label>
          <input id="spName" type="text" placeholder="Nome azienda / brand" />
        </div>
        <div class="form-group">
          <label>URL Immagine</label>
          <input id="spImage" type="url" placeholder="https://..." />
        </div>
        <div class="form-group">
          <label>URL Click (destinazione)</label>
          <input id="spClick" type="url" placeholder="https://..." />
        </div>
        <div class="form-group">
          <label>Coupon ID (lascia vuoto = globale)</label>
          <input id="spCoupon" type="text" placeholder="Opzionale" />
        </div>
        <div class="form-group">
          <label>Park ID (lascia vuoto = globale)</label>
          <input id="spPark" type="text" placeholder="Opzionale" />
        </div>
        <button class="btn-primary" onclick="handleCreateSponsor()">
          <i class="fas fa-plus"></i>Crea Sponsor
        </button>
      </div>
    </div>

    <div class="admin-section">
      <h2><i class="fas fa-list"></i>Sponsor Attivi</h2>
      <div id="sponsorList">
        <div class="skeleton h-16 rounded-lg"></div>
        <div class="skeleton h-16 rounded-lg mt-2"></div>
      </div>
    </div>

    <div class="admin-section">
      <h2><i class="fas fa-users"></i>Utenti Registrati</h2>
      <div id="usersList">
        <div class="skeleton h-12 rounded-lg"></div>
        <div class="skeleton h-12 rounded-lg mt-2"></div>
      </div>
    </div>

    <button class="btn-neon w-full justify-center flex items-center gap-2 mt-2" onclick="navigateTo('admin-stats')">
      <i class="fas fa-chart-bar"></i>Vedi Statistiche Sponsor
    </button>
  `;
  main.innerHTML = html;
// 2. Carica e inietta SPONSOR
 async function renderAdminDashboard(tab = "pending") {
  const main = document.getElementById('mainContent');

  if (!currentUser || currentUser.role !== 'admin') {
    main.innerHTML = renderEmptyState("🔒", "Accesso non autorizzato");
    return;
  }

  showLoading(true);

  // 🔽 PRIMA COSTRUISCI HTML
  let html = `
    <h1>Admin</h1>
    <div id="sponsorList"></div>
  `;

  main.innerHTML = html;

 
  try {
    const sponsors = await getAllSponsors();

    const spList = document.getElementById('sponsorList');

    if (spList) {
      if (!sponsors || sponsors.length === 0) {
        spList.innerHTML = renderEmptyState("📭", "Nessuno sponsor creato");
      } else {
        spList.innerHTML = sponsors.map(s => `
          <div class="p-3 bg-card rounded mb-2">
            <p>${s.name}</p>
          </div>
        `).join('');
      }
    }

  } catch (err) {
    console.error("Errore sponsor:", err);
  }

  showLoading(false);
}
  // 3. Carica e inietta UTENTI
  try {
    const users = await getAllUsers();
    const usersEl = document.getElementById('usersList');
    if (usersEl) {
      usersEl.innerHTML = users.map(u => `
        <div class="flex items-center gap-3 p-2 bg-primary rounded-lg mb-2 border border-amber/10">
          <div class="avatar text-sm">${getInitials(u.name || u.email)}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${escapeHtml(u.name || u.email || '')}</p>
            <p class="text-xs text-gray-500 truncate">${escapeHtml(u.email || '')}</p>
          </div>
          <select onchange="handleSetRole('${u.uid || u.id}', this.value)"
                  class="text-xs py-1 px-2 bg-card border border-amber/20 rounded text-amber">
            ${['user','organizer','rideowner','admin'].map(r =>
              `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`
            ).join('')}
          </select>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("Errore caricamento utenti:", err);
    const usersEl = document.getElementById('usersList');
    if (usersEl) usersEl.innerHTML = `<p class="text-xs text-gray-500">Errore caricamento utenti</p>`;
  }

  showLoading(false);
}
// ============================================================
//  FUNZIONI GLOBALI DI SUPPORTO (Devono stare fuori dal render)
// ============================================================

async function approveParkUI(id) {
  await approvePark(id);
  showToast("Parco approvato!", "success");
  renderAdminDashboard(); // Ricarica la pagina per aggiornare la lista
}

async function rejectParkUI(id) {
  await rejectPark(id);
  showToast("Parco rifiutato", "error");
  renderAdminDashboard();
}

async function loadPendingParks() {
  const snapshot = await db.collection('LunaParks')
    .where('status', '==', 'pending')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function approvePark(id) {
  await db.collection('LunaParks').doc(id).update({
    status: "approved"
  });
}

async function rejectPark(id) {
  await db.collection('LunaParks').doc(id).update({
    status: "rejected"
  });
}

async function handleCreateSponsor() {
  const data = {
    name:     document.getElementById('spName')?.value?.trim(),
    imageURL: document.getElementById('spImage')?.value?.trim(),
    clickURL: document.getElementById('spClick')?.value?.trim(),
    couponId: document.getElementById('spCoupon')?.value?.trim() || "",
    parkId:   document.getElementById('spPark')?.value?.trim()   || ""
  };

  if (!data.imageURL || !data.clickURL) {
    showToast("Inserisci almeno URL immagine e URL click", "warning");
    return;
  }

  showLoading(true);
  try {
    await createSponsor(data);
    showToast("Sponsor creato con successo! ✅", "success");
    renderAdminDashboard();
  } catch (err) {
    showToast("Errore nella creazione sponsor", "error");
  } finally {
    showLoading(false);
  }
}

async function handleDeleteSponsor(id) {
  if (!confirm("Eliminare questo sponsor?")) return;
  showLoading(true);
  try {
    await deleteSponsor(id);
    showToast("Sponsor eliminato", "info");
   renderAdminDashboard();
  } finally {
    showLoading(false);
  }
}

async function handleSetRole(uid, role) {
  try {
    await setUserRole(uid, role);
    showToast(`Ruolo aggiornato: ${role}`, "success");
  } catch {
    showToast("Errore aggiornamento ruolo", "error");
  }
}
// ============================================================
//  PAGINA: STATISTICHE SPONSOR (ADMIN) con Chart.js
// ============================================================
async function renderAdminStatsPage() {
  const main = document.getElementById('mainContent');

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'organizer')) {
    main.innerHTML = renderEmptyState("🔒", "Accesso non autorizzato");
    return;
  }

  main.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <button onclick="navigateTo('admin')" class="btn-secondary text-sm">
        <i class="fas fa-arrow-left"></i>Admin
      </button>
      <h1 class="section-title mb-0"><i class="fas fa-chart-bar"></i>Statistiche Sponsor</h1>
    </div>
    <div id="statsContent">${renderSkeletonCards(2)}</div>
  `;

  const [stats, sponsors] = await Promise.all([getSponsorStats(), getAllSponsors()]);
  const sponsorMap = {};
  sponsors.forEach(s => { sponsorMap[s.id] = s; });

  const statsEl = document.getElementById('statsContent');

  if (stats.length === 0) {
    statsEl.innerHTML = renderEmptyState("📊", "Nessun dato di tracking disponibile ancora.<br/>I dati appariranno quando gli utenti visualizzano i coupon con sponsor.");
    return;
  }

  const totalViews  = stats.reduce((a, s) => a + s.views, 0);
  const totalClicks = stats.reduce((a, s) => a + s.clicks, 0);
  const avgCtr      = totalViews > 0 ? (totalClicks / totalViews * 100).toFixed(2) : "0.00";

  const labels = stats.map(s => sponsorMap[s.sponsorId]?.name || s.sponsorId.slice(0,8));

  statsEl.innerHTML = `
    <!-- KPI -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <div class="stat-box">
        <div class="stat-value text-neon">${totalViews.toLocaleString()}</div>
        <div class="stat-label">👁️ Views</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${totalClicks.toLocaleString()}</div>
        <div class="stat-label">🖱️ Click</div>
      </div>
      <div class="stat-box">
        <div class="stat-value text-green-400">${avgCtr}%</div>
        <div class="stat-label">📈 CTR Medio</div>
      </div>
    </div>

    <!-- Grafico a barre Views vs Click -->
    <div class="admin-section mb-5">
      <h2><i class="fas fa-chart-bar"></i>Views vs Click per Sponsor</h2>
      <div style="height:220px;">
        <canvas id="sponsorBarChart"></canvas>
      </div>
    </div>

    <!-- Grafico CTR a linee -->
    <div class="admin-section mb-5">
      <h2><i class="fas fa-percent"></i>CTR per Sponsor</h2>
      <div style="height:180px;">
        <canvas id="sponsorCtrChart"></canvas>
      </div>
    </div>

    <!-- Lista dettagliata -->
    <div class="space-y-3">
      ${stats.map(s => {
        const sp = sponsorMap[s.sponsorId];
        return `
          <div class="admin-section">
            <div class="flex items-center gap-3 mb-3">
              ${sp?.imageURL
                ? `<img src="${escapeHtml(sp.imageURL)}" class="w-14 h-10 object-cover rounded" onerror="this.style.display='none'" />`
                : `<div class="w-14 h-10 bg-gray-800 rounded flex items-center justify-center">📢</div>`
              }
              <div class="flex-1">
                <p class="font-semibold text-sm">${escapeHtml(sp?.name || s.sponsorId)}</p>
                <p class="text-xs text-gray-500">ID: ${s.sponsorId.slice(0,12)}...</p>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center">
              <div><p class="text-neon font-bold text-lg">${s.views}</p><p class="text-xs text-gray-500">Views</p></div>
              <div><p class="text-amber font-bold text-lg">${s.clicks}</p><p class="text-xs text-gray-500">Click</p></div>
              <div><p class="text-green-400 font-bold text-lg">${s.ctr}%</p><p class="text-xs text-gray-500">CTR</p></div>
            </div>
            <div class="cooldown-bar-bg mt-3">
              <div class="cooldown-bar-fill" style="width:${Math.min(parseFloat(s.ctr)*5,100)}%"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Render grafici
  if (typeof Chart !== 'undefined') {
    const chartDefaults = {
      plugins: { legend: { labels: { color: '#9ca3af', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    };

    // Distruggi grafici precedenti
    if (statsChartRef) { try { statsChartRef.forEach(c => c.destroy()); } catch {} }

    const c1 = new Chart(document.getElementById('sponsorBarChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Views',  data: stats.map(s => s.views),  backgroundColor: 'rgba(0,255,255,0.6)',   borderRadius: 4 },
          { label: 'Click',  data: stats.map(s => s.clicks), backgroundColor: 'rgba(255,191,0,0.7)',  borderRadius: 4 }
        ]
      },
      options: { ...chartDefaults, responsive: true, maintainAspectRatio: false }
    });

    const c2 = new Chart(document.getElementById('sponsorCtrChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'CTR %',
          data: stats.map(s => parseFloat(s.ctr)),
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74,222,128,0.12)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#4ade80',
          pointRadius: 5
        }]
      },
      options: { ...chartDefaults, responsive: true, maintainAspectRatio: false }
    });

    statsChartRef = [c1, c2];
  }
}
