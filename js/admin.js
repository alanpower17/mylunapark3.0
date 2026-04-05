// ADMIN DASHBOARD
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

  let html = `<h1 class="section-title">👑 Admin Dashboard</h1>`;

  if (parks.length === 0) {
    html += `<p>Nessun risultato</p>`;
  } else {
    html += parks.map(p => `
      <div class="bg-card p-4 rounded mb-2">
        <h3>${p.name || p.nome}</h3>
        <p>${p.city || p.citta}</p>
        <button onclick="approveParkUI('${p.id}')">✔</button>
        <button onclick="rejectParkUI('${p.id}')">✖</button>
      </div>
    `).join("");
  }

  main.innerHTML = html;
  showLoading(false);
}

// ACTIONS
async function approveParkUI(id) {
  await db.collection('LunaParks').doc(id).update({ status: "approved" });
  renderAdminDashboard();
}

async function rejectParkUI(id) {
  await db.collection('LunaParks').doc(id).update({ status: "rejected" });
  renderAdminDashboard();
}
