import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAI } from "firebase/ai";

const firebaseConfig = {
  projectId: "ielts-mastery-b0414",
  appId: "1:703825467358:web:466d9befada49e6df26f4f",
  storageBucket: "ielts-mastery-b0414.firebasestorage.app",
  apiKey: "AIzaSyCWIXYE2P0APiykKHKOGzsMI6mbBhdao2M",
  authDomain: "ielts-mastery-b0414.firebaseapp.com",
  messagingSenderId: "703825467358",
  measurementId: "G-ZGTCC2MBM3",
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const ai = getAI(app);
