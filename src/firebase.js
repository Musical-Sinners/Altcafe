import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDcpwwnJTrmmyVLA4NgGStmJktAGjuALpI",
  authDomain: "altcafe-eeb18.firebaseapp.com",
  projectId: "altcafe-eeb18",
  storageBucket: "altcafe-eeb18.firebasestorage.app",
  messagingSenderId: "975147727472",
  appId: "1:975147727472:web:c3447d9da7414aa7c652b5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);