// ============================================================
//  MyLunaPark - Firebase Configuration
//  Configurazione e inizializzazione Firebase
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBRVXc2rCK9zIgIKMitnkdQfqxZXYMcI0w",
  authDomain: "mylunaparkchatgpt.firebaseapp.com",
  projectId: "mylunaparkchatgpt",
  storageBucket: "mylunaparkchatgpt.firebasestorage.app",
  messagingSenderId: "915512401969",
  appId: "1:915512401969:web:919e77a70ba3a9259e3510",
  measurementId: "G-JX7MZS4YFX"
};

// Inizializzazione app Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);

// Export dei servizi
const auth = firebase.auth();
const db   = firebase.firestore();

console.log("🔥 Firebase inizializzato correttamente");
