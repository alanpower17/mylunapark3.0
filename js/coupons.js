// ============================================================
//  MyLunaPark - Coupons Service
//  Gestione coupon: fetch, usa, cooldown, storico utilizzi
//  Collezioni Firestore: "coupons", "couponUses"
// ============================================================

// Cache locale per evitare fetch multipli
const _couponUsesCache = {};

// ---- GET COUPON PER PARCO ----
async function getCouponsByPark(parkId) {
  // Se è un parco demo, usa dati demo
  if (parkId.startsWith("demo_")) {
    return getDemoCoupons(parkId);
  }

  try {
    const snap = await db.collection("coupons")
      .where("parkId", "==", parkId)
      .get();

    const coupons = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Se vuoto, prova con "Coupons" (maiuscola) per compatibilità
    if (coupons.length === 0) {
      const snap2 = await db.collection("Coupons")
        .where("parkId", "==", parkId)
        .get();
      return snap2.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    return coupons;
  } catch (err) {
    console.error("Errore getCouponsByPark:", err);
    return [];
  }
}

// ---- CREA COUPON (organizer/admin) ----
async function createCoupon(data) {
  // Prova prima "coupons" (minuscolo, standard)
  const docRef = await db.collection("coupons").add({
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return { id: docRef.id, ...data };
}

// ---- ELIMINA COUPON ----
async function deleteCoupon(couponId) {
  try {
    await db.collection("coupons").doc(couponId).delete();
  } catch {
    await db.collection("Coupons").doc(couponId).delete();
  }
}

// ---- ELIMINA TUTTI I COUPON DI UN PARCO ----
async function deleteAllCouponsByPark(parkId) {
  const list = await getCouponsByPark(parkId);
  for (const c of list) {
    await deleteCoupon(c.id);
  }
}

// ---- USA COUPON (registra utilizzo) ----
async function useCoupon(couponId, parkId) {
  if (!currentUser) {
    showToast("Devi accedere per usare i coupon!", "warning");
    return false;
  }

  // Per coupon demo, simula solo localmente
  if (couponId.startsWith("demo_")) {
    _couponUsesCache[couponId] = Date.now();
    return true;
  }

  try {
    await db.collection("couponUses").add({
      userId: currentUser.uid,
      couponId,
      parkId,
      usedAt: Date.now(),
      cooldownHours: 24
    });

    // Aggiorna cache locale
    _couponUsesCache[couponId] = Date.now();

    return true;
  } catch (err) {
    console.error("Errore useCoupon:", err);
    showToast("Errore nel registrare l'utilizzo", "error");
    return false;
  }
}

// ---- CARICA UTILIZZI UTENTE CORRENTE ----
async function loadMyUsages(parkId) {
  if (!currentUser) return {};

  // Per parchi demo usa cache locale
  if (parkId && parkId.startsWith("demo_")) return _couponUsesCache;

  try {
    const snap = await db.collection("couponUses")
      .where("userId", "==", currentUser.uid)
      .where("parkId", "==", parkId)
      .get();

    const result = {};
    snap.docs.forEach(d => {
      const data = d.data();
      // Mantieni il più recente
      if (!result[data.couponId] || result[data.couponId] < data.usedAt) {
        result[data.couponId] = data.usedAt;
      }
    });

    return result;
  } catch (err) {
    console.error("Errore loadMyUsages:", err);
    return {};
  }
}

// ---- CONTROLLA COOLDOWN ----
function getCooldownStatus(lastUsed, cooldownHours = 24) {
  if (!lastUsed) return { disabled: false, remaining: 0, remainingText: "" };

  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const elapsed    = Date.now() - lastUsed;
  const remaining  = Math.max(0, cooldownMs - elapsed);
  const disabled   = remaining > 0;

  let remainingText = "";
  if (remaining > 0) {
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    if (h > 0) remainingText = `${h}h ${m}m`;
    else remainingText = `${m}m`;
  }

  return { disabled, remaining, remainingText, percent: Math.max(0, 1 - elapsed / cooldownMs) };
}

// ---- GET STATISTICHE USO COUPON (admin/organizer) ----
async function getCouponStats(parkId) {
  if (parkId.startsWith("demo_")) return {};

  try {
    const snap = await db.collection("couponUses")
      .where("parkId", "==", parkId)
      .get();

    const stats = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if (!stats[data.couponId]) stats[data.couponId] = 0;
      stats[data.couponId]++;
    });

    return stats;
  } catch (err) {
    console.error("Errore getCouponStats:", err);
    return {};
  }
}

// ---- SYNC DA GOOGLE SHEETS (formato JSON) ----
async function syncCouponsFromSheetUrl(parkId, sheetJsonUrl) {
  try {
    showLoading(true);
    const res  = await fetch(sheetJsonUrl);
    const data = await res.json();

    // Supporta sia array diretto che { coupons: [] }
    const rows = Array.isArray(data) ? data : (data.coupons || data.values || []);

    if (!rows.length) {
      showToast("Nessun coupon trovato nel foglio", "warning");
      showLoading(false);
      return;
    }

    // Cancella vecchi coupon del parco
    await deleteAllCouponsByPark(parkId);

    let count = 0;
    for (const row of rows) {
      await createCoupon({
        parkId,
        nomeAttrazione: row.nomeAttrazione || row.nome || row.attraction || "Attrazione",
        numeroGiostra:  row.numeroGiostra || row.numero || row.number || 0,
        nomeTitolare:   row.nomeTitolare  || row.titolare || row.owner || "",
        valoreSconto:   row.valoreSconto  || row.sconto || row.discount || "",
        descrizione:    row.descrizione   || row.description || "",
        image:          row.image || row.immagine || "",
        cooldownHours:  parseInt(row.cooldownHours || row.cooldown || 24)
      });
      count++;
    }

    showToast(`${count} coupon sincronizzati ✅`, "success");
  } catch (err) {
    console.error("Errore sync:", err);
    showToast("Errore nella sincronizzazione", "error");
  } finally {
    showLoading(false);
  }
}
