// js/bp26-score.js
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js"
import { auth, db } from "../../auth/api/firebase-config.js";

const timestamp = Date.now();
const date = new Date(timestamp);
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const formattedDate = `${year}-${month}`

let CURRENT_UID = ""; 
let BP26_GAME = "bp26-Game1"; // default game (set this to whatever game title you need to)

// Get player's uid from auth
// Leaderboard name will be reteived in realtime
onAuthStateChanged(auth, async (user) => {
  if (user) {
      try {
        CURRENT_UID = user.uid;
      } catch (error) {
        console.error("unable to get user uid:", error);
      }
    }
});

// Create parent docs if they dont exist
async function ensureParentsUnderZatAm() {
  await Promise.all([
    setDoc(doc(db, "leaderboards", "Global"), { label: "Global" }, { merge: true }),
    setDoc(doc(db, "leaderboards", BP26_GAME), { label: BP26_GAME }, { merge: true })
  ]);
}

export function bp26Init({ game } = {}) {
  if (game) BP26_GAME = String(game);
  console.log("✅ BP26 INIT:", {game: BP26_GAME });
}

// Add a history record

async function addHistory(gameId, uid, score) {
  const batch = writeBatch(db);

  // leaderboards > gameId (ex: monopoly) > gameHistory > formattedDate (ex: 2026-06)
  const historyDoc = doc(db, "leaderboards", gameId, "gameHistory", formattedDate);
  // leaderboards > Global > gameHistory > formattedDate (ex: 2026-06)
  const globalHistoryDoc = doc(db, "leaderboards", "Global", "gameHistory", formattedDate);

  // timePlayed is in seconds
  const timePlayed = Math.floor((Date.now() - timestamp)/1000)

  // Format: (timestamp_uid_timePlayed: score)
  // Example: 1772577227972_LmXr2GQp35baaazy5H8us4GfN2a2_5: 0
  const entryKey = `${timestamp}_${uid}_${timePlayed}`
  const updateData = {
    entries: {
      [entryKey]: Number(score)
    }
  };
  const options = { merge: true };

  batch.set(historyDoc, updateData, options);
  batch.set(globalHistoryDoc, updateData, options);

  try {
    await batch.commit();
    console.log("All history records updated successfully!");
  } catch (error) {
    console.error("Error updating history: ", error);
  }

}

export async function reportScore(score) {
  if (!CURRENT_UID ) {
    console.warn("⚠️ player uid not set yet, cannot report score.");
    return;
  }

  const s = Number(score);
  if (!Number.isFinite(s)) throw new Error("Score must be a number."); // 0 allowed 

  const uid = CURRENT_UID;

  await ensureParentsUnderZatAm();

  // write history (so format matches Game1)
  await Promise.all([
    addHistory(BP26_GAME, uid, s),
  ]);

  console.log("🔥 SCORE SAVED:", { game: BP26_GAME, user: uid, score: s });
  return { ok: true };
}

// expose for non-module usage too
window.bp26Init = bp26Init;
window.reportScore = reportScore;
