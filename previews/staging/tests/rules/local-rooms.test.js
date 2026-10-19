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
    currentBookId: null,
    currentVerseId: null,
    usedBookIds: [],
    roundCompleted: false,
    gameCompleted: false,
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

  const legacyRoomId = "legacy-room-001";
  const legacyRoomPath = `localRooms/${legacyRoomId}`;
  const legacyCreatedAt = Timestamp.fromMillis(Date.now() - 1000);
  const legacyExpiry = Timestamp.fromMillis(
    legacyCreatedAt.toMillis() + 24 * 60 * 60 * 1000,
  );
  await environment.withSecurityRulesDisabled(async (context) => {
    const legacyDb = context.firestore();
    await setDoc(doc(legacyDb, legacyRoomPath), {
      name: "Legacy Room",
      visibility: "link",
      gameType: "rounds",
      durationMinutes: null,
      roundsTotal: 3,
      maxPlayers: 200,
      playerCount: 0,
      hostUid: "host-user",
      status: "lobby",
      round: 0,
      bookId: null,
      verseId: null,
      usedBookIds: [],
      createdAt: legacyCreatedAt,
    });
    await setDoc(doc(legacyDb, `${legacyRoomPath}/players/host-user`), player(
      "host-user",
      { active: false, joinedAt: legacyCreatedAt, expiresAt: legacyCreatedAt },
    ));
  });

  const legacyRejoin = writeBatch(host);
  legacyRejoin.set(doc(host, `${legacyRoomPath}/players/host-user`), player(
    "host-user",
    { active: true, joinedAt: legacyCreatedAt, expiresAt: legacyExpiry },
  ), { merge: true });
  legacyRejoin.update(doc(host, legacyRoomPath), {
    playerCount: 1,
    expiresAt: legacyExpiry,
  });
  await assertSucceeds(legacyRejoin.commit());
  await assertFails(updateDoc(doc(host, legacyRoomPath), {
    expiresAt: Timestamp.fromMillis(legacyExpiry.toMillis() + 60 * 60 * 1000),
  }));

  const legacyStartId = "legacy-start-001";
  const legacyStartPath = `localRooms/${legacyStartId}`;
  const legacyStartCreatedAt = Timestamp.fromMillis(Date.now() - 1000);
  const legacyStartExpiry = Timestamp.fromMillis(
    legacyStartCreatedAt.toMillis() + 24 * 60 * 60 * 1000,
  );
  await environment.withSecurityRulesDisabled(async (context) => {
    const legacyDb = context.firestore();
    await setDoc(doc(legacyDb, legacyStartPath), {
      name: "Legacy Start Room",
      visibility: "link",
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
      createdAt: legacyStartCreatedAt,
    });
    await setDoc(doc(legacyDb, `${legacyStartPath}/players/host-user`), player(
      "host-user",
      { joinedAt: legacyStartCreatedAt, expiresAt: legacyStartCreatedAt },
    ));
  });
  await assertSucceeds(updateDoc(doc(host, legacyStartPath), {
    status: "playing",
    expiresAt: legacyStartExpiry,
  }));
  await assertSucceeds(updateDoc(doc(host, `${legacyStartPath}/players/host-user`), {
    currentBookId: "genesis",
    currentVerseId: "verse-genesis",
    usedBookIds: ["genesis"],
    activeRound: 1,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    gameCompleted: false,
    expiresAt: legacyStartExpiry,
  }));

  const timedRoomPath = "localRooms/timed-start-001";
  await environment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, timedRoomPath), {
      name: "Timed Start Room",
      visibility: "link",
      gameType: "timed",
      durationMinutes: 2,
      roundsTotal: null,
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
    await setDoc(doc(adminDb, `${timedRoomPath}/players/host-user`), player("host-user"));
  });
  const timedStartedAt = Date.now();
  await assertSucceeds(updateDoc(doc(host, timedRoomPath), {
    status: "playing",
    startedAt: timedStartedAt,
    deadlineAt: timedStartedAt + 2 * 60 * 1000,
  }));

  const legacySharedPath = "localRooms/legacy-shared-001";
  await environment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, legacySharedPath), {
      name: "Legacy Shared Room",
      visibility: "link",
      gameType: "rounds",
      durationMinutes: null,
      roundsTotal: 3,
      maxPlayers: 200,
      playerCount: 1,
      hostUid: "host-user",
      status: "playing",
      round: 1,
      bookId: "genesis",
      verseId: "verse-genesis",
      usedBookIds: ["genesis"],
      createdAt: serverTimestamp(),
      expiresAt,
    });
    await setDoc(doc(adminDb, `${legacySharedPath}/players/host-user`), {
      uid: "host-user",
      name: "St. host-user",
      score: 0,
      lastRoundScore: 0,
      guesses: 0,
      activeRound: 1,
      roundCompleted: false,
      active: true,
      lastCorrect: false,
      joinedAt: serverTimestamp(),
      expiresAt,
    });
  });
  await assertSucceeds(updateDoc(doc(host, `${legacySharedPath}/players/host-user`), {
    currentBookId: "genesis",
    currentVerseId: "verse-genesis",
    usedBookIds: ["genesis"],
    gameCompleted: false,
  }));

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

  const leaveLobby = writeBatch(guest);
  leaveLobby.update(guestPlayer, { active: false });
  leaveLobby.update(doc(guest, roomPath), { playerCount: 1 });
  await assertSucceeds(leaveLobby.commit());

  const priorGuest = (await getDoc(guestPlayer)).data();
  const rejoinLobby = writeBatch(guest);
  rejoinLobby.set(guestPlayer, {
    ...priorGuest,
    active: true,
    activeRound: 0,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    expiresAt,
  }, { merge: true });
  rejoinLobby.update(doc(guest, roomPath), { playerCount: 2 });
  await assertSucceeds(rejoinLobby.commit());

  await assertSucceeds(updateDoc(hostRoom, {
    status: "playing",
  }));
  await assertSucceeds(updateDoc(hostPlayer, {
    currentBookId: "genesis",
    currentVerseId: "verse-genesis-host",
    usedBookIds: ["genesis"],
    activeRound: 1,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    gameCompleted: false,
    expiresAt,
  }));
  await assertSucceeds(updateDoc(guestPlayer, {
    currentBookId: "exodus",
    currentVerseId: "verse-exodus-guest",
    usedBookIds: ["exodus"],
    activeRound: 1,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    gameCompleted: false,
    expiresAt,
  }));
  assert.notEqual(
    (await getDoc(hostPlayer)).data().currentVerseId,
    (await getDoc(guestPlayer)).data().currentVerseId,
  );
  await assertFails(updateDoc(guestPlayer, {
    guesses: 1,
    active: false,
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
    gameCompleted: false,
    active: true,
    expiresAt,
  }, { merge: true }));
  assert.equal((await getDoc(hostPlayer)).data().roundCompleted, false);
  assert.equal((await getDoc(hostRoom)).data().round, 0);

  await assertSucceeds(updateDoc(guestPlayer, {
    currentBookId: "john",
    currentVerseId: "verse-john-guest",
    usedBookIds: ["exodus", "john"],
    activeRound: 2,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    gameCompleted: false,
  }));
  await assertSucceeds(updateDoc(guestPlayer, {
    guesses: 2,
    roundCompleted: true,
    lastRoundScore: 9,
    lastCorrect: true,
    score: 17,
  }));
  await assertSucceeds(updateDoc(guestPlayer, {
    currentBookId: "luke",
    currentVerseId: "verse-luke-guest",
    usedBookIds: ["exodus", "john", "luke"],
    activeRound: 3,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    gameCompleted: false,
  }));
  await assertSucceeds(updateDoc(guestPlayer, {
    guesses: 3,
    roundCompleted: true,
    lastRoundScore: 0,
    lastCorrect: false,
    score: 17,
    gameCompleted: true,
  }));
  await assertFails(updateDoc(guestPlayer, {
    currentBookId: "mark",
    currentVerseId: "verse-mark-guest",
    usedBookIds: ["exodus", "john", "luke", "mark"],
    activeRound: 4,
  }));

  const lateJoin = writeBatch(lateGuest);
  lateJoin.set(doc(lateGuest, `${roomPath}/players/late-user`), player("late-user"));
  lateJoin.update(doc(lateGuest, roomPath), { playerCount: 3 });
  await assertSucceeds(lateJoin.commit());
  await assertSucceeds(updateDoc(doc(lateGuest, `${roomPath}/players/late-user`), {
    currentBookId: "john",
    currentVerseId: "verse-john-late",
    usedBookIds: ["john"],
    activeRound: 1,
    guesses: 0,
    roundCompleted: false,
    lastRoundScore: 0,
    lastCorrect: false,
    gameCompleted: false,
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
