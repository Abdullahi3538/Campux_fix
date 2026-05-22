import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxwN5xfB-K7qBnch_Fyug_ht-7480_p7o",
  authDomain: "campusfix-d69ec.firebaseapp.com",
  projectId: "campusfix-d69ec",
  storageBucket: "campusfix-d69ec.firebasestorage.app",
  messagingSenderId: "111577172143",
  appId: "1:111577172143:web:d6ba0924a051ec132bec5a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);