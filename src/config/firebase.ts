import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBLYhEX2fu0YkG1AcW2y8KR4OO_w2LygP8",
  authDomain: "jpeg-bot.firebaseapp.com",
  projectId: "jpeg-bot",
  storageBucket: "jpeg-bot.firebasestorage.app",
  messagingSenderId: "31981050798",
  appId: "1:31981050798:web:9c4e3ede9d47a01524c63f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
