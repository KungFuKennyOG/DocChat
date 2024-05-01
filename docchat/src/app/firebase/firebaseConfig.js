import { initializeApp } from "firebase/app";
import firebase from 'firebase/app';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBq5t9db1KTTj7Qm4Jo5gOnZgNBcESKYPo",
  authDomain: "docchat-23226.firebaseapp.com",
  projectId: "docchat-23226",
  storageBucket: "docchat-23226.appspot.com",
  messagingSenderId: "1060111714628",
  appId: "1:1060111714628:web:e440a1d1359cf58556af11",
};

const app = initializeApp(firebaseConfig);
  
const db = getFirestore(app);

export { db };