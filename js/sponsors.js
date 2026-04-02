// ============================================================
//  MyLunaPark - Sponsors Service
//  Gestione sponsor: fetch, tracking view/click, statistiche
//  Collezioni Firestore: "sponsorImages", "sponsorStats"
// ============================================================

// ---- GET SPONSOR PER TARGET (coupon > parco > globale) ----
async function getSponsorForTarget(couponId, parkId) {
  try {
    const ref = db.collection("sponsorImages");

    // 1. Sponsor specifico del coupon
    if (couponId && !couponId.startsWith("demo_")) {
      const q1 = await ref.where("couponId", "==", couponId).limit(1).get();
      if (!q1.empty) return { id: q1.docs[0].id, ...q1.docs[0].data() };
    }

    // 2. Sponsor specifico del parco
    if (parkId && !parkId.startsWith("demo_")) {
      const q2 = await ref.where("parkId", "==", parkId).where("couponId", "==", "").limit(1).get();
      if (!q2.empty) return { id: q2.docs[0].id, ...q2.docs[0].data() };
    }

    // 3. Sponsor globale (couponId e parkId vuoti)
    const q3 = await ref.where("couponId", "==", "").where("parkId", "==", "").limit(1).get();
    if (!q3.empty) return { id: q3.docs[0].id, ...q3.docs[0].data() };

    return null;
  } catch (err) {
    // Probabilmente offline o parco demo → nessuno sponsor
    return null;
  }
}

// ---- GET TUTTI GLI SPONSOR ----
async function getAllSponsors() {
  try {
    const snap = await db.collection("sponsorImages").orderBy("createdAt", "desc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Errore getAllSponsors:", err);
    return [];
  }
}

// ---- CREA SPONSOR ----
async function createSponsor(data) {
  const docRef = await db.collection("sponsorImages").add({
    imageURL:  data.imageURL  || "",
    clickURL:  data.clickURL  || "",
    couponId:  data.couponId  || "",
    parkId:    data.parkId    || "",
    name:      data.name      || "Sponsor",
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return { id: docRef.id, ...data };
}

// ---- ELIMINA SPONSOR ----
async function deleteSponsor(sponsorId) {
  await db.collection("sponsorImages").doc(sponsorId).delete();
}

// ---- TRACCIA EVENTO (view / click) ----
async function trackSponsorEvent(sponsorId, type) {
  if (!sponsorId || sponsorId.startsWith("demo_")) return;

  try {
    await db.collection("sponsorStats").add({
      sponsorId,
      type,    // "view" | "click"
      userId:  currentUser?.uid || null,
      timestamp: Date.now()
    });
  } catch (err) {
    // Silenzioso: non bloccare l'UX per errori di tracking
    console.warn("Errore tracking sponsor:", err);
  }
}

// ---- GET STATISTICHE SPONSOR ----
async function getSponsorStats() {
  try {
    const snap = await db.collection("sponsorStats").get();

    const statsMap = {};
    snap.docs.forEach(d => {
      const data = d.data();
      const id   = data.sponsorId;

      if (!statsMap[id]) statsMap[id] = { views: 0, clicks: 0 };
      if (data.type === "view")  statsMap[id].views++;
      if (data.type === "click") statsMap[id].clicks++;
    });

    return Object.entries(statsMap).map(([sponsorId, val]) => ({
      sponsorId,
      views:  val.views,
      clicks: val.clicks,
      ctr: val.views > 0 ? (val.clicks / val.views * 100).toFixed(2) : "0.00"
    }));
  } catch (err) {
    console.error("Errore getSponsorStats:", err);
    return [];
  }
}

// ---- GET STATISTICHE PER SINGOLO SPONSOR ----
async function getSponsorStatById(sponsorId) {
  try {
    const snap = await db.collection("sponsorStats")
      .where("sponsorId", "==", sponsorId)
      .get();

    let views = 0, clicks = 0;
    snap.docs.forEach(d => {
      if (d.data().type === "view")  views++;
      if (d.data().type === "click") clicks++;
    });

    return {
      views,
      clicks,
      ctr: views > 0 ? (clicks / views * 100).toFixed(2) : "0.00"
    };
  } catch (err) {
    return { views: 0, clicks: 0, ctr: "0.00" };
  }
}
