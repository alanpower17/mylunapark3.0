// ============================================================
//  MyLunaPark - QR Service
//  Generazione QR code coupon + Scanner QR per operatori
// ============================================================

// ---- GENERA QR CODE PER COUPON ----
// Utilizza la libreria QRCode.js (CDN)
function generateCouponQR(containerId, couponId, parkId, userId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Payload del QR: JSON con dati del riscatto
  const payload = JSON.stringify({
    type:     'MYLUNAPARK_COUPON',
    couponId,
    parkId,
    userId:   userId || 'guest',
    ts:       Date.now(),
    ver:      '1.0'
  });

  container.innerHTML = '';

  // Usa la libreria QRCode (sarà inclusa nell'HTML)
  if (typeof QRCode !== 'undefined') {
    new QRCode(container, {
      text:          payload,
      width:         200,
      height:        200,
      colorDark:     '#020617',
      colorLight:    '#FFBF00',
      correctLevel:  QRCode.CorrectLevel.H
    });
  } else {
    // Fallback: mostra codice testo
    container.innerHTML = `
      <div class="bg-amber text-primary p-4 rounded-lg font-mono text-xs text-center break-all">
        ${escapeHtml(payload)}
      </div>
    `;
  }
}

// ---- AVVIA SCANNER QR (solo per operatori/rideowner) ----
let qrScannerInstance = null;

async function startQRScanner(containerId, onScanSuccess) {
  if (typeof Html5Qrcode === 'undefined') {
    showToast("Libreria scanner non disponibile", "error");
    return;
  }

  try {
    // Stop eventuale scanner precedente
    await stopQRScanner();

    qrScannerInstance = new Html5Qrcode(containerId);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    await qrScannerInstance.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        // Successo scan
        try {
          const data = JSON.parse(decodedText);
          if (data.type === 'MYLUNAPARK_COUPON') {
            onScanSuccess(data);
          } else {
            showToast("QR non valido per MyLunaPark", "warning");
          }
        } catch {
          showToast("QR non riconosciuto", "warning");
        }
      },
      (errorMessage) => {
        // Errori di scansione — silenzioso (avviene sempre durante la ricerca)
      }
    );

    return qrScannerInstance;
  } catch (err) {
    console.error("Errore avvio scanner:", err);
    showToast("Impossibile avviare la fotocamera", "error");
    return null;
  }
}

async function stopQRScanner() {
  if (qrScannerInstance) {
    try {
      const state = qrScannerInstance.getState();
      if (state === Html5QrcodeScannerState?.SCANNING ||
          state === Html5QrcodeScannerState?.PAUSED) {
        await qrScannerInstance.stop();
      }
    } catch {}
    qrScannerInstance = null;
  }
}

// ---- VALIDA QR SCAN (lato operatore) ----
async function validateQRScan(payload) {
  const { couponId, parkId, userId, ts } = payload;

  // Controlla che non sia scaduto (max 5 minuti)
  const age = Date.now() - ts;
  if (age > 5 * 60 * 1000) {
    return { valid: false, reason: "QR scaduto (più di 5 minuti)" };
  }

  // Controlla cooldown su Firestore
  try {
    const snap = await db.collection("couponUses")
      .where("userId",   "==", userId)
      .where("couponId", "==", couponId)
      .orderBy("usedAt", "desc")
      .limit(1)
      .get();

    if (!snap.empty) {
      const lastUse = snap.docs[0].data();
      const cooldownMs = (lastUse.cooldownHours || 24) * 3600000;
      const elapsed    = Date.now() - lastUse.usedAt;

      if (elapsed < cooldownMs) {
        const remainH = Math.ceil((cooldownMs - elapsed) / 3600000);
        return {
          valid: false,
          reason: `Coupon già usato. Disponibile tra ${remainH}h`
        };
      }
    }
  } catch (err) {
    // In modalità demo skip
  }

  return { valid: true };
}
