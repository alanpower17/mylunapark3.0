// ============================================================
//  MyLunaPark - App.js
//  SPA Router + Page Renderers
//  Pagine: home, search, login, park-detail, favorites,
//          profile, admin, organizer, admin-stats, map, rideowner
// ============================================================

// ---- STATO APP ----
let currentPage   = 'home';
let currentParkId = null;
let userPosition  = null;
let allParks      = [];
let searchTerm    = '';
let leafletMap    = null;
let statsChartRef = null;

// ---- ROUTER ----
function navigateTo(page, params = {}) {
  currentPage = page;

  // Aggiorna bottom nav
  updateBottomNav(page);

  // Scrolla in alto
  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (page) {
    case 'home':
      renderHomePage();
      break;
    case 'search':
      renderSearchPage();
      break;
    case 'login':
      renderLoginPage(params.mode || 'login');
      break;
    case 'park':
      renderParkDetailPage(params.id);
      break;
    case 'favorites':
      renderFavoritesPage();
      break;
    case 'profile':
      renderProfilePage();
      break;
    case 'admin':
      renderAdminPage();
      break;
    case 'admin-stats':
      renderAdminStatsPage();
      break;
    case 'organizer':
      renderOrganizerPage();
      break;
    case 'rideowner':
      renderRideOwnerPage();
      break;
    case 'map':
      renderMapPage();
      break;
    default:
      renderHomePage();
  }
}

// ---- SPLASH SCREEN ----
function hideSplash() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => splash.remove(), 500);
  }
}

function animateSplashBar() {
  const bar = document.getElementById('splashBar');
  if (!bar) return;
  let w = 0;
  const iv = setInterval(() => {
    w += Math.random() * 18 + 5;
    if (w >= 100) { w = 100; clearInterval(iv); }
    bar.style.width = w + '%';
  }, 120);
}

// ---- HELPER NAVIGAZIONE PARCO ----
function openPark(parkId) {
  navigateTo('park', { id: parkId });
}

// ---- CALLBACK AUTH STATE ----
function onAuthStateUpdated(user) {
  if (!user && ['profile','admin','organizer','admin-stats','rideowner'].includes(currentPage)) {
    navigateTo('home');
  }
}

// ============================================================
//  PAGINA: HOME
// ============================================================
async function renderHomePage() {
  const main = document.getElementById('mainContent');

  // Mostra skeleton
  main.innerHTML = `
    <div class="hero-gradient">
      <img src="https://i.postimg.cc/qqcVPvq8/logo-e-scritta-senza-sfondo.png"
           onerror="this.src=''; this.style.display='none'; this.nextElementSibling.style.display='block';"
           class="hero-logo" alt="MyLunaPark" />
      <h1 class="hidden text-3xl font-extrabold text-amber">🎡 MyLunaPark</h1>
      <p class="text-gray-400 text-sm mt-1">Coupon esclusivi nei migliori luna park italiani</p>
    </div>

    <!-- Barra ricerca -->
    <div class="search-bar mb-4">
      <i class="fas fa-search search-icon"></i>
      <input id="homeSearch" type="text" placeholder="Cerca per nome o città..." value="${escapeHtml(searchTerm)}" />
    </div>

    <!-- Pill filtri -->
    <div class="pills-scroll mb-4" id="regionFilters">
      <button class="filter-pill active" data-region="all">🗺️ Tutti</button>
      <button class="filter-pill" data-region="nord">🏔️ Nord</button>
      <button class="filter-pill" data-region="centro">🌿 Centro</button>
      <button class="filter-pill" data-region="sud">☀️ Sud & Isole</button>
    </div>

    <!-- Geolocation status -->
    <div id="geoStatus" class="mb-3 flex items-center gap-2 text-sm text-gray-500">
      <i class="fas fa-location-crosshairs"></i>
      <span>Rilevando posizione...</span>
    </div>

    <!-- Grid parchi -->
    <div id="parksGrid" class="grid grid-cols-1 gap-4 grid-parks">
      ${renderSkeletonCards(4)}
    </div>
  `;

  // Gestione ricerca con debounce
  const searchInput = document.getElementById('homeSearch');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(e => {
      searchTerm = e.target.value;
      renderParksGrid();
    }, 300));
  }

  // Gestione filtri regione
  let activeRegion = 'all';
  document.querySelectorAll('[data-region]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-region]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRegion = btn.dataset.region;
      renderParksGrid(activeRegion);
    });
  });

  // Geolocalizzazione
  const geoStatus = document.getElementById('geoStatus');
  try {
    userPosition = await getUserPosition();
    if (geoStatus) {
      geoStatus.innerHTML = `<i class="fas fa-location-dot text-neon"></i>
        <span class="text-neon text-xs">Posizione rilevata – i parchi sono ordinati per distanza</span>`;
    }
  } catch {
    userPosition = null;
    if (geoStatus) {
      geoStatus.innerHTML = `<i class="fas fa-location-slash"></i>
        <span class="text-xs">Posizione non disponibile – ordine alfabetico</span>`;
    }
  }

  // Carica parchi
  if (allParks.length === 0) {
    allParks = await getAllParks();
  }

  function renderParksGrid(region = activeRegion) {
    const grid = document.getElementById('parksGrid');
    if (!grid) return;

    let filtered = filterParks(allParks, searchTerm);

    // Filtro regione
    if (region !== 'all') {
      const nordRegioni = ['piemonte','valle d\'aosta','liguria','lombardia','veneto','trentino','friuli','emilia'];
      const centroRegioni = ['toscana','umbria','marche','lazio','abruzzo','molise'];
      filtered = filtered.filter(p => {
        const r = (p.regione || '').toLowerCase();
        if (region === 'nord')   return nordRegioni.some(x => r.includes(x));
        if (region === 'centro') return centroRegioni.some(x => r.includes(x));
        if (region === 'sud')    return !nordRegioni.some(x => r.includes(x)) && !centroRegioni.some(x => r.includes(x));
        return true;
      });
    }

    const sorted = sortParks(filtered, userPosition);

    if (sorted.length === 0) {
      grid.innerHTML = renderEmptyState("🎡", "Nessun parco trovato", `
        <button class="btn-secondary mt-2" onclick="document.getElementById('homeSearch').value=''; searchTerm=''; renderHomePage();">
          Mostra tutti
        </button>
      `);
      return;
    }

    grid.innerHTML = sorted.map(park => renderParkCard(park)).join('');
  }

  renderParksGrid();
}

// ---- PARK CARD HTML ----
function renderParkCard(park) {
  const distance = userPosition && park.lat && park.lon
    ? getDistance(userPosition.lat, userPosition.lon, park.lat, park.lon)
    : null;

  const isFav = isFavorite(park.id);

  return `
    <div class="card cursor-pointer" onclick="openPark('${park.id}')">

      <div class="relative">
        ${park.image
          ? `<img src="${escapeHtml(park.image)}" alt="${escapeHtml(park.nome)}"
                  class="park-card-img"
                  onerror="this.style.display='none'" />`
          : `<div class="park-card-placeholder">🎡</div>`
        }

        <!-- Badge stato -->
        ${park.status === 'active'
          ? `<span class="badge badge-green absolute top-2 left-2"><i class="fas fa-circle text-[8px]"></i>Aperto</span>`
          : `<span class="badge badge-gray absolute top-2 left-2">Chiuso</span>`
        }

        <!-- Preferito -->
        <button
          class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-lg hover:scale-110 transition"
          onclick="event.stopPropagation(); toggleFavCard('${park.id}', this)"
          title="${isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}">
          ${isFav ? '❤️' : '🤍'}
        </button>
      </div>

      <div class="card-body">
        <div class="flex justify-between items-start gap-2">
          <div>
            <h2 class="font-bold text-base text-amber">${escapeHtml(park.nome || '')}</h2>
            <p class="text-sm text-gray-400 mt-0.5">
              <i class="fas fa-map-marker-alt text-xs mr-1"></i>${escapeHtml(park.citta || '')}
            </p>
          </div>
          ${distance !== null
            ? `<div class="distance-pill flex-shrink-0">
                <i class="fas fa-location-dot"></i>${formatDistance(distance)}
              </div>`
            : ''
          }
        </div>

        ${park.descrizione
          ? `<p class="text-xs text-gray-500 mt-2 line-clamp-2">${escapeHtml(park.descrizione)}</p>`
          : ''
        }

        <button class="btn-primary w-full mt-3 text-sm justify-center"
                onclick="event.stopPropagation(); openPark('${park.id}')">
          <i class="fas fa-ticket"></i>Vedi Coupon
        </button>
      </div>
    </div>
  `;
}

// Toggle preferito inline (senza ricaricare la pagina)
async function toggleFavCard(parkId, btnEl) {
  const action = await toggleFavorite(parkId);
  if (action === 'added') {
    btnEl.textContent = '❤️';
    showToast("Aggiunto ai preferiti ❤️", "success");
  } else if (action === 'removed') {
    btnEl.textContent = '🤍';
    showToast("Rimosso dai preferiti", "info");
  }
}

// ============================================================
//  PAGINA: RICERCA
// ============================================================
async function renderSearchPage() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <h1 class="section-title"><i class="fas fa-search"></i>Cerca Parchi</h1>

    <div class="search-bar mb-4">
      <i class="fas fa-search search-icon"></i>
      <input id="searchInput" type="text" placeholder="Nome parco, città, regione..." autofocus />
    </div>

    <div id="searchResults" class="grid grid-cols-1 gap-4 grid-parks">
      ${renderEmptyState("🔍", "Inizia a digitare per cercare un parco")}
    </div>
  `;

  if (allParks.length === 0) allParks = await getAllParks();

  document.getElementById('searchInput')?.addEventListener('input', debounce(e => {
    const q = e.target.value.trim();
    const results = document.getElementById('searchResults');
    if (!results) return;

    if (!q) {
      results.innerHTML = renderEmptyState("🔍", "Inizia a digitare per cercare un parco");
      return;
    }

    const filtered = filterParks(allParks, q);
    if (filtered.length === 0) {
      results.innerHTML = renderEmptyState("😔", `Nessun parco trovato per "<strong>${escapeHtml(q)}</strong>"`);
    } else {
      results.innerHTML = filtered.map(p => renderParkCard(p)).join('');
    }
  }, 200));
}

// ============================================================
//  PAGINA: LOGIN / REGISTRAZIONE
// ============================================================
function renderLoginPage(mode = 'login') {
  const main = document.getElementById('mainContent');

  if (currentUser) {
    renderProfilePage();
    return;
  }

  main.innerHTML = `
    <div class="max-w-sm mx-auto">
      <div class="text-center mb-6">
        <div class="text-5xl mb-2">🎡</div>
        <h1 class="text-2xl font-extrabold text-amber">MyLunaPark</h1>
        <p class="text-gray-400 text-sm mt-1">I tuoi coupon esclusivi ti aspettano</p>
      </div>

      <!-- Tab login/registra -->
      <div class="tab-bar mb-6">
        <button id="tabLogin" class="tab-btn ${mode === 'login' ? 'active' : ''}"
                onclick="setAuthMode('login')">Accedi</button>
        <button id="tabRegister" class="tab-btn ${mode === 'register' ? 'active' : ''}"
                onclick="setAuthMode('register')">Registrati</button>
      </div>

      <!-- FORM LOGIN -->
      <div id="loginForm" class="${mode === 'register' ? 'hidden' : ''}">
        <div class="form-group">
          <label>Email</label>
          <input id="loginEmail" type="email" placeholder="la-tua@email.it" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input id="loginPassword" type="password" placeholder="Password" />
        </div>
        <button class="btn-primary w-full justify-center mt-2" onclick="handleLogin()">
          <i class="fas fa-sign-in-alt"></i>Accedi
        </button>
      </div>

      <!-- FORM REGISTRAZIONE -->
      <div id="registerForm" class="${mode === 'login' ? 'hidden' : ''}">
        <div class="form-group">
          <label>Nome completo</label>
          <input id="regName" type="text" placeholder="Mario Rossi" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input id="regEmail" type="email" placeholder="la-tua@email.it" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input id="regPassword" type="password" placeholder="Minimo 6 caratteri" />
        </div>
        <div class="form-group">
          <label>Tipo account</label>
          <select id="regRole">
            <option value="user">👤 Utente (raccoglgo coupon)</option>
            <option value="organizer">🏟️ Organizzatore Luna Park</option>
            <option value="rideowner">🎠 Gestore Giostra</option>
          </select>
        </div>
        <button class="btn-primary w-full justify-center mt-2" onclick="handleRegister()">
          <i class="fas fa-user-plus"></i>Crea Account
        </button>
      </div>

      <div id="authError" class="hidden mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm"></div>

      <p class="text-center text-gray-500 text-xs mt-6">
        Continuando accetti i nostri <span class="text-amber">Termini di Servizio</span>
      </p>
    </div>
  `;
}

function setAuthMode(mode) {
  document.getElementById('loginForm').classList.toggle('hidden', mode === 'register');
  document.getElementById('registerForm').classList.toggle('hidden', mode === 'login');
  document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('tabRegister').classList.toggle('active', mode === 'register');
  document.getElementById('authError')?.classList.add('hidden');
}

async function handleLogin() {
  const email    = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  const errEl    = document.getElementById('authError');

  if (!email || !password) {
    showAuthError("Inserisci email e password"); return;
  }

  showLoading(true);
  try {
    await loginUser(email, password);
    showToast(`Benvenuto, ${currentUser?.name || email}! 🎡`, "success");
    navigateTo('home');
  } catch (err) {
    showAuthError(getFirebaseErrorMessage(err.code));
  } finally {
    showLoading(false);
  }
}

async function handleRegister() {
  const name     = document.getElementById('regName')?.value?.trim();
  const email    = document.getElementById('regEmail')?.value?.trim();
  const password = document.getElementById('regPassword')?.value;
  const role     = document.getElementById('regRole')?.value;

  if (!name || !email || !password) {
    showAuthError("Compila tutti i campi"); return;
  }
  if (password.length < 6) {
    showAuthError("La password deve avere almeno 6 caratteri"); return;
  }

  showLoading(true);
  try {
    await registerUser(name, email, password, role);
    showToast(`Account creato con successo! Benvenuto, ${name} 🎉`, "success");
    navigateTo('home');
  } catch (err) {
    showAuthError(getFirebaseErrorMessage(err.code));
  } finally {
    showLoading(false);
  }
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

function getFirebaseErrorMessage(code) {
  const messages = {
    "auth/email-already-in-use":   "Email già registrata. Prova ad accedere.",
    "auth/invalid-email":          "Email non valida.",
    "auth/weak-password":          "Password troppo debole (min. 6 caratteri).",
    "auth/user-not-found":         "Nessun account con questa email.",
    "auth/wrong-password":         "Password errata.",
    "auth/too-many-requests":      "Troppi tentativi. Riprova tra un po'.",
    "auth/network-request-failed": "Errore di rete. Controlla la connessione.",
    "auth/invalid-credential":     "Credenziali non valide. Controlla email e password."
  };
  return messages[code] || "Errore durante l'autenticazione. Riprova.";
}

// ============================================================
//  PAGINA: DETTAGLIO PARCO + COUPON
// ============================================================
async function renderParkDetailPage(parkId) {
  if (!parkId) { navigateTo('home'); return; }
  currentParkId = parkId;

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <button onclick="navigateTo('home')" class="btn-secondary mb-4 text-sm">
      <i class="fas fa-arrow-left mr-2"></i>Torna alla home
    </button>
    <div id="parkDetailContent">${renderSkeletonCards(1)}</div>
    <div id="couponsContent" class="mt-6">
      <div class="section-title"><i class="fas fa-ticket"></i>Coupon Disponibili</div>
      <div id="couponsList">${renderSkeletonCards(3)}</div>
    </div>
  `;

  // Carica parco
  const park = await getParkById(parkId);
  if (!park) {
    document.getElementById('parkDetailContent').innerHTML =
      renderEmptyState("😔", "Parco non trovato");
    return;
  }

  // Render info parco
  document.getElementById('parkDetailContent').innerHTML = `
    <div class="card overflow-hidden">
      ${park.image
        ? `<img src="${escapeHtml(park.image)}" alt="${escapeHtml(park.nome)}"
                class="w-full h-56 object-cover" onerror="this.style.display='none'" />`
        : `<div class="park-card-placeholder" style="height:14rem;">🎡</div>`
      }
      <div class="card-body">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-xl font-extrabold text-amber">${escapeHtml(park.nome || '')}</h1>
            <p class="text-gray-400 text-sm mt-1">
              <i class="fas fa-map-marker-alt mr-1"></i>${escapeHtml(park.citta || '')}
            </p>
          </div>
          <button
            class="text-2xl hover:scale-110 transition"
            onclick="handleDetailFavorite('${park.id}', this)">
            ${isFavorite(park.id) ? '❤️' : '🤍'}
          </button>
        </div>

        ${park.descrizione
          ? `<p class="text-sm text-gray-400 mt-3">${escapeHtml(park.descrizione)}</p>`
          : ''
        }

        <div class="flex flex-wrap gap-2 mt-3">
          ${park.telefono
            ? `<a href="tel:${escapeHtml(park.telefono)}" class="badge badge-amber">
                <i class="fas fa-phone text-[10px]"></i>${escapeHtml(park.telefono)}
               </a>`
            : ''
          }
          ${park.website
            ? `<a href="${escapeHtml(park.website)}" target="_blank" rel="noopener" class="badge badge-neon">
                <i class="fas fa-globe text-[10px]"></i>Sito Web
               </a>`
            : ''
          }
          ${userPosition && park.lat && park.lon
            ? `<span class="distance-pill">
                <i class="fas fa-location-dot"></i>
                ${formatDistance(getDistance(userPosition.lat, userPosition.lon, park.lat, park.lon))}
               </span>`
            : ''
          }
        </div>
      </div>
    </div>
  `;

  // Carica coupon + utilizzi
  const [coupons, usages] = await Promise.all([
    getCouponsByPark(parkId),
    loadMyUsages(parkId)
  ]);

  const couponsList = document.getElementById('couponsList');
  if (!couponsList) return;

  if (coupons.length === 0) {
    couponsList.innerHTML = renderEmptyState("🎟️", "Nessun coupon disponibile per questo parco al momento.");
    return;
  }

  couponsList.innerHTML = coupons.map(c => renderCouponCard(c, usages[c.id] || null)).join('');
}

async function handleDetailFavorite(parkId, btnEl) {
  const action = await toggleFavorite(parkId);
  if (action === 'added') {
    btnEl.textContent = '❤️';
    showToast("Aggiunto ai preferiti ❤️", "success");
  } else if (action === 'removed') {
    btnEl.textContent = '🤍';
    showToast("Rimosso dai preferiti", "info");
  }
}

// ---- COUPON CARD HTML ----
function renderCouponCard(coupon, lastUsed) {
  const { disabled, remainingText, percent } = getCooldownStatus(lastUsed, coupon.cooldownHours || 24);

  return `
    <div class="coupon-card mb-4">

      <!-- Immagine / Sponsor -->
      <div class="relative" id="coupon-img-${coupon.id}">
        ${coupon.image
          ? `<img src="${escapeHtml(coupon.image)}" alt="${escapeHtml(coupon.nomeAttrazione || '')}"
                  class="w-full h-40 object-cover"
                  onerror="this.style.display='none'" />`
          : `<div class="park-card-placeholder" style="height:10rem;">🎠</div>`
        }

        <!-- Badge valore sconto -->
        <span class="badge badge-amber absolute top-2 right-2 text-sm font-extrabold">
          ${escapeHtml(coupon.valoreSconto || '')}
        </span>
      </div>

      <!-- Divider taglietto -->
      <div class="coupon-scissors">✂ ── ── ── ──</div>

      <div class="p-3 space-y-1">
        <h3 class="font-bold text-amber">${escapeHtml(coupon.nomeAttrazione || 'Attrazione')}</h3>
        <p class="text-sm text-gray-400">
          <i class="fas fa-hashtag text-xs mr-1"></i>Giostra N° ${escapeHtml(String(coupon.numeroGiostra || ''))}
        </p>
        ${coupon.nomeTitolare
          ? `<p class="text-xs text-gray-500"><i class="fas fa-user text-xs mr-1"></i>${escapeHtml(coupon.nomeTitolare)}</p>`
          : ''
        }
        ${coupon.descrizione
          ? `<p class="text-xs text-gray-400 mt-1">${escapeHtml(coupon.descrizione)}</p>`
          : ''
        }

        <!-- Cooldown -->
        ${disabled ? `
          <div class="timer-ring mt-2">
            <i class="fas fa-clock"></i>
            Disponibile tra ${remainingText}
          </div>
          <div class="cooldown-bar-bg">
            <div class="cooldown-bar-fill" style="width: ${(percent * 100).toFixed(1)}%"></div>
          </div>
        ` : ''}

        <!-- Bottone usa -->
        <button
          ${disabled ? 'disabled' : ''}
          onclick="${disabled ? '' : `openRedeemModal('${coupon.id}', '${currentParkId}', '${escapeHtml(coupon.nomeAttrazione || '')}', this)`}"
          class="w-full mt-3 ${disabled ? 'btn-disabled cursor-not-allowed' : 'btn-success'} text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
          ${disabled
            ? `<i class="fas fa-lock"></i>NON DISPONIBILE`
            : `<i class="fas fa-ticket"></i>USA ORA 🎟️`
          }
        </button>
      </div>
    </div>
  `;
}

// ---- MODALE RISCATTO ----
function openRedeemModal(couponId, parkId, attractionName, btnEl) {
  showModal(`
    <div class="text-center space-y-4">
      <div class="text-4xl">🎟️</div>
      <h2 class="text-lg font-bold text-amber">Conferma utilizzo</h2>
      <p class="text-sm text-gray-300">
        Stai per usare il coupon per:<br/>
        <strong class="text-amber">${escapeHtml(attractionName)}</strong>
      </p>
      <p class="text-xs text-gray-500">
        Mostra questa schermata all'operatore della giostra per ottenere il tuo sconto.
      </p>
      <div class="flex gap-3 justify-center mt-2">
        <button onclick="closeModal()" class="btn-secondary">Annulla</button>
        <button onclick="confirmRedeem('${couponId}', '${parkId}', this)" class="btn-success">
          <i class="fas fa-check"></i>CONFERMA
        </button>
      </div>
    </div>
  `);
}

async function confirmRedeem(couponId, parkId, btnEl) {
  btnEl.disabled = true;
  btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';

  const success = await useCoupon(couponId, parkId);

  if (success) {
    const ts       = formatDateTime(Date.now());
    const userName = currentUser?.name || 'Ospite';

    document.getElementById('globalModalContent').innerHTML = `
      <div class="text-center space-y-3">
        <div class="text-4xl animate-bounce">🎟️</div>
        <h2 class="text-base font-bold text-green-400">Coupon Riscattato!</h2>
        <p class="text-xs text-gray-400">Mostra questo QR all'operatore</p>

        <!-- QR CODE generato -->
        <div id="redeemQrBox"
             class="mx-auto bg-amber p-3 rounded-xl flex items-center justify-center"
             style="width:160px;height:160px;"></div>

        <div class="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-left space-y-1">
          <p class="text-xs text-green-400 font-semibold">✅ Sconto confermato</p>
          <p class="text-xs text-gray-400">Utente: <span class="text-white">${escapeHtml(userName)}</span></p>
          <p class="text-xs text-gray-400">Data: <span class="text-white">${ts}</span></p>
        </div>

        <button onclick="closeModal(); renderParkDetailPage('${parkId}')"
                class="btn-primary w-full justify-center mt-1">
          <i class="fas fa-check"></i>Chiudi
        </button>
      </div>
    `;

    // Genera QR code dopo il render
    setTimeout(() => {
      generateCouponQR('redeemQrBox', couponId, parkId, currentUser?.uid);
    }, 50);

    showToast("Coupon riscattato! 🎉", "success");
  } else {
    closeModal();
  }
}

// ============================================================
//  PAGINA: PREFERITI
// ============================================================
async function renderFavoritesPage() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <h1 class="section-title"><i class="fas fa-heart text-red-400"></i>I tuoi Preferiti</h1>
    <div id="favContent">${renderSkeletonCards(2)}</div>
  `;

  if (!currentUser) {
    document.getElementById('favContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❤️</div>
        <p>Accedi per vedere i tuoi parchi preferiti</p>
        <button class="btn-primary mt-3" onclick="navigateTo('login')">
          <i class="fas fa-sign-in-alt"></i>Accedi
        </button>
      </div>
    `;
    return;
  }

  if (allParks.length === 0) allParks = await getAllParks();

  const favorites = (currentUser.favorites || []);
  const favParks  = allParks.filter(p => favorites.includes(p.id));

  const favContent = document.getElementById('favContent');

  if (favParks.length === 0) {
    favContent.innerHTML = renderEmptyState("🤍", "Non hai ancora salvato nessun parco preferito",
      `<button class="btn-primary mt-2" onclick="navigateTo('home')">
        <i class="fas fa-home"></i>Vai alla Home
      </button>`
    );
    return;
  }

  favContent.innerHTML = `
    <div class="grid grid-cols-1 gap-4 grid-parks">
      ${favParks.map(p => renderParkCard(p)).join('')}
    </div>
  `;
}

// ============================================================
//  PAGINA: PROFILO
// ============================================================
function renderProfilePage() {
  const main = document.getElementById('mainContent');

  if (!currentUser) {
    renderLoginPage();
    return;
  }

  const initials = getInitials(currentUser.name);
  const roleLabel = getRoleLabel(currentUser.role);

  main.innerHTML = `
    <div class="max-w-sm mx-auto space-y-4">

      <!-- Avatar + info -->
      <div class="card card-body flex items-center gap-4">
        <div class="avatar w-16 h-16 text-2xl" style="width:4rem;height:4rem;font-size:1.5rem;">
          ${initials}
        </div>
        <div>
          <h2 class="font-bold text-lg text-amber">${escapeHtml(currentUser.name || '')}</h2>
          <p class="text-sm text-gray-400">${escapeHtml(currentUser.email || '')}</p>
          <span class="badge ${getRoleClass(currentUser.role)} mt-1">${roleLabel}</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3">
        <div class="stat-box">
          <div class="stat-value">${(currentUser.favorites || []).length}</div>
          <div class="stat-label">❤️ Preferiti</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${formatDate(currentUser.createdAt)}</div>
          <div class="stat-label">📅 Iscritto</div>
        </div>
      </div>

      <!-- Azioni ruolo -->
      ${currentUser.role === 'organizer' ? `
        <button class="btn-primary w-full justify-center" onclick="navigateTo('organizer')">
          <i class="fas fa-building"></i>Dashboard Organizzatore
        </button>
      ` : ''}
      ${currentUser.role === 'rideowner' ? `
        <button class="btn-primary w-full justify-center" onclick="navigateTo('rideowner')">
          <i class="fas fa-ferris-wheel"></i>Dashboard Gestore Giostra
        </button>
      ` : ''}
      ${currentUser.role === 'admin' ? `
        <button class="btn-primary w-full justify-center" onclick="navigateTo('admin')">
          <i class="fas fa-cog"></i>Pannello Admin
        </button>
        <button class="btn-neon w-full justify-center flex items-center gap-2" onclick="navigateTo('rideowner')">
          <i class="fas fa-qrcode"></i>Scanner QR Coupon
        </button>
        <button class="btn-secondary w-full justify-center" onclick="navigateTo('admin-stats')">
          <i class="fas fa-chart-bar"></i>Statistiche Sponsor
        </button>
      ` : ''}

      <!-- Preferiti lista -->
      <div>
        <h3 class="section-title mt-2"><i class="fas fa-heart text-red-400"></i>I tuoi Parchi Preferiti</h3>
        <button class="btn-secondary w-full text-sm justify-center" onclick="navigateTo('favorites')">
          Vedi tutti <i class="fas fa-arrow-right ml-1"></i>
        </button>
      </div>

      <!-- Logout -->
      <button class="btn-danger w-full flex items-center justify-center gap-2" onclick="logoutUser()">
        <i class="fas fa-sign-out-alt"></i>Disconnetti
      </button>
    </div>
  `;
}

// ============================================================
//  PAGINA: ADMIN PANEL
// ============================================================
async function renderAdminPage() {
  const main = document.getElementById('mainContent');

  if (!currentUser || currentUser.role !== 'admin') {
    main.innerHTML = renderEmptyState("🔒", "Accesso non autorizzato");
    return;
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
  
  main.innerHTML = `
    <h1 class="section-title"><i class="fas fa-cog text-amber"></i>Pannello Admin</h1>

    <!-- Sezione: Crea Sponsor -->
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

    <!-- Lista sponsor -->
    <div class="admin-section">
      <h2><i class="fas fa-list"></i>Sponsor Attivi</h2>
      <div id="sponsorList">
        <div class="skeleton h-16 rounded-lg"></div>
        <div class="skeleton h-16 rounded-lg mt-2"></div>
      </div>
    </div>

    <!-- Gestione utenti -->
    <div class="admin-section">
      <h2><i class="fas fa-users"></i>Utenti Registrati</h2>
      <div id="usersList">
        <div class="skeleton h-12 rounded-lg"></div>
        <div class="skeleton h-12 rounded-lg mt-2"></div>
      </div>
    </div>

    <!-- Link statistiche -->
    <button class="btn-neon w-full justify-center flex items-center gap-2 mt-2" onclick="navigateTo('admin-stats')">
      <i class="fas fa-chart-bar"></i>Vedi Statistiche Sponsor
    </button>
  `;

  // Carica sponsor
  const sponsors = await getAllSponsors();
  const spList = document.getElementById('sponsorList');
  if (spList) {
    if (sponsors.length === 0) {
      spList.innerHTML = renderEmptyState("📭", "Nessuno sponsor creato");
    } else {
      spList.innerHTML = sponsors.map(s => `
        <div class="flex items-center gap-3 p-3 bg-primary rounded-lg mb-2 border border-amber/10">
          ${s.imageURL
            ? `<img src="${escapeHtml(s.imageURL)}" class="w-16 h-12 object-cover rounded flex-shrink-0" onerror="this.style.display='none'" />`
            : `<div class="w-16 h-12 bg-gray-800 rounded flex items-center justify-center text-2xl flex-shrink-0">📢</div>`
          }
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate">${escapeHtml(s.name || 'Sponsor')}</p>
            <p class="text-xs text-gray-500">Coupon: ${s.couponId || '—'} | Park: ${s.parkId || '—'}</p>
            <a href="${escapeHtml(s.clickURL || '#')}" target="_blank" class="text-neon text-xs">Link ↗</a>
          </div>
          <button onclick="handleDeleteSponsor('${s.id}')" class="btn-danger text-xs px-2 py-1">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `).join('');
    }
  }

  // Carica utenti
  try {
    const users = await getAllUsers();
    const usersEl = document.getElementById('usersList');
    if (usersEl) {
      usersEl.innerHTML = users.map(u => `
        <div class="flex items-center gap-3 p-2 bg-primary rounded-lg mb-2 border border-amber/10">
          <div class="avatar text-sm">${getInitials(u.name)}</div>
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
    document.getElementById('usersList').innerHTML = `<p class="text-xs text-gray-500">Errore caricamento utenti</p>`;
  }
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
    renderAdminPage();
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
    renderAdminPage();
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

// ============================================================
//  PAGINA: MAPPA INTERATTIVA (Leaflet.js)
// ============================================================
async function renderMapPage() {
  const main = document.getElementById('mainContent');

  // Ferma eventuale scanner QR aperto
  await stopQRScanner().catch(() => {});

  // Distruggi mappa precedente
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }

  main.innerHTML = `
    <h1 class="section-title"><i class="fas fa-map text-amber"></i>Mappa Parchi</h1>

    <!-- Filtri -->
    <div class="map-filter-bar mb-1">
      <button class="filter-pill active" id="mapFilterAll" onclick="filterMapMarkers('all', this)">
        🗺️ Tutti
      </button>
      <button class="filter-pill" onclick="filterMapMarkers('favorites', this)">
        ❤️ Preferiti
      </button>
      <button class="filter-pill" onclick="filterMapMarkers('nearby', this)">
        📍 Vicino a me
      </button>
    </div>

    <!-- Contenitore mappa -->
    <div id="mapContainer"></div>

    <div class="map-info-panel">
      <i class="fas fa-info-circle text-amber"></i>
      <span>Clicca su un marcatore per vedere i dettagli e i coupon disponibili</span>
    </div>

    <!-- Lista parchi sotto la mappa (mobile) -->
    <div class="mt-4">
      <div class="section-title"><i class="fas fa-list"></i>Lista Parchi</div>
      <div id="mapParksList" class="space-y-2"></div>
    </div>
  `;

  // Carica parchi
  if (allParks.length === 0) allParks = await getAllParks();

  // Posizione utente
  let center = [41.9028, 12.4964]; // Default: Roma
  let zoom   = 6;

  try {
    if (!userPosition) userPosition = await getUserPosition();
    center = [userPosition.lat, userPosition.lon];
    zoom   = 8;
  } catch {}

  // Inizializza mappa Leaflet
  leafletMap = L.map('mapContainer', {
    center,
    zoom,
    zoomControl: true,
    attributionControl: true
  });

  // Tile layer OpenStreetMap (dark-style via Stadia)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
  }).addTo(leafletMap);

  // Marcatore posizione utente
  if (userPosition) {
    const userIcon = L.divIcon({
      className: '',
      html: `<div class="custom-marker user-pos"><div class="custom-marker-inner">📍</div></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -38]
    });
    L.marker([userPosition.lat, userPosition.lon], { icon: userIcon })
      .addTo(leafletMap)
      .bindPopup('<div class="map-popup"><p class="popup-nome">📍 La tua posizione</p></div>');
  }

  // Aggiungi marcatori parchi
  window._mapMarkers = [];

  allParks.forEach(park => {
    if (!park.lat || !park.lon) return;

    const isFav  = isFavorite(park.id);
    const dist   = userPosition
      ? getDistance(userPosition.lat, userPosition.lon, park.lat, park.lon)
      : null;

    const icon = L.divIcon({
      className: '',
      html: `<div class="custom-marker ${isFav ? 'favorite' : 'normal'}">
               <div class="custom-marker-inner">🎡</div>
             </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -40]
    });

    const popupHtml = `
      <div class="map-popup">
        <p class="popup-nome">${escapeHtml(park.nome || '')}</p>
        <p class="popup-citta"><i class="fas fa-map-marker-alt mr-1"></i>${escapeHtml(park.citta || '')}</p>
        ${dist !== null
          ? `<p class="popup-distance"><i class="fas fa-location-dot"></i>${formatDistance(dist)}</p>`
          : ''
        }
        <button class="popup-btn" onclick="openPark('${park.id}')">
          🎟️ Vedi Coupon
        </button>
      </div>
    `;

    const marker = L.marker([park.lat, park.lon], { icon })
      .addTo(leafletMap)
      .bindPopup(popupHtml, { maxWidth: 220 });

    marker._parkData = park;
    window._mapMarkers.push(marker);
  });

  // Render lista sotto la mappa
  renderMapParksList(allParks);
}

function filterMapMarkers(type, btnEl) {
  document.querySelectorAll('.map-filter-bar .filter-pill').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');

  if (!window._mapMarkers || !leafletMap) return;

  let filtered = allParks;
  if (type === 'favorites') {
    filtered = allParks.filter(p => isFavorite(p.id));
  } else if (type === 'nearby' && userPosition) {
    filtered = allParks.filter(p =>
      p.lat && p.lon && getDistance(userPosition.lat, userPosition.lon, p.lat, p.lon) < 150
    );
  }

  const visibleIds = new Set(filtered.map(p => p.id));

  window._mapMarkers.forEach(m => {
    if (visibleIds.has(m._parkData?.id)) {
      if (!leafletMap.hasLayer(m)) m.addTo(leafletMap);
    } else {
      leafletMap.removeLayer(m);
    }
  });

  if (filtered.length > 0 && filtered[0].lat) {
    leafletMap.setView([filtered[0].lat, filtered[0].lon], 8, { animate: true });
  }

  renderMapParksList(filtered);
}

function renderMapParksList(parks) {
  const listEl = document.getElementById('mapParksList');
  if (!listEl) return;

  const sorted = sortParks(parks, userPosition);
  listEl.innerHTML = sorted.slice(0, 10).map(p => {
    const dist = userPosition && p.lat && p.lon
      ? getDistance(userPosition.lat, userPosition.lon, p.lat, p.lon)
      : null;

    return `
      <div class="flex items-center gap-3 p-3 bg-card rounded-xl border border-amber/10 cursor-pointer"
           onclick="${p.lat && p.lon ? `leafletMap.setView([${p.lat},${p.lon}], 14, {animate:true})` : `openPark('${p.id}')`}">
        <div class="text-2xl flex-shrink-0">${isFavorite(p.id) ? '❤️' : '🎡'}</div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm text-amber truncate">${escapeHtml(p.nome || '')}</p>
          <p class="text-xs text-gray-500 truncate">${escapeHtml(p.citta || '')}</p>
        </div>
        ${dist !== null ? `<div class="distance-pill flex-shrink-0">${formatDistance(dist)}</div>` : ''}
        <button onclick="event.stopPropagation(); openPark('${p.id}')"
                class="btn-primary text-xs px-2 py-1 flex-shrink-0">
          🎟️
        </button>
      </div>
    `;
  }).join('');
}

// ============================================================
//  PAGINA: DASHBOARD GESTORE GIOSTRA (RideOwner)
// ============================================================
async function renderRideOwnerPage() {
  const main = document.getElementById('mainContent');

  if (!currentUser || !['rideowner','admin','organizer'].includes(currentUser.role)) {
    main.innerHTML = `
      <div class="text-center py-12">
        ${renderEmptyState("🔒", "Accesso riservato ai gestori di giostra")}
        <button class="btn-primary mt-4" onclick="navigateTo('home')">
          <i class="fas fa-home"></i>Torna alla Home
        </button>
      </div>
    `;
    return;
  }

  main.innerHTML = `
    <h1 class="section-title"><i class="fas fa-ferris-wheel text-amber"></i>Dashboard Gestore Giostra</h1>

    <!-- Tab -->
    <div class="tab-bar mb-5" id="rideTabs">
      <button class="tab-btn active" onclick="switchRideTab('scanner', this)">📷 Scanner QR</button>
      <button class="tab-btn" onclick="switchRideTab('history', this)">📋 Storico</button>
      <button class="tab-btn" onclick="switchRideTab('stats', this)">📊 Stat</button>
    </div>

    <div id="rideContent"></div>
  `;

  loadRideTab('scanner');
}

function switchRideTab(tab, btnEl) {
  document.querySelectorAll('#rideTabs .tab-btn').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  loadRideTab(tab);
}

async function loadRideTab(tab) {
  const content = document.getElementById('rideContent');
  if (!content) return;

  if (tab === 'scanner') {
    content.innerHTML = `
      <div class="admin-section">
        <h2><i class="fas fa-qrcode"></i>Scansiona QR Coupon</h2>
        <p class="text-xs text-gray-400 mb-3">
          Inquadra il QR code mostrato dal cliente per verificare e validare il coupon.
        </p>

        <!-- Area scanner -->
        <div id="qr-reader" class="mb-3" style="border-radius:0.75rem;overflow:hidden;"></div>

        <!-- Risultato scan -->
        <div id="scanResult" class="hidden"></div>

        <div class="flex gap-2 mt-3">
          <button onclick="startRideScanner()" id="btnStartScan" class="btn-primary flex-1 justify-center">
            <i class="fas fa-camera"></i>Avvia Scanner
          </button>
          <button onclick="stopRideScanner()" id="btnStopScan" class="btn-secondary flex-1 justify-center hidden">
            <i class="fas fa-stop"></i>Ferma
          </button>
        </div>
      </div>

      <!-- Manuale: inserisci coupon ID -->
      <div class="admin-section mt-4">
        <h2><i class="fas fa-keyboard"></i>Verifica Manuale</h2>
        <div class="form-group">
          <label>Coupon ID</label>
          <input id="manualCouponId" type="text" placeholder="Incolla l'ID del coupon..." />
        </div>
        <div class="form-group">
          <label>User ID</label>
          <input id="manualUserId" type="text" placeholder="ID utente..." />
        </div>
        <button onclick="handleManualValidate()" class="btn-success w-full justify-center">
          <i class="fas fa-check-circle"></i>Verifica
        </button>
      </div>
    `;
  }

  if (tab === 'history') {
    content.innerHTML = `
      <div class="admin-section">
        <h2><i class="fas fa-history"></i>Utilizzi Recenti</h2>
        <div id="rideHistory">${renderSkeletonCards(3)}</div>
      </div>
    `;
    loadRideHistory();
  }

  if (tab === 'stats') {
    content.innerHTML = `
      <div class="admin-section">
        <h2><i class="fas fa-chart-pie"></i>Statistiche Utilizzi</h2>
        <div id="rideStats">${renderSkeletonCards(2)}</div>
      </div>
    `;
    loadRideStats();
  }
}

async function startRideScanner() {
  document.getElementById('btnStartScan')?.classList.add('hidden');
  document.getElementById('btnStopScan')?.classList.remove('hidden');
  document.getElementById('scanResult')?.classList.add('hidden');

  await startQRScanner('qr-reader', async (payload) => {
    await stopRideScanner();
    showScanResult(payload);
  });
}

async function stopRideScanner() {
  await stopQRScanner();
  document.getElementById('btnStartScan')?.classList.remove('hidden');
  document.getElementById('btnStopScan')?.classList.add('hidden');
}

async function showScanResult(payload) {
  const resultEl = document.getElementById('scanResult');
  if (!resultEl) return;

  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <div class="bg-primary border border-amber/20 rounded-xl p-4 text-center">
      <div class="text-3xl mb-2">🔍</div>
      <p class="text-xs text-gray-400 mb-2">Verifica in corso...</p>
    </div>
  `;

  const validation = await validateQRScan(payload);

  if (validation.valid) {
    resultEl.innerHTML = `
      <div class="bg-green-900/30 border border-green-500/40 rounded-xl p-4 text-center">
        <div class="text-4xl mb-2 animate-bounce">✅</div>
        <h3 class="font-bold text-green-400">Coupon VALIDO!</h3>
        <p class="text-xs text-gray-300 mt-2">Coupon ID: <span class="text-amber font-mono text-[10px]">${escapeHtml(payload.couponId)}</span></p>
        <p class="text-xs text-gray-300">Parco: <span class="text-white">${escapeHtml(payload.parkId)}</span></p>
        <p class="text-xs text-gray-300">Utente: <span class="text-white">${escapeHtml(payload.userId)}</span></p>
        <button onclick="confirmScanRedeem('${payload.couponId}','${payload.parkId}','${payload.userId}')"
                class="btn-success w-full justify-center mt-3">
          <i class="fas fa-check"></i>APPLICA SCONTO
        </button>
      </div>
    `;
  } else {
    resultEl.innerHTML = `
      <div class="bg-red-900/30 border border-red-500/40 rounded-xl p-4 text-center">
        <div class="text-4xl mb-2">❌</div>
        <h3 class="font-bold text-red-400">Coupon NON Valido</h3>
        <p class="text-xs text-gray-300 mt-2">${escapeHtml(validation.reason || 'Coupon non valido')}</p>
        <button onclick="startRideScanner()" class="btn-primary w-full justify-center mt-3">
          <i class="fas fa-redo"></i>Scansiona di nuovo
        </button>
      </div>
    `;
  }
}

async function confirmScanRedeem(couponId, parkId, userId) {
  try {
    // Registra utilizzo per conto dell'utente
    await db.collection("couponUses").add({
      userId,
      couponId,
      parkId,
      usedAt:        Date.now(),
      cooldownHours: 24,
      validatedBy:   currentUser?.uid || 'operator'
    });
    showToast("Sconto applicato con successo! ✅", "success");
    loadRideTab('scanner');
  } catch (err) {
    showToast("Errore registrazione utilizzo", "error");
  }
}

async function handleManualValidate() {
  const couponId = document.getElementById('manualCouponId')?.value?.trim();
  const userId   = document.getElementById('manualUserId')?.value?.trim();

  if (!couponId) { showToast("Inserisci l'ID del coupon", "warning"); return; }

  const payload = { couponId, parkId: 'manual', userId: userId || 'unknown', ts: Date.now() };
  const validation = await validateQRScan(payload);

  const resultEl = document.getElementById('scanResult');
  if (!resultEl) return;
  resultEl.classList.remove('hidden');

  if (validation.valid) {
    resultEl.innerHTML = `
      <div class="bg-green-900/30 border border-green-500/40 rounded-xl p-3 text-center">
        <p class="text-green-400 font-bold">✅ Coupon valido!</p>
        <button onclick="confirmScanRedeem('${escapeHtml(couponId)}','manual','${escapeHtml(userId || 'unknown')}')"
                class="btn-success w-full justify-center mt-2">Applica Sconto</button>
      </div>
    `;
  } else {
    resultEl.innerHTML = `
      <div class="bg-red-900/30 border border-red-500/40 rounded-xl p-3 text-center">
        <p class="text-red-400 font-bold">❌ ${escapeHtml(validation.reason || 'Non valido')}</p>
      </div>
    `;
  }
}

async function loadRideHistory() {
  const histEl = document.getElementById('rideHistory');
  if (!histEl) return;

  try {
    const snap = await db.collection("couponUses")
      .orderBy("usedAt", "desc")
      .limit(20)
      .get();

    if (snap.empty) {
      histEl.innerHTML = renderEmptyState("📋", "Nessun utilizzo registrato");
      return;
    }

    histEl.innerHTML = snap.docs.map(d => {
      const data = d.data();
      return `
        <div class="flex items-center gap-3 p-3 bg-primary rounded-lg mb-2 border border-amber/10">
          <div class="text-2xl">🎟️</div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-amber truncate">
              Coupon: ${escapeHtml(data.couponId?.slice(0,12) || '')}...
            </p>
            <p class="text-xs text-gray-500">Park: ${escapeHtml(data.parkId || '')}</p>
            <p class="text-xs text-gray-500">${formatDateTime(data.usedAt)}</p>
          </div>
          <span class="badge badge-green flex-shrink-0">Usato</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    histEl.innerHTML = renderEmptyState("⚠️", "Errore caricamento storico");
  }
}

async function loadRideStats() {
  const statsEl = document.getElementById('rideStats');
  if (!statsEl) return;

  try {
    const snap = await db.collection("couponUses").get();

    const byPark  = {};
    let total = 0;

    snap.docs.forEach(d => {
      const data = d.data();
      byPark[data.parkId] = (byPark[data.parkId] || 0) + 1;
      total++;
    });

    const topParks = Object.entries(byPark)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    statsEl.innerHTML = `
      <div class="stat-box mb-4">
        <div class="stat-value text-amber">${total}</div>
        <div class="stat-label">🎟️ Coupon Totali Usati</div>
      </div>

      ${topParks.length > 0 ? `
        <h3 class="text-sm font-semibold text-amber mb-2">Top Parchi per Utilizzi</h3>
        ${topParks.map(([parkId, count]) => `
          <div class="flex items-center justify-between p-3 bg-primary rounded-lg mb-2 border border-amber/10">
            <span class="text-sm truncate">${escapeHtml(parkId)}</span>
            <span class="badge badge-amber ml-2">${count} usi</span>
          </div>
        `).join('')}
      ` : renderEmptyState("📊", "Nessun utilizzo ancora")}
    `;
  } catch {
    statsEl.innerHTML = renderEmptyState("⚠️", "Errore caricamento statistiche");
  }
}

// ============================================================
//  AVVIO APP + SPLASH SCREEN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log("🎡 MyLunaPark App avviata!");

  // Anima la barra splash
  animateSplashBar();

  // Avvia la navigazione iniziale, poi nascondi lo splash
  setTimeout(() => {
    navigateTo('home');
    setTimeout(hideSplash, 400);
  }, 1200);
});
