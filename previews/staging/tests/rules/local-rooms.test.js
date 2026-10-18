import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

const rules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
const environment = await initializeTestEnvironment({
  projectId: "demo-bibdle-local-games",
  firestore: { rules },
});
const roomId = "test-room-001";
const roomPath = `localRooms/${roomId}`;
const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

function player(uid, values = {}) {
  return {
    uid,
    name: `St. ${uid}`,
    score: 0,
    lastRoundScore: 0,
    guesses: 0,
    activeRound: 0,
    roundCompleted: false,
    active: true,
    lastCorrect: false,
    joinedAt: serverTimestamp(),
    expiresAt,
    ...values,
  };
}

test("room creation, lobby and mid-game joins, scoring, listing, and host cleanup", async () => {
  const host = environment.authenticatedContext("host-user").firestore();
  const guest = environment.authenticatedContext("guest-user").firestore();
  const lateGuest = environment.authenticatedContext("late-user").firestore();
  const outsider = environment.authenticatedContext("outsider-user").firestore();
  const hostRoom = doc(host, roomPath);
  const hostPlayer = doc(host, `${roomPath}/players/host-user`);
  const guestPlayer = doc(guest, `${roomPath}/players/guest-user`);
  const batch = writeBatch(host);

  batch.set(hostRoom, {
    name: "Rule Test",
    visibility: "public",
    gameType: "rounds",
    durationMinutes: null,
    roundsTotal: 3,
    maxPlayers: 200,
    playerCount: 1,
    hostUid: "host-user",
    status: "lobby",
    round: 0,
    bookId: null,
    verseId: null,
    usedBookIds: [],
    createdAt: serverTimestamp(),
    expiresAt,
  });
  batch.set(hostPlayer, player("host-user"));
  await assertSucceeds(batch.commit());

  const lobbyJoin = writeBatch(guest);
  lobbyJoin.set(guestPlayer, player("guest-user"));
  lobbyJoin.update(doc(guest, roomPath), { playerCount: 2 });
  await assertSucceeds(lobbyJoin.commit());

  await assertSucceeds(updateDoc(hostRoom, {
    status: "playing",
    round: 1,
    bookId: "genesis",
    verseId: "verse-genesis",
    usedBookIds: ["genesis"],
  }));
  await assertSucceeds(updateDoc(hostPlayer, {
    activeRound: 1,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    expiresAt,
  }));
  await assertSucceeds(updateDoc(guestPlayer, {
    activeRound: 1,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    expiresAt,
  }));

  await assertSucceeds(setDoc(guestPlayer, {
    guesses: 1,
    activeRound: 1,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    score: 0,
    active: true,
    expiresAt,
  }, { merge: true }));
  await assertSucceeds(setDoc(guestPlayer, {
    guesses: 3,
    activeRound: 1,
    roundCompleted: true,
    lastRoundScore: 8,
    lastCorrect: true,
    score: 8,
    active: true,
    expiresAt,
  }, { merge: true }));

  const lateJoin = writeBatch(lateGuest);
  lateJoin.set(doc(lateGuest, `${roomPath}/players/late-user`), player("late-user"));
  lateJoin.update(doc(lateGuest, roomPath), { playerCount: 3 });
  await assertSucceeds(lateJoin.commit());
  await assertSucceeds(updateDoc(doc(lateGuest, `${roomPath}/players/late-user`), {
    activeRound: 1,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    expiresAt,
  }));

  const publicRooms = await assertSucceeds(getDocs(query(
    collection(guest, "localRooms"),
    where("visibility", "==", "public"),
    where("status", "in", ["lobby", "playing"]),
  )));
  assert.equal(publicRooms.size, 1);
  await assertFails(getDocs(collection(outsider, "localRooms")));
  await assertFails(updateDoc(doc(outsider, roomPath), { playerCount: 999 }));
  await assertFails(getDoc(doc(outsider, `${roomPath}/players/guest-user`)));

  await assertSucceeds(updateDoc(hostRoom, {
    status: "finished",
    finishedAt: serverTimestamp(),
    expiresAt: serverTimestamp(),
  }));
  const finalPlayers = await assertSucceeds(getDocs(collection(host, `${roomPath}/players`)));
  await Promise.all(finalPlayers.docs.map((entry) =>
    assertSucceeds(deleteDoc(doc(host, `${roomPath}/players/${entry.id}`))),
  ));
  await assertSucceeds(deleteDoc(hostRoom));
  assert.equal((await getDoc(hostRoom)).exists(), false);
});

after(async () => {
  await environment.cleanup();
});
