// ==========================================================
// KPS Smart ERP — Firebase Configuration
// ==========================================================
// Firebase console se apni config yahan paste karo:
// Project Settings → Your apps → Web app → firebaseConfig
//
// Neeche wale placeholder values ko apni asli values se replace karo.
// ==========================================================

const firebaseConfig = {
  apiKey: "AIzaSyAgiUXruuq_BRN12dPBpTdzaMzJCPbIHTk",
  authDomain: "kps-smart-erp.firebaseapp.com",
  projectId: "kps-smart-erp",
  storageBucket: "kps-smart-erp.firebasestorage.app",
  messagingSenderId: "80549116898",
  appId: "1:80549116898:web:f3e6b85152f58f8de957bb"
};

// Firebase initialize
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
