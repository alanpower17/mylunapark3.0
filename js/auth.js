// ============================================================
//  MyLunaPark - Auth Service
//  Gestione autenticazione utenti (login/registrazione/logout)
//  con Firebase Auth + Firestore
// ============================================================

// Stato autenticazione globale
let currentUser = null;

// ---- Osservatore stato auth ----
auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    try {
      const snap = await db.collection("users").doc(firebaseUser.uid).get();
      if (snap.exists) {
        currentUser = { uid: firebaseUser.uid, ...snap.data() };
      } else {
        // Documento non esiste ancora (appena creato), riprova tra poco
        currentUser = { uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || "Utente", role: "user", favorites: [] };
      }
    } catch (err) {
      console.error("Errore caricamento profilo:", err);
      currentUser = null;
    }
  } else {
    currentUser = null;
  }

  // Aggiorna l'interfaccia in base allo stato auth
  updateNavbar();
  // Se la pagina corrente richiede autenticazione, la pagina rilevante aggiusta se stessa
  if (typeof onAuthStateUpdated === 'function') onAuthStateUpdated(currentUser);
});

// ---- REGISTRAZIONE ----
async function registerUser(name, email, password, role = "user") {
  const res = await auth.createUserWithEmailAndPassword(email, password);

  const userData = {
    uid: res.user.uid,
    name,
    email,
    role,
    favorites: [],
    createdAt: Date.now()
  };

  await db.collection("users").doc(res.user.uid).set(userData);
  currentUser = userData;

  return userData;
}

// ---- LOGIN ----
async function loginUser(email, password) {
  const res = await auth.signInWithEmailAndPassword(email, password);

  const snap = await db.collection("users").doc(res.user.uid).get();
  if (snap.exists) {
    currentUser = { uid: res.user.uid, ...snap.data() };
  } else {
    currentUser = { uid: res.user.uid, email, name: "Utente", role: "user", favorites: [] };
  }

  return currentUser;
}

// ---- LOGOUT ----
async function logoutUser() {
  await auth.signOut();
  currentUser = null;
  updateNavbar();
  navigateTo('home');
  showToast("Disconnesso con successo", "info");
}

// ---- AGGIORNA PROFILO ----
async function updateUserProfile(uid, data) {
  await db.collection("users").doc(uid).update({ ...data, updatedAt: Date.now() });
  if (currentUser && currentUser.uid === uid) {
    currentUser = { ...currentUser, ...data };
  }
}

// ---- PREFERITI ----
async function toggleFavorite(parkId) {
  if (!currentUser) {
    showToast("Accedi per salvare i preferiti ❤️", "warning");
    navigateTo('login');
    return;
  }

  let favorites = currentUser.favorites || [];
  let action;

  if (favorites.includes(parkId)) {
    favorites = favorites.filter(f => f !== parkId);
    action = "removed";
  } else {
    favorites = [...favorites, parkId];
    action = "added";
  }

  // Aggiorna localmente
  currentUser.favorites = favorites;

  // Aggiorna su Firestore
  await db.collection("users").doc(currentUser.uid).update({ favorites });

  return action;
}

function isFavorite(parkId) {
  if (!currentUser) return false;
  return (currentUser.favorites || []).includes(parkId);
}

// ---- AGGIORNA NAVBAR ----
function updateNavbar() {
  const navUserMenu  = document.getElementById('navUserMenu');
  const navGuestMenu = document.getElementById('navGuestMenu');
  const navUserName  = document.getElementById('navUserName');

  if (currentUser) {
    navUserMenu.classList.remove('hidden');
    navUserMenu.classList.add('flex');
    navGuestMenu.classList.add('hidden');

    if (navUserName) {
      navUserName.textContent = currentUser.name || currentUser.email;
    }
  } else {
    navUserMenu.classList.add('hidden');
    navUserMenu.classList.remove('flex');
    navGuestMenu.classList.remove('hidden');
  }
}

// ---- GET TUTTI GLI UTENTI (solo admin) ----
async function getAllUsers() {
  const snap = await db.collection("users").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- AGGIORNA RUOLO UTENTE (solo admin) ----
async function setUserRole(uid, role) {
  await db.collection("users").doc(uid).update({ role });
}
