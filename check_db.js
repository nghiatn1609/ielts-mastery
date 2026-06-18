import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = {
  projectId: "ielts-mastery-394f4", // from .firebaserc?
};
// I need the actual firebase config.
// Let's use firebase admin instead
