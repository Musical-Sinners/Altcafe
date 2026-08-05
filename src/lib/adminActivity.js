import { addDoc, collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

export async function recordAdminActivity({ action, title, detail = "", targetType = "", targetId = "", meta = {} }) {
  await addDoc(collection(db, "admin_activity"), {
    action,
    title,
    detail,
    targetType,
    targetId,
    meta,
    created_at: new Date().toISOString(),
  });
}

export function listenToAdminActivity(callback) {
  return onSnapshot(
    query(collection(db, "admin_activity"), orderBy("created_at", "desc"), limit(12)),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  );
}