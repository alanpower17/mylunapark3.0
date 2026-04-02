# 🎡 MyLunaPark — Web App v2

Applicazione web **SPA (Single Page Application)** per la gestione di coupon esclusivi nei luna park italiani.  
Basata su **Vanilla JS + Firebase + Tailwind CSS + Leaflet.js** — nessun build step, funziona direttamente nel browser.

---

## ✅ Funzionalità Implementate (v2)

### 🏠 Home
- Lista di tutti i luna park (da Firestore o fallback automatico su 6 demo)
- Ricerca per nome / città con debounce 300ms
- Filtro per regione (Nord / Centro / Sud & Isole) con pill cliccabili
- **Geolocalizzazione**: ordina i parchi per distanza (formula Haversine)
- **Preferiti**: cuore ❤️ su ogni card, sincronizzato con Firestore
- Splash screen animata con barra di avanzamento

### 🗺️ Mappa Interattiva (Leaflet.js)
- Mappa dark-style con marcatori personalizzati per ogni parco
- Marcatore speciale per la posizione utente (con animazione pulse)
- Popup per ogni parco con nome, distanza, bottone "Vedi Coupon"
- Filtri: Tutti / Preferiti / Vicino a me
- Lista parchi sotto la mappa ordinata per distanza
- Click sul marker → centra mappa con zoom

### 🔐 Login / Registrazione
- Login con email e password (Firebase Auth)
- Registrazione con scelta del ruolo: Utente / Organizzatore / Gestore Giostra
- Messaggi di errore localizzati in italiano
- Validazione form lato client

### 🎡 Dettaglio Parco + Coupon
- Immagine, nome, città, distanza, telefono, sito web, badge stato
- Lista coupon con immagine, badge valore sconto, divider "taglietto"
- **Sistema cooldown** con timer visivo e barra di progressione
- **QR Code generato** al momento del riscatto (library: qrcodejs)
- Modale di conferma con schermata riscatto professionale

### 📷 QR Code System
- **Generazione**: QR color amber su sfondo scuro al riscatto
- **Scanner**: usa fotocamera per validare coupon (html5-qrcode)
- Validazione payload (tipo, scadenza 5min, controllo cooldown)
- Modalità verifica manuale per operatori

### ❤️ Preferiti
- Pagina dedicata con griglia parchi preferiti
- Sincronizzati in real-time con Firestore

### 👤 Profilo
- Avatar con iniziali, ruolo colorato, statistiche personali
- Scorciatoie dinamiche per dashboard in base al ruolo
- Logout sicuro

### 🏟️ Dashboard Organizzatore
- Tab: I miei Parchi / Gestione Coupon / Crea Nuovo Parco
- Creazione parco con lat/lon, immagine, telefono, sito web
- Aggiunta e rimozione coupon (con form completo)
- Visualizzazione lista coupon esistenti in tempo reale

### 🎠 Dashboard Gestore Giostra (RideOwner)
- **Scanner QR**: inquadra il QR del cliente per validare il coupon
- Risposta visiva verde (valido) / rossa (non valido / già usato)
- **Verifica manuale** via input ID
- **Storico utilizzi**: ultimi 20 riscatti con data/ora
- **Statistiche**: totale coupon usati, top parchi per utilizzi

### 👑 Pannello Admin
- Creazione sponsor (URL immagine, URL click, target coupon/park)
- Lista sponsor con anteprima immagine e link
- Eliminazione sponsor
- Gestione ruoli utenti (dropdown per ogni utente)

### 📊 Statistiche Sponsor con Chart.js
- KPI: Views totali, Click totali, CTR medio
- **Grafico a barre** Views vs Click per sponsor
- **Grafico a linee** CTR per sponsor
- Lista dettagliata con barra CTR animata

### 📱 PWA (Progressive Web App)
- `manifest.json` con icona e tema
- **Service Worker** con caching offline-first
- Banner di installazione "Aggiungi alla home screen"
- **Banner offline** quando non c'è connessione
- Push notifications (base, pronto per backend)

---

## 📁 Struttura File

```
/
├── index.html              # HTML principale con splash, navbar, bottom nav (5 voci)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (caching + push notifications)
├── css/
│   ├── style.css           # Tema dark gold/neon + nuovi stili v2
│   └── map.css             # Stili mappa Leaflet personalizzati
└── js/
    ├── firebase-config.js  # Config Firebase (progetto mylunaparkchatgpt)
    ├── auth.js             # Auth (login, register, logout, preferiti, ruoli)
    ├── parks.js            # Parks (fetch, distanza Haversine, filtri, 6 demo)
    ├── coupons.js          # Coupons (fetch, usa, cooldown, sync Sheets)
    ├── sponsors.js         # Sponsors (CRUD, tracking view/click, CTR stats)
    ├── utils.js            # Utilities (toast, loading, modal, debounce, nav)
    ├── qr.js               # QR Code generazione + scanner + validazione
    └── app.js              # Router SPA + tutte le pagine
```

---

## 🔗 Pagine / Route (client-side)

| Pagina | Funzione JS | Accesso |
|--------|-------------|---------|
| Home | `navigateTo('home')` | Pubblico |
| Cerca | `navigateTo('search')` | Pubblico |
| Login | `navigateTo('login')` | Pubblico |
| Dettaglio Parco | `navigateTo('park', {id})` | Pubblico |
| Preferiti | `navigateTo('favorites')` | Utente loggato |
| Profilo | `navigateTo('profile')` | Utente loggato |
| Mappa | `navigateTo('map')` | Pubblico |
| Dashboard Organizzatore | `navigateTo('organizer')` | organizer / admin |
| Dashboard Gestore | `navigateTo('rideowner')` | rideowner / admin |
| Pannello Admin | `navigateTo('admin')` | admin |
| Statistiche Sponsor | `navigateTo('admin-stats')` | admin / organizer |

---

## 🔥 Firebase — Setup Richiesto

**Progetto:** `mylunaparkchatgpt`

### Passi obbligatori nella Firebase Console:
1. **Authentication** → Email/Password: **ABILITARE**
2. **Firestore Database** → **CREARE** (modalità produzione o test)
3. **Regole Firestore** per test:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /LunaParks/{doc}  { allow read: if true; allow write: if request.auth != null; }
    match /coupons/{doc}    { allow read: if true; allow write: if request.auth != null; }
    match /users/{uid}      { allow read, write: if request.auth.uid == uid || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }
    match /couponUses/{doc} { allow read, write: if request.auth != null; }
    match /sponsorImages/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /sponsorStats/{doc}  { allow create: if true; allow read: if request.auth != null; }
  }
}
```

---

## 🗄️ Collezioni Firestore

| Collezione | Campi principali |
|-----------|-----------------|
| `users` | uid, name, email, role, favorites[], createdAt |
| `LunaParks` | nome, citta, regione, lat, lon, image, status, organizerIds[] |
| `coupons` | parkId, nomeAttrazione, valoreSconto, cooldownHours, image, numeroGiostra |
| `couponUses` | userId, couponId, parkId, usedAt, cooldownHours, validatedBy |
| `sponsorImages` | name, imageURL, clickURL, couponId, parkId, createdAt |
| `sponsorStats` | sponsorId, type (view/click), userId, timestamp |

---

## 📦 Librerie CDN Utilizzate

| Libreria | Versione | Uso |
|---------|---------|-----|
| Tailwind CSS | CDN | Stili utility-first |
| Firebase JS SDK | 9.23.0 (compat) | Auth + Firestore |
| Font Awesome | 6.4.0 | Icone |
| Google Fonts Inter | — | Tipografia |
| Leaflet.js | 1.9.4 | Mappa interattiva |
| QRCode.js | 1.0.0 | Generazione QR code |
| html5-qrcode | 2.3.8 | Scanner QR via camera |
| Chart.js | 4.4.0 | Grafici statistiche |

---

## 🚀 Modalità Demo (senza Firebase)

Se Firestore non è disponibile, l'app usa automaticamente **6 parchi demo**:
Gardaland, Mirabilandia, Movieland Park, Etnaland, LEGOLAND, Rainbow Magicland  
Ogni parco ha 4 coupon di esempio con immagini da Unsplash.

---

## 🔮 Prossimi Sviluppi Consigliati

- [ ] Rating e recensioni parchi (stelle + commenti)
- [ ] Notifiche push reali (Firebase Cloud Messaging)
- [ ] Export statistiche CSV
- [ ] Filtro per data validità coupon
- [ ] Sincronizzazione coupon da Google Sheets (UI)
- [ ] Onboarding tutorial (primo accesso)
- [ ] Dark/Light mode toggle
- [ ] Sistema punti/fedeltà utente

---

*MyLunaPark v2 — 🎡 Coupon esclusivi nei migliori luna park italiani*
