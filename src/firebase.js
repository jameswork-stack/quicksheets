// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDF138sFk25MCczQPrMR9NP8T5I-cuZRjg",
  authDomain: "quicksheets-35df4.firebaseapp.com",
  projectId: "quicksheets-35df4",
  storageBucket: "quicksheets-35df4.appspot.com",
  messagingSenderId: "275179894294",
  appId: "1:275179894294:web:9d18471723ff2f6b92a737"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);