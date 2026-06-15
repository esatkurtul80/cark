import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBmmC4wPggOvZS8Wj2x9EZMWNAyQkGpSaE",
  authDomain: "tugba-cark.firebaseapp.com",
  projectId: "tugba-cark",
  storageBucket: "tugba-cark.firebasestorage.app",
  messagingSenderId: "102950485823",
  appId: "1:102950485823:web:236d5abaed233677de9d8a",
  measurementId: "G-30LPE6WMXL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
export default app;
