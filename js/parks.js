// ============================================================
//  MyLunaPark - Parks Service
//  Gestione luna park: fetch, creazione, ricerca, distanza
//  Collezione Firestore: "LunaParks"
// ============================================================

// ---- HAVERSINE FORMULA (distanza in km) ----
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ---- GET TUTTI I PARCHI ----
async function getAllParks() {
  try {
    const snap = await db.collection('LunaParks')
  .where('status', '==', 'approved')
  .get();
    const parks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Se il DB è vuoto, usa i dati demo
    if (parks.length === 0) {
      return getDemoParks();
    }
    return parks;
  } catch (err) {
    console.warn("Errore fetch parchi, uso demo:", err);
    return getDemoParks();
  }
}

// ---- GET SINGOLO PARCO ----
async function getParkById(id) {
  // Cerca prima nei demo se il prefisso è "demo_"
  if (id.startsWith("demo_")) {
    return getDemoParks().find(p => p.id === id) || null;
  }

  try {
    const snap = await db.collection("LunaParks").doc(id).get();
    if (snap.exists) return { id: snap.id, ...snap.data() };
    return null;
  } catch (err) {
    console.error("Errore getParkById:", err);
    return null;
  }
}

// ---- CREA PARCO (solo organizer/admin) ----
async function createPark(data) {
  const docRef = await db.collection('LunaParks').add({
    ...data, // 🔥 prende tutto dal form
    createdBy: currentUser.uid,
    status: "pending",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  return { id: docRef.id, ...data };
}

// ---- AGGIORNA PARCO ----
async function updatePark(parkId, data) {
  await db.collection("LunaParks").doc(parkId).update({
    ...data,
    updatedAt: Date.now()
  });
}

// ---- GET PARCHI ORGANIZZATORE ----
async function getMyParks(uid) {
  try {
    const snap = await db.collection("LunaParks")
      .where("organizerIds", "array-contains", uid)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Errore getMyParks:", err);
    return [];
  }
}

// ---- CERCA PARCHI (nome/città) ----
function filterParks(parks, searchTerm) {
  if (!searchTerm) return parks;
  const q = searchTerm.toLowerCase().trim();
  return parks.filter(p =>
    (p.nome  || '').toLowerCase().includes(q) ||
    (p.citta || '').toLowerCase().includes(q) ||
    (p.descrizione || '').toLowerCase().includes(q)
  );
}

// ---- ORDINA PARCHI ----
function sortParks(parks, userPos) {
  return [...parks].sort((a, b) => {
    const aFav = isFavorite(a.id);
    const bFav = isFavorite(b.id);

    // Preferiti prima
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    // Poi per distanza
    if (userPos && a.lat && a.lon && b.lat && b.lon) {
      const distA = getDistance(userPos.lat, userPos.lon, a.lat, a.lon);
      const distB = getDistance(userPos.lat, userPos.lon, b.lat, b.lon);
      return distA - distB;
    }

    // Infine alfabetico
    return (a.nome || '').localeCompare(b.nome || '');
  });
}

// ---- GEOLOCALIZZAZIONE ----
function getUserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizzazione non supportata"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}

// ---- DATI DEMO (quando Firebase non ha parchi) ----
function getDemoParks() {
  return [
    {
      id: "demo_gardaland",
      nome: "Gardaland",
      citta: "Castelnuovo del Garda, VR",
      regione: "Veneto",
      descrizione: "Il più grande parco divertimenti d'Italia con oltre 40 attrazioni mozzafiato.",
      image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=250&fit=crop",
      lat: 45.4405,
      lon: 10.7124,
      telefono: "+39 045 6449777",
      website: "https://www.gardaland.it",
      status: "active",
      organizerIds: ["demo_org"]
    },
    {
      id: "demo_mirabilandia",
      nome: "Mirabilandia",
      citta: "Ravenna, RA",
      regione: "Emilia-Romagna",
      descrizione: "Parco divertimenti con i più alti roller coaster d'Europa.",
      image: "https://images.unsplash.com/photo-1564156280315-1d42b4651629?w=400&h=250&fit=crop",
      lat: 44.3341,
      lon: 12.2817,
      telefono: "+39 0544 561500",
      website: "https://www.mirabilandia.it",
      status: "active",
      organizerIds: ["demo_org"]
    },
    {
      id: "demo_movieland",
      nome: "Movieland Park",
      citta: "Lazise, VR",
      regione: "Veneto",
      descrizione: "Il parco del cinema con spettacoli dal vivo e attrazioni uniche.",
      image: "https://images.unsplash.com/photo-1593671186131-d58817e7dee0?w=400&h=250&fit=crop",
      lat: 45.5003,
      lon: 10.7259,
      telefono: "+39 045 6499100",
      website: "https://www.movielandpark.it",
      status: "active",
      organizerIds: ["demo_org"]
    },
    {
      id: "demo_etnaland",
      nome: "Etnaland",
      citta: "Belpasso, CT",
      regione: "Sicilia",
      descrizione: "Il più grande parco acquatico e divertimenti del Sud Italia.",
      image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=250&fit=crop",
      lat: 37.5833,
      lon: 14.9781,
      telefono: "+39 095 7913333",
      website: "https://www.etnaland.eu",
      status: "active",
      organizerIds: ["demo_org"]
    },
    {
      id: "demo_legoland",
      nome: "LEGOLAND® Water Park",
      citta: "Castelnuovo del Garda, VR",
      regione: "Veneto",
      descrizione: "Parco acquatico per famiglie a tema LEGO con oltre 20 attrazioni.",
      image: "https://images.unsplash.com/photo-1549366021-9f761d450615?w=400&h=250&fit=crop",
      lat: 45.4415,
      lon: 10.7139,
      telefono: "+39 045 6449700",
      website: "https://www.legoland.it",
      status: "active",
      organizerIds: ["demo_org"]
    },
    {
      id: "demo_europapark",
      nome: "Rainbow Magicland",
      citta: "Valmontone, RM",
      regione: "Lazio",
      descrizione: "Il più grande parco divertimenti del Centro-Sud Italia.",
      image: "https://images.unsplash.com/photo-1568025732844-7b8213b5bdf9?w=400&h=250&fit=crop",
      lat: 41.7752,
      lon: 12.9169,
      telefono: "+39 06 959571",
      website: "https://www.rainbowmagicland.it",
      status: "active",
      organizerIds: ["demo_org"]
    }
  ];
}

// ---- DEMO COUPONS per parco ----
function getDemoCoupons(parkId) {
  const templates = [
    {
      nomeAttrazione: "Roller Coaster Extreme",
      numeroGiostra: 1,
      nomeTitolare: "Mario Rossi",
      valoreSconto: "20% OFF",
      descrizione: "Sconto del 20% sull'ingresso alla giostra più adrenalinica!",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop",
      cooldownHours: 24
    },
    {
      nomeAttrazione: "Casa degli Specchi",
      numeroGiostra: 5,
      nomeTitolare: "Luigi Bianchi",
      valoreSconto: "GRATIS",
      descrizione: "Un accesso gratuito alla famosa casa degli specchi.",
      image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=250&fit=crop",
      cooldownHours: 48
    },
    {
      nomeAttrazione: "Giro sulla Ruota Panoramica",
      numeroGiostra: 12,
      nomeTitolare: "Anna Verdi",
      valoreSconto: "2x1",
      descrizione: "Portati un amico gratis sulla ruota panoramica!",
      image: "https://images.unsplash.com/photo-1526492977949-8d30cc4d7a3a?w=400&h=250&fit=crop",
      cooldownHours: 24
    },
    {
      nomeAttrazione: "Acquascivolo Gigante",
      numeroGiostra: 8,
      nomeTitolare: "Marco Ferrari",
      valoreSconto: "15% OFF",
      descrizione: "Sconto sul biglietto dell'acquascivolo più lungo del parco.",
      image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400&h=250&fit=crop",
      cooldownHours: 24
    }
  ];

  return templates.map((t, i) => ({
    id: `demo_coupon_${parkId}_${i}`,
    parkId,
    ...t,
    createdAt: Date.now()
  }));
}
