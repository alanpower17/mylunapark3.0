
// ADMIN PRO LEVEL 2
// ===== PAGINA PRINCIPALE =====
async function renderAdminPage() {
  const main = document.getElementById('mainContent');

  if (!currentUser || currentUser.role !== 'admin') {
    main.innerHTML = renderEmptyState("🔒", "Accesso non autorizzato");
    return;
  }

  main.innerHTML = `
    <h1 class="section-title">👑 Admin PRO</h1>

    <!-- SEARCH -->
    <input 
      id="adminSearch"
      placeholder="🔍 Cerca parco..."
      class="w-full p-2 mb-4 bg-card border border-amber/20 rounded"
      oninput="renderAdminDashboard()"
    />

    <!-- STATS -->
    <div id="adminStats" class="grid grid-cols-3 gap-2 mb-4"></div>

    <!-- DASHBOARD -->
    <div id="adminDashboard"></div>
  `;

  renderAdminDashboard();
}

// ===== DASHBOARD =====
async function renderAdminDashboard(tab = "pending") {
  const container = document.getElementById("adminDashboard");
  // 1. Definiamo statsEl cercandolo nel DOM
  const statsEl = document.getElementById("adminStats");
  const search = document.getElementById("adminSearch")?.value?.toLowerCase() || "";
  
  // 2. Ora il controllo di sicurezza funziona. Se mancano gli elementi, si ferma senza errori.
  if (!container || !statsEl) {
    console.warn("Admin DOM non pronto");
    return;
  }
  showLoading(true);

  const [pending, approved, rejected] = await Promise.all([
    getParksByStatus("pending"),
    getParksByStatus("approved"),
    getParksByStatus("rejected")
  ]);

  // 3. Usiamo direttamente la variabile statsEl che abbiamo verificato essere presente
  statsEl.innerHTML = `
    <div class="bg-card p-3 rounded text-center">
      <div class="text-yellow-400 font-bold">${pending.length}</div>
      <div class="text-xs">Pending</div>
    </div>
    <div class="bg-card p-3 rounded text-center">
      <div class="text-green-400 font-bold">${approved.length}</div>
      <div class="text-xs">Approvati</div>
    </div>
    <div class="bg-card p-3 rounded text-center">
      <div class="text-red-400 font-bold">${rejected.length}</div>
      <div class="text-xs">Rifiutati</div>
    </div>
  `;

  let parks = [];
  if (tab === "pending") parks = pending;
  if (tab === "approved") parks = approved;
  if (tab === "rejected") parks = rejected;

  // filtro ricerca
  parks = parks.filter(p =>
    (p.name || p.nome || "").toLowerCase().includes(search) ||
    (p.city || p.citta || "").toLowerCase().includes(search)
  );

  container.innerHTML = `
        <div class="flex gap-2 mb-4">
      <button onclick="renderAdminDashboard('pending')" class="btn-secondary">Pending</button>
      <button onclick="renderAdminDashboard('approved')" class="btn-secondary">Approvati</button>
      <button onclick="renderAdminDashboard('rejected')" class="btn-secondary">Rifiutati</button>
    </div>

    ${parks.length === 0 ? "<p>Nessun risultato</p>" : ""}

    ${parks.map(p => `
      <div class="bg-card p-4 rounded mb-3 border border-amber/20">

                <div class="flex gap-3">

                    <img src="${p.image || ''}" 
               class="w-20 h-16 object-cover rounded"
               onerror="this.src='https://placehold.co/80x60?text=No+Img'" />

                    <div class="flex-1">
            <h3 class="font-bold">${p.name || p.nome}</h3>
            <p class="text-xs text-gray-400">${p.city || p.citta}</p>
          </div>

                    <span class="text-xs px-2 py-1 rounded ${
            p.status === 'pending' ? 'bg-yellow-500 text-black' :
            p.status === 'approved' ? 'bg-green-600' :
            'bg-red-600'
          }">${p.status}</span>
        </div>

                <div class="flex gap-2 mt-3 flex-wrap">

          <button onclick="previewPark('${p.id}')" class="btn-secondary text-xs">
            👁️ Preview
          </button>

          <button onclick="editPark('${p.id}')" class="btn-secondary text-xs">
            ✏️ Modifica
          </button>

          <button onclick="deleteParkUI('${p.id}')" class="btn-danger text-xs">
            🗑️ Elimina
          </button>

          ${p.status === 'pending' ? `
            <button onclick="approveParkUI('${p.id}')" class="bg-green-600 px-2 py-1 text-xs rounded">
              ✔ Approva
            </button>
            <button onclick="rejectParkUI('${p.id}')" class="bg-red-600 px-2 py-1 text-xs rounded">
              ✖ Rifiuta
            </button>
          ` : ""}

        </div>
      </div>
    `).join("")}
  `;

  showLoading(false);
}

// ===== PREVIEW =====
async function previewPark(id) {
  const park = await getParkById(id);

  openModal(`
    <h2 class="text-lg font-bold mb-2">${park.name}</h2>
    <img src="${park.image}" class="w-full rounded mb-3"/>
    <p>${park.description || ''}</p>
    <p class="text-sm text-gray-400 mt-2">${park.city}</p>
  `);
}

// ===== EDIT =====
async function editPark(id) {
  const park = await getParkById(id);

  openModal(`
    <h2 class="text-lg font-bold mb-3">Modifica Parco</h2>

    <input id="editName" value="${park.name}" class="input mb-2"/>
    <input id="editCity" value="${park.city}" class="input mb-2"/>
    <input id="editImage" value="${park.image}" class="input mb-2"/>

    <button onclick="savePark('${id}')" class="btn-primary w-full">
      💾 Salva
    </button>
  `);
}

async function savePark(id) {
  const data = {
    name: document.getElementById("editName").value,
    city: document.getElementById("editCity").value,
    image: document.getElementById("editImage").value
  };

  await updatePark(id, data);
  closeModal();
  showToast("Salvato!", "success");
  renderAdminDashboard();
}

// ===== DELETE =====
async function deleteParkUI(id) {
  if (!confirm("Eliminare questo parco?")) return;

  await db.collection("LunaParks").doc(id).delete();
  showToast("Eliminato", "info");
  renderAdminDashboard();
}

// ===== APPROVAZIONE =====
async function approveParkUI(id) {
  await db.collection("LunaParks").doc(id).update({ status: "approved" });
  showToast("Approvato", "success");
  renderAdminDashboard();
}

async function rejectParkUI(id) {
  await db.collection("LunaParks").doc(id).update({ status: "rejected" });
  showToast("Rifiutato", "error");
  renderAdminDashboard();
}
Gestione dei Modal (Finestre a comparsa)
function openModal(htmlContent) {
  let modal = document.getElementById('adminModal');
  
  // Se il modal non esiste, lo creiamo
function openModal(htmlContent) {
  let modal = document.getElementById('adminModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'adminModal';
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4';
    modal.innerHTML = `
      <div class="bg-gray-900 border border-amber/20 p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <button onclick="closeModal()" class="absolute top-2 right-4 text-2xl font-bold text-gray-400 hover:text-white">&times;</button>
        <div id="modalBody"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('modalBody').innerHTML = htmlContent;
  modal.style.display = 'flex'; 
}

function closeModal() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function updatePark(id, data) {
  try {
    await db.collection("LunaParks").doc(id).update(data);
  } catch (error) {
    console.error("Errore aggiornamento:", error);
    if (typeof showToast === "function") showToast("Errore salvataggio", "error");
  }
}

function showToast(message, type) {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // Se non hai una libreria toast, questo evita errori
}
