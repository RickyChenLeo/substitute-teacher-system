import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxj8EcmAAD5IOEG794JT1X0zsOrl4lEjE",
  authDomain: "school-9be11.firebaseapp.com",
  projectId: "school-9be11",
  storageBucket: "school-9be11.firebasestorage.app",
  messagingSenderId: "794428090559",
  appId: "1:794428090559:web:5bd6d409d30b10aa2bbe0a",
  measurementId: "G-Z9N87T8EH9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
