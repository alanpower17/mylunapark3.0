// ============================================================
// ADMIN DASHBOARD COMPLETA
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

  let parks = tab === "pending" ? pending :
              tab === "approved" ? approved : rejected;

  let html = `
    <h1 class="section-title">👑 Admin Dashboard</h1>

    <!-- STATS -->
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

    <!-- SEARCH -->
    <input id="adminSearch" type="text" placeholder="🔍 Cerca parco..."
      class="w-full mb-4 p-2 rounded bg-card border border-amber/20"
      oninput="filterAdminParks()" />

    <!-- TABS -->
    <div class="flex gap-2 mb-4">
      <button onclick="renderAdminDashboard('pending')" class="btn">${tab==='pending'?'🟡':''} Pending</button>
      <button onclick="renderAdminDashboard('approved')" class="btn">${tab==='approved'?'🟢':''} Approvati</button>
      <button onclick="renderAdminDashboard('rejected')" class="btn">${tab==='rejected'?'🔴':''} Rifiutati</button>
    </div>

    <div id="adminParksList"></div>
  `;

  main.innerHTML = html;

  window._adminParks = parks; // memoria globale per ricerca

  renderAdminParks(parks);

  showLoading(false);
}

// ============================================================
// RENDER LISTA
// ============================================================

function renderAdminParks(parks) {
  const container = document.getElementById("adminParksList");

  if (!parks || parks.length === 0) {
    container.innerHTML = "<p>Nessun risultato</p>";
    return;
  }

  container.innerHTML = parks.map(p => `
    <div class="bg-card p-4 rounded mb-3 border border-amber/20">

      <div class="flex justify-between">
        <div>
          <h3 class="font-bold">${p.name || p.nome}</h3>
          <p class="text-sm text-gray-400">${p.city || p.citta}</p>
        </div>

        <span class="text-xs px-2 py-1 rounded ${
          p.status === 'pending' ? 'bg-yellow-500 text-black' :
          p.status === 'approved' ? 'bg-green-600' :
          'bg-red-600'
        }">${p.status}</span>
      </div>

      <!-- AZIONI -->
      <div class="flex flex-wrap gap-2 mt-3">

        <button onclick="previewPark('${p.id}')" class="bg-blue-600 px-2 py-1 rounded text-xs">👁️</button>

        <button onclick="editPark('${p.id}')" class="bg-amber px-2 py-1 rounded text-xs text-black">✏️</button>

        <button onclick="deletePark('${p.id}')" class="bg-red-600 px-2 py-1 rounded text-xs">🗑️</button>

        ${p.status === 'pending' ? `
          <button onclick="approveParkUI('${p.id}')" class="bg-green-600 px-2 py-1 rounded text-xs">✔</button>
          <button onclick="rejectParkUI('${p.id}')" class="bg-red-800 px-2 py-1 rounded text-xs">✖</button>
        ` : ""}

      </div>

    </div>
  `).join("");
}

// ============================================================
// SEARCH
// ============================================================

function filterAdminParks() {
  const q = document.getElementById("adminSearch").value.toLowerCase();

  const filtered = window._adminParks.filter(p =>
    (p.name || p.nome || "").toLowerCase().includes(q) ||
    (p.city || p.citta || "").toLowerCase().includes(q)
  );

  renderAdminParks(filtered);
}

// ============================================================
// PREVIEW
// ============================================================

async function previewPark(id) {
  const park = await getParkById(id);

  showModal(`
    <h2 class="text-xl font-bold mb-2">${park.name || park.nome}</h2>
    <p>${park.city || park.citta}</p>
    <img src="${park.image || ''}" class="w-full rounded mt-2" />
    <p class="mt-2 text-sm">${park.description || ''}</p>
  `);
}

// ============================================================
// EDIT
// ============================================================

async function editPark(id) {
  const park = await getParkById(id);

  showModal(`
    <h2 class="text-lg font-bold mb-2">Modifica Parco</h2>

    <input id="editName" value="${park.name || ''}" class="input" />
    <input id="editCity" value="${park.city || ''}" class="input mt-2" />

    <button onclick="savePark('${id}')" class="btn-primary mt-3">Salva</button>
  `);
}

async function savePark(id) {
  const name = document.getElementById("editName").value;
  const city = document.getElementById("editCity").value;

  await db.collection("LunaParks").doc(id).update({
    name,
    city
  });

  showToast("Salvato!", "success");
  closeModal();
  renderAdminDashboard();
}

// ============================================================
// DELETE
// ============================================================

async function deletePark(id) {
  if (!confirm("Eliminare questo parco?")) return;

  await db.collection("LunaParks").doc(id).delete();

  showToast("Eliminato", "info");
  renderAdminDashboard();
}

// ============================================================
// APPROVA / RIFIUTA
// ============================================================

async function approveParkUI(id) {
  await db.collection("LunaParks").doc(id).update({ status: "approved" });
  renderAdminDashboard();
}

async function rejectParkUI(id) {
  await db.collection("LunaParks").doc(id).update({ status: "rejected" });
  renderAdminDashboard();
}
