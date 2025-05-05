// Firebase Configuration Template (DEV/PROD)
// Rename this file to 'firebase-config.js' and fill in your actual values
// Keep this file in .gitignore

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID // Optional
};

const initializeFirebase = () => {
  console.log('Firebase Config:', firebaseConfig); // Thêm log để kiểm tra cấu hình
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    return app; // Trả về Firebase App
  }
  return getApps()[0]; // Trả về Firebase App nếu đã khởi tạo
};

export { initializeFirebase, getDatabase };