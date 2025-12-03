// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "vingo-food-delivery-7afc3.firebaseapp.com",
  projectId: "vingo-food-delivery-7afc3",
  storageBucket: "vingo-food-delivery-7afc3.firebasestorage.app",
  messagingSenderId: "300724219465",
  appId: "1:300724219465:web:a9f89e6c2b45a5d3719998"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth =getAuth(app)
export {app,auth}