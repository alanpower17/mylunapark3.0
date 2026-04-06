// ============================================================
//  PAGINA: DASHBOARD ORGANIZZATORE
// ============================================================
async function renderOrganizerPage() {
  const main = document.getElementById('mainContent');

  if (!currentUser || !['organizer','admin'].includes(currentUser.role)) {
    main.innerHTML = `
      <div class="text-center py-12">
        ${renderEmptyState("🔒", "Solo gli organizzatori possono accedere a questa pagina")}
        <button class="btn-primary mt-4" onclick="navigateTo('home')">
          <i class="fas fa-home"></i>Torna alla Home
        </button>
      </div>
    `;
    return;
  }

  main.innerHTML = `
    <h1 class="section-title"><i class="fas fa-building text-amber"></i>Dashboard Organizzatore</h1>

    <!-- Tab -->
    <div class="tab-bar mb-6" id="orgTabs">
      <button class="tab-btn active" onclick="switchOrgTab('parks', this)">I miei Parchi</button>
      <button class="tab-btn" onclick="switchOrgTab('coupons', this)">Gestione Coupon</button>
      <button class="tab-btn" onclick="switchOrgTab('create', this)">+ Nuovo Parco</button>
    </div>

    <!-- Contenuto tab -->
    <div id="orgContent">${renderSkeletonCards(2)}</div>
  `;

  loadOrgTab('parks');
}

function switchOrgTab(tab, btnEl) {
  document.querySelectorAll('#orgTabs .tab-btn').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  loadOrgTab(tab);
}

async function loadOrgTab(tab) {
  const content = document.getElementById('orgContent');
  if (!content) return;

  if (tab === 'parks') {
    content.innerHTML = renderSkeletonCards(2);
    const myParks = await getMyParks(currentUser.uid);
    if (myParks.length === 0) {
      content.innerHTML = renderEmptyState("🏟️", "Non hai ancora nessun parco",
        `<button class="btn-primary mt-2" onclick="loadOrgTab('create')">
          <i class="fas fa-plus"></i>Crea il tuo primo parco
        </button>`
      );
    } else {
      content.innerHTML = `
        <div class="space-y-3">
          ${myParks.map(p => `
            <div class="card card-body">
              <div class="flex gap-3 items-center">
                ${p.image
                  ? `<img src="${escapeHtml(p.image)}" class="w-16 h-12 object-cover rounded flex-shrink-0" onerror="this.style.display='none'" />`
                  : `<div class="w-16 h-12 bg-gray-800 rounded flex items-center justify-center text-2xl flex-shrink-0">🎡</div>`
                }
                <div class="flex-1">
                  <p class="font-bold">${escapeHtml(p.nome || '')}</p>
                  <p class="text-xs text-gray-500">${escapeHtml(p.citta || '')}</p>
                  <span class="badge ${p.status === 'active' ? 'badge-green' : 'badge-gray'} mt-1">
                    ${p.status === 'active' ? 'Attivo' : 'In attesa'}
                  </span>
                </div>
              </div>
              <div class="flex gap-2 mt-3">
                <button onclick="navigateTo('park', {id:'${p.id}'})" class="btn-secondary text-xs flex-1">
                  <i class="fas fa-eye"></i>Visualizza
                </button>
                <button onclick="orgManageCoupons('${p.id}', '${escapeHtml(p.nome || '')}')" class="btn-primary text-xs flex-1">
                  <i class="fas fa-ticket"></i>Coupon
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  if (tab === 'coupons') {
    content.innerHTML = `
      <p class="text-gray-400 text-sm mb-4">Seleziona un parco dalla tab "I miei Parchi" e clicca su "Coupon" per gestire i coupon.</p>
      ${renderEmptyState("🎟️", "Seleziona un parco per gestire i coupon")}
    `;
  }

  if (tab === 'create') {
    content.innerHTML = `
      <div class="admin-section">
        <h2><i class="fas fa-plus-circle"></i>Crea Nuovo Luna Park</h2>
        <div class="space-y-3">
          <div class="form-group">
            <label>Nome del parco *</label>
            <input id="pkNome" type="text" placeholder="es. Luna Park Roma" />
          </div>
          <div class="form-group">
            <label>Città *</label>
            <input id="pkCitta" type="text" placeholder="es. Roma, RM" />
          </div>
          <div class="form-group">
            <label>Regione</label>
            <input id="pkRegione" type="text" placeholder="es. Lazio" />
          </div>
          <div class="form-group">
            <label>Descrizione</label>
            <textarea id="pkDescrizione" rows="2" placeholder="Breve descrizione del parco..."></textarea>
          </div>
          <div class="form-group">
            <label>URL Immagine</label>
            <input id="pkImage" type="url" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>Latitudine</label>
            <input id="pkLat" type="number" step="0.0001" placeholder="es. 41.9028" />
          </div>
          <div class="form-group">
            <label>Longitudine</label>
            <input id="pkLon" type="number" step="0.0001" placeholder="es. 12.4964" />
          </div>
          <div class="form-group">
            <label>Telefono</label>
            <input id="pkTelefono" type="tel" placeholder="+39 06..." />
          </div>
          <div class="form-group">
            <label>Sito Web</label>
            <input id="pkWebsite" type="url" placeholder="https://..." />
          </div>
          <button class="btn-primary w-full justify-center" onclick="handleCreatePark()">
            <i class="fas fa-save"></i>Crea Parco
          </button>
        </div>
      </div>
    `;
  }
}

async function handleCreatePark() {
  const data = {
    nome:        document.getElementById('pkNome')?.value?.trim(),
    citta:       document.getElementById('pkCitta')?.value?.trim(),
    regione:     document.getElementById('pkRegione')?.value?.trim() || "",
    descrizione: document.getElementById('pkDescrizione')?.value?.trim() || "",
    image:       document.getElementById('pkImage')?.value?.trim() || "",
    lat:         parseFloat(document.getElementById('pkLat')?.value) || null,
    lon:         parseFloat(document.getElementById('pkLon')?.value) || null,
    telefono:    document.getElementById('pkTelefono')?.value?.trim() || "",
    website:     document.getElementById('pkWebsite')?.value?.trim() || ""
  };

  if (!data.nome || !data.citta) {
    showToast("Nome e città sono obbligatori", "warning"); return;
  }

  showLoading(true);
  try {
    await createPark(data);
    allParks = []; // Reset cache
    showToast(`Parco "${data.nome}" creato! ✅`, "success");
    loadOrgTab('parks');
  } catch (err) {
    showToast("Errore nella creazione del parco", "error");
  } finally {
    showLoading(false);
  }
}

async function orgManageCoupons(parkId, parkName) {
  const content = document.getElementById('orgContent');
  if (!content) return;

  content.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <button onclick="loadOrgTab('parks')" class="btn-secondary text-xs">
        <i class="fas fa-arrow-left"></i>Parchi
      </button>
      <h2 class="font-bold text-sm text-amber">Coupon: ${escapeHtml(parkName)}</h2>
    </div>

    <!-- Form nuovo coupon -->
    <div class="admin-section mb-4">
      <h2><i class="fas fa-plus"></i>Aggiungi Coupon</h2>
      <div class="space-y-2">
        <div class="form-group">
          <label>Nome Attrazione *</label>
          <input id="cpAttrazione" type="text" placeholder="es. Roller Coaster" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="form-group">
            <label>N° Giostra</label>
            <input id="cpNumero" type="number" placeholder="1" />
          </div>
          <div class="form-group">
            <label>Valore Sconto *</label>
            <input id="cpSconto" type="text" placeholder="es. 20% OFF" />
          </div>
        </div>
        <div class="form-group">
          <label>Nome Titolare</label>
          <input id="cpTitolare" type="text" placeholder="Nome operatore" />
        </div>
        <div class="form-group">
          <label>Descrizione</label>
          <input id="cpDesc" type="text" placeholder="Breve descrizione..." />
        </div>
        <div class="form-group">
          <label>URL Immagine</label>
          <input id="cpImage" type="url" placeholder="https://..." />
        </div>
        <div class="form-group">
          <label>Cooldown (ore)</label>
          <input id="cpCooldown" type="number" value="24" min="1" />
        </div>
        <button class="btn-success w-full justify-center" onclick="handleAddCoupon('${parkId}')">
          <i class="fas fa-plus"></i>Aggiungi Coupon
        </button>
      </div>
    </div>

    <!-- Lista coupon esistenti -->
    <div>
      <div class="section-title"><i class="fas fa-list"></i>Coupon Esistenti</div>
      <div id="couponMgmtList">${renderSkeletonCards(2)}</div>
    </div>
  `;

  loadCouponMgmtList(parkId);
}

async function loadCouponMgmtList(parkId) {
  const listEl = document.getElementById('couponMgmtList');
  if (!listEl) return;

  const coupons = await getCouponsByPark(parkId);
  if (coupons.length === 0) {
    listEl.innerHTML = renderEmptyState("🎟️", "Nessun coupon ancora");
    return;
  }

  listEl.innerHTML = coupons.map(c => `
    <div class="flex items-center gap-3 p-3 bg-primary rounded-lg mb-2 border border-amber/10">
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm truncate">${escapeHtml(c.nomeAttrazione || '')}</p>
        <p class="text-xs text-gray-500">
          Sconto: <strong>${escapeHtml(c.valoreSconto || '')}</strong> · Giostra #${c.numeroGiostra || ''}
        </p>
      </div>
      <button onclick="handleDeleteCoupon('${c.id}', '${parkId}')" class="btn-danger text-xs px-2 py-1 flex-shrink-0">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

async function handleAddCoupon(parkId) {
  const data = {
    parkId,
    nomeAttrazione: document.getElementById('cpAttrazione')?.value?.trim(),
    numeroGiostra:  parseInt(document.getElementById('cpNumero')?.value) || 0,
    valoreSconto:   document.getElementById('cpSconto')?.value?.trim(),
    nomeTitolare:   document.getElementById('cpTitolare')?.value?.trim() || "",
    descrizione:    document.getElementById('cpDesc')?.value?.trim() || "",
    image:          document.getElementById('cpImage')?.value?.trim() || "",
    cooldownHours:  parseInt(document.getElementById('cpCooldown')?.value) || 24
  };

  if (!data.nomeAttrazione || !data.valoreSconto) {
    showToast("Nome attrazione e valore sconto sono obbligatori", "warning"); return;
  }

  showLoading(true);
  try {
    await createCoupon(data);
    showToast("Coupon aggiunto! ✅", "success");
    loadCouponMgmtList(parkId);
    ['cpAttrazione','cpNumero','cpSconto','cpTitolare','cpDesc','cpImage'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  } catch (err) {
    showToast("Errore aggiunta coupon", "error");
  } finally {
    showLoading(false);
  }
}

async function handleDeleteCoupon(couponId, parkId) {
  if (couponId.startsWith("demo_")) {
    showToast("Non puoi eliminare coupon demo", "warning"); return;
  }
  if (!confirm("Eliminare questo coupon?")) return;
  showLoading(true);
  try {
    await deleteCoupon(couponId);
    showToast("Coupon eliminato", "info");
    loadCouponMgmtList(parkId);
  } finally {
    showLoading(false);
  }
}
