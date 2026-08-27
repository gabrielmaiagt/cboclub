"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";

/**
 * SDK cliente do Firebase.
 *
 * As chaves abaixo sao publicas por design: identificam o projeto, nao
 * autenticam ninguem. Quem protege os dados sao as Security Rules e o
 * App Check — nunca o segredo dessas strings.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

let emulatorsConnected = false;

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function firebaseAuth(): Auth {
  const auth = getAuth(firebaseApp());
  if (useEmulator && !emulatorsConnected) {
    connectEmulators();
  }
  return auth;
}

export function firebaseDb(): Firestore {
  const db = getFirestore(firebaseApp());
  if (useEmulator && !emulatorsConnected) {
    connectEmulators();
  }
  return db;
}

export function firebaseStorage(): FirebaseStorage {
  return getStorage(firebaseApp());
}

function connectEmulators() {
  if (emulatorsConnected) return;
  emulatorsConnected = true;
  const app = firebaseApp();
  connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(getFirestore(app), "127.0.0.1", 8080);
  connectStorageEmulator(getStorage(app), "127.0.0.1", 9199);
}

/** Mantem o login entre recarregamentos da pagina. */
export async function ensureAuthPersistence(): Promise<Auth> {
  const auth = firebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  return auth;
}
