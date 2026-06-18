import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ielts-mastery-b0414",
  appId: "1:703825467358:web:466d9befada49e6df26f4f",
  storageBucket: "ielts-mastery-b0414.firebasestorage.app",
  apiKey: "AIzaSyCWIXYE2P0APiykKHKOGzsMI6mbBhdao2M",
  authDomain: "ielts-mastery-b0414.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clean() {
  const testsRef = collection(db, "tests");
  const snapshot = await getDocs(testsRef);
  let deleted = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.type === 'LISTENING' && data.audioUrl && data.audioUrl.startsWith('/uploads/')) {
      await deleteDoc(doc(db, "tests", docSnap.id));
      console.log("Deleted broken test:", data.title);
      deleted++;
    }
  }
  console.log("Total deleted:", deleted);
}
clean().catch(console.error);
