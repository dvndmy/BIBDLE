const SAINT_NAMES = [
  "St. Agnes",
  "St. Augustine",
  "St. Benedict",
  "St. Catherine",
  "St. Cecilia",
  "St. Clare",
  "St. Dominic",
  "St. Elizabeth",
  "St. Francis",
  "St. Gabriel",
  "St. Helena",
  "St. Ignatius",
  "St. Joan",
  "St. Joseph",
  "St. Jude",
  "St. Luke",
  "St. Lucy",
  "St. Mark",
  "St. Martha",
  "St. Matthew",
  "St. Monica",
  "St. Nicholas",
  "St. Patrick",
  "St. Paul",
  "St. Peter",
  "St. Rita",
  "St. Rose",
  "St. Sebastian",
  "St. Teresa",
  "St. Thomas",
];

const MAX_ROOM_PLAYERS = 200;
const MAX_ROUNDS = 1000;
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const FINAL_SCOREBOARD_MS = 5000;

export function calculateLocalRoundPoints(guessCount) {
  return Number.isInteger(guessCount) && guessCount >= 1 && guessCount <= 10
    ? 11 - guessCount
    : 0;
}

export function describeLocalGameError(action, error) {
  if (error?.code === "permission-denied" ||
    /missing or insufficient permissions/i.test(error?.message || "")) {
    return `${action} Firebase denied access. Deploy this project's firestore.rules, then enable Anonymous Authentication in Firebase Console.`;
  }
  if (error?.code === "auth/operation-not-allowed") {
    return `${action} Enable Anonymous Authentication in Firebase Console, or sign in before joining.`;
  }
  if (error?.code === "failed-precondition" && /index/i.test(error?.message || "")) {
    return `${action} Firestore needs an index. Deploy this project's firestore.indexes.json.`;
  }
  return `${action} ${error?.message || "Please try again."}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

function makeGuestName(uid) {
  let hash = 0;
  for (const character of uid) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return SAINT_NAMES[hash % SAINT_NAMES.length];
}

export function createLocalGameController({
  db,
  firestore,
  auth,
  verses,
  getUser,
  ensureGuestAuth,
  onRoundStart,
  onTimeExpired,
  onActiveChange,
  openModal,
  closeModal,
} = {}) {
  const {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
  } = firestore || {};
  const elements = {
    button: document.getElementById("localGameBtn"),
    modal: document.getElementById("localGameModal"),
    setup: document.getElementById("localGameSetup"),
    createForm: document.getElementById("createRoomForm"),
    roomNameInput: document.getElementById("roomNameInput"),
    visibility: document.getElementById("roomVisibility"),
    gameType: document.getElementById("roomGameType"),
    duration: document.getElementById("roomDuration"),
    customDuration: document.getElementById("customDuration"),
    rounds: document.getElementById("roomRounds"),
    joinForm: document.getElementById("joinRoomForm"),
    joinCode: document.getElementById("joinRoomCode"),
    guestName: document.getElementById("roomGuestName"),
    signIn: document.getElementById("roomSignInBtn"),
    browse: document.getElementById("browseRoomsBtn"),
    publicRooms: document.getElementById("publicRoomList"),
    roomView: document.getElementById("localRoomView"),
    roomTitle: document.getElementById("localRoomTitle"),
    roomName: document.getElementById("localGameName"),
    playerName: document.getElementById("roomGuestName"),
    roomStatus: document.getElementById("localRoomStatus"),
    inviteLink: document.getElementById("roomInviteLink"),
    qrCode: document.getElementById("roomQrCode"),
    copyLink: document.getElementById("copyRoomLinkBtn"),
    players: document.getElementById("roomPlayers"),
    leaderboard: document.getElementById("roomLeaderboard"),
    start: document.getElementById("startRoomGameBtn"),
    nextRound: document.getElementById("nextRoomRoundBtn"),
    finish: document.getElementById("finishRoomGameBtn"),
    leave: document.getElementById("leaveRoomBtn"),
    gameBar: document.getElementById("localGameBar"),
    gameName: document.getElementById("localGameName"),
    gameClock: document.getElementById("localGameClock"),
    gameScore: document.getElementById("localGameScore"),
    gameLeaderboard: document.getElementById("localGameLeaderboard"),
    gameRound: document.getElementById("localGameRound"),
    gameNextRound: document.getElementById("localGameNextRoundBtn"),
    gameRoom: document.getElementById("localGameRoomBtn"),
    gameLeave: document.getElementById("localGameLeaveBtn"),
    statusMessage: document.getElementById("roomActionStatus"),
  };
  const state = {
    roomId: "",
    room: null,
    players: [],
    player: null,
    roomUnsubscribe: null,
    playersUnsubscribe: null,
    clockInterval: null,
    lastRound: 0,
    readyRound: 0,
    timerExpired: false,
    finalRoom: null,
    finalPlayers: [],
    cleanupTimeout: null,
    finishing: false,
  };

  function isReady() {
    return !!(db && auth && collection && doc && getDoc && getDocs &&
      onSnapshot && query && runTransaction && setDoc && updateDoc && deleteDoc && where);
  }

  function isHost() {
    return !!state.room && state.room.hostUid === getUser()?.uid;
  }

  function isActive() {
    return !!state.roomId;
  }

  function setMessage(message, isError = false) {
    if (!elements.statusMessage) return;
    elements.statusMessage.textContent = message;
    elements.statusMessage.dataset.error = String(isError);
  }

  function reportError(action, error) {
    setMessage(describeLocalGameError(action, error), true);
  }

  function roomRef(roomId = state.roomId) {
    return doc(db, "localRooms", roomId);
  }

  function playersRef(roomId = state.roomId) {
    return collection(db, "localRooms", roomId, "players");
  }

  function playerRef(uid = getUser()?.uid, roomId = state.roomId) {
    return doc(db, "localRooms", roomId, "players", uid);
  }

  function renderLeaderboard() {
    const players = state.room?.status === "finished" ? state.finalPlayers : state.players;
    const sortedPlayers = [...players].sort((left, right) =>
      right.score - left.score || left.name.localeCompare(right.name),
    );
    let lastScore = null;
    let lastRank = 0;
    const markup = sortedPlayers.map((player, index) => {
      if (index === 0 || player.score !== lastScore) lastRank = index + 1;
      lastScore = player.score;
      return `
      <li class="room-leaderboard__row${player.uid === getUser()?.uid ? " is-you" : ""}${state.room?.status === "finished" ? " is-final" : ""}">
        <span class="room-leaderboard__rank">${lastRank}</span>
        <span class="room-leaderboard__name">${escapeHtml(player.name)}${player.uid === state.room?.hostUid ? " · Host" : ""}${player.uid === getUser()?.uid ? " · You" : ""}</span>
        <span class="room-leaderboard__score">${player.score} pts</span>
      </li>
      `;
    }).join("");
    [elements.leaderboard, elements.gameLeaderboard].forEach((list) => {
      if (list) list.innerHTML = markup || '<li class="room-empty">No players yet.</li>';
    });
    const roomPlayers = state.players.map((player) => `
      <li class="room-player">${escapeHtml(player.name)}${player.uid === state.room?.hostUid ? " <span>Host</span>" : ""}</li>
    `).join("");
    if (elements.players) {
      elements.players.innerHTML = roomPlayers || '<li class="room-empty">Waiting for players to join.</li>';
    }
    const everybodyFinished = state.players.length > 0 &&
      state.players.filter((player) => player.active !== false)
        .every((player) => player.roundCompleted && player.activeRound === state.room?.round);
    const hostFinished = state.players.some((player) =>
      player.uid === state.room?.hostUid &&
      player.activeRound === state.room?.round &&
      player.roundCompleted,
    );
    if (elements.nextRound) {
      elements.nextRound.disabled = !(everybodyFinished || hostFinished) ||
        state.room?.status !== "playing";
    }
    if (elements.gameNextRound) {
      elements.gameNextRound.hidden = !isHost() || state.room?.status !== "playing";
      elements.gameNextRound.disabled = !(everybodyFinished || hostFinished) ||
        state.room?.status !== "playing";
    }
    if (state.room?.gameType === "rounds" && state.room.round >= state.room.roundsTotal &&
      everybodyFinished && isHost()) {
      finishGame().catch((error) => reportError("Could not finish the game.", error));
    }
  }

  function renderRoom() {
    const room = state.room;
    if (!room) return;
    const inviteUrl = new URL(window.location.href);
    inviteUrl.search = "";
    inviteUrl.hash = "";
    inviteUrl.searchParams.set("room", state.roomId);
    elements.roomTitle.textContent = room.name;
    elements.inviteLink.value = inviteUrl.toString();
    elements.qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl.toString())}`;
    elements.qrCode.alt = `QR code to join ${room.name}`;
    elements.roomStatus.textContent = room.status === "lobby"
      ? `${room.gameType === "timed" ? `${room.durationMinutes} minute game` : `${room.roundsTotal} rounds`} · Waiting in lobby`
      : room.status === "finished"
        ? "Final scoreboard"
        : room.gameType === "rounds"
          ? `Round ${room.round} of ${room.roundsTotal}`
          : `Round ${room.round} · timed game`;
    elements.setup.hidden = true;
    elements.roomView.hidden = false;
    elements.start.hidden = !(isHost() && room.status === "lobby");
    elements.nextRound.hidden = !(isHost() && room.status === "playing");
    elements.finish.hidden = !(isHost() && room.status === "playing");
    elements.roomName.textContent = room.name;
    elements.gameBar.hidden = room.status === "lobby";
    elements.gameName.textContent = room.name;
    elements.gameRoom.hidden = false;
    elements.gameLeave.hidden = false;
    if (elements.gameRound) {
      elements.gameRound.textContent = room.status === "playing"
        ? room.gameType === "rounds"
          ? `Round ${room.round} of ${room.roundsTotal}`
          : `Round ${room.round}`
        : room.status === "finished" ? "Game finished" : "Waiting for host";
    }
    if (elements.gameScore) {
      const scoreboardPlayers = room.status === "finished" ? state.finalPlayers : state.players;
      const currentPlayer = scoreboardPlayers.find((player) => player.uid === getUser()?.uid);
      const rankedPlayers = [...scoreboardPlayers].sort((left, right) =>
        right.score - left.score || left.name.localeCompare(right.name),
      );
      const rank = currentPlayer
        ? rankedPlayers.findIndex((player) => player.score === currentPlayer.score) + 1
        : 0;
      elements.gameScore.textContent = room.status === "finished" && currentPlayer
        ? `${currentPlayer.score} pts · Rank ${rank}`
        : `${currentPlayer?.score ?? state.player?.score ?? 0} pts`;
    }
    const finalLabel = document.getElementById("localGameFinalLabel");
    if (finalLabel) {
      finalLabel.hidden = room.status !== "finished";
    }
    if (elements.gameLeave) {
      elements.gameLeave.textContent = room.status === "finished"
        ? "Close scoreboard"
        : "Leave room";
    }
    renderLeaderboard();
    updateClock();
    onActiveChange?.(isActive(), room.status);
  }

  function updateClock() {
    if (!state.room || !elements.gameClock) return;
    if (state.room.gameType !== "timed" || !state.room.deadlineAt ||
      state.room.status !== "playing") {
      elements.gameClock.textContent = "";
      return;
    }
    const remaining = Math.max(0, Math.ceil((state.room.deadlineAt - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = String(remaining % 60).padStart(2, "0");
    elements.gameClock.textContent = `${minutes}:${seconds}`;
    if (remaining === 0 && !state.timerExpired) {
      state.timerExpired = true;
      if (getUser()?.uid === state.room.hostUid) {
        finishGame().catch((error) => reportError("Could not finish the timed game.", error));
      }
      onTimeExpired?.();
    }
  }

  function subscribeToRoom() {
    state.roomUnsubscribe?.();
    state.playersUnsubscribe?.();
    window.clearInterval(state.clockInterval);
    state.roomUnsubscribe = onSnapshot(roomRef(), async (snapshot) => {
      if (!snapshot.exists()) {
        if (state.finalRoom) {
          state.room = state.finalRoom;
          state.players = state.finalPlayers;
          state.roomUnsubscribe?.();
          state.playersUnsubscribe?.();
          window.clearInterval(state.clockInterval);
          renderRoom();
          return;
        }
        setMessage("This room no longer exists.", true);
        leaveRoom(false);
        return;
      }
      const room = snapshot.data();
      const roundChanged = room.status === "playing" && room.round > 0 &&
        room.round !== state.lastRound;
      state.room = room;
      if (room.status === "finished") {
        state.finalRoom = room;
        state.finalPlayers = [...state.players];
      }
      if (roundChanged) {
        state.lastRound = room.round;
        const verse = verses.find((item) => item.id === room.verseId);
        if (!verse) {
          setMessage("This room's current puzzle could not be loaded.", true);
        } else {
          state.timerExpired = false;
          state.player = {
            ...state.player,
            activeRound: room.round,
            guesses: 0,
            roundCompleted: false,
            lastRoundScore: 0,
            lastCorrect: false,
            expiresAt: room.expiresAt || new Date(Date.now() + ROOM_TTL_MS),
          };
          try {
            await setDoc(playerRef(), {
              activeRound: room.round,
              guesses: 0,
              roundCompleted: false,
              lastRoundScore: 0,
              lastCorrect: false,
              expiresAt: room.expiresAt || new Date(Date.now() + ROOM_TTL_MS),
            }, { merge: true });
            state.readyRound = room.round;
            onRoundStart?.(verse, room);
          } catch (error) {
            reportError("Could not prepare your next round.", error);
          }
        }
      }
      renderRoom();
    }, (error) => reportError("Room sync failed.", error));
    state.playersUnsubscribe = onSnapshot(playersRef(), (snapshot) => {
      state.players = snapshot.docs.map((entry) => ({ uid: entry.id, ...entry.data() }));
      state.player = state.players.find((entry) => entry.uid === getUser()?.uid) || state.player;
      renderRoom();
    }, (error) => reportError("Leaderboard sync failed.", error));
    state.clockInterval = window.setInterval(updateClock, 1000);
  }

  async function joinRoom(roomId, requestedName = "") {
    if (!isReady()) throw new Error("Room service is unavailable. Please try again later.");
    const user = await ensureGuestAuth();
    const safeRoomId = roomId.trim();
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(safeRoomId)) {
      throw new Error("Enter a valid room link or room code.");
    }
    const roomDocument = roomRef(safeRoomId);
    const existingRef = doc(db, "localRooms", safeRoomId, "players", user.uid);
    const guestName = requestedName.trim() || makeGuestName(user.uid);
    const name = user.isAnonymous ? guestName : (user.displayName || guestName);
    let room;
    let player;
    await runTransaction(db, async (transaction) => {
      const [roomSnapshot, existing] = await Promise.all([
        transaction.get(roomDocument),
        transaction.get(existingRef),
      ]);
      if (!roomSnapshot.exists()) throw new Error("We couldn't find that room.");
      room = roomSnapshot.data();
      if (room.status === "finished") throw new Error("This game has already finished.");
      if (room.expiresAt &&
        (room.expiresAt.toMillis?.() ?? new Date(room.expiresAt).getTime()) <= Date.now()) {
        throw new Error("This room has expired.");
      }
      const prior = existing.exists() ? existing.data() : {};
      const alreadyActive = existing.exists() && prior.active !== false;
      if (!alreadyActive && (room.playerCount || 0) >= MAX_ROOM_PLAYERS) {
        throw new Error("This room has reached its 200-player limit.");
      }
      if (alreadyActive) {
        player = prior;
        return;
      }
      player = {
        uid: user.uid,
        name,
        score: Number.isFinite(prior.score) ? prior.score : 0,
        lastRoundScore: 0,
        guesses: 0,
        activeRound: 0,
        roundCompleted: false,
        active: true,
        lastCorrect: false,
        joinedAt: prior.joinedAt || serverTimestamp(),
        expiresAt: room.expiresAt || new Date(Date.now() + ROOM_TTL_MS),
      };
      transaction.set(existingRef, player, { merge: true });
      if (!alreadyActive) {
        transaction.update(roomDocument, { playerCount: (room.playerCount || 0) + 1 });
      }
    });
    state.roomId = safeRoomId;
    state.room = room;
    state.player = player;
    state.lastRound = room.status === "playing" && player.activeRound < room.round
      ? 0
      : room.status === "playing" ? room.round : 0;
    state.readyRound = player.activeRound === room.round ? room.round : 0;
    state.timerExpired = false;
    state.finalRoom = null;
    state.finalPlayers = [];
    subscribeToRoom();
    if (room.status === "playing" && state.lastRound === room.round) {
      const verse = verses.find((item) => item.id === room.verseId);
      if (verse) onRoundStart?.(verse, room);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("room", safeRoomId);
    window.history.replaceState({}, "", url);
    renderRoom();
  }

  async function createRoom(event) {
    event.preventDefault();
    try {
      if (!isReady()) throw new Error("Room service is unavailable. Please try again later.");
      const user = await ensureGuestAuth();
      const gameType = elements.gameType.value;
      const durationMinutes = elements.duration.value === "custom"
        ? Number(elements.customDuration.value)
        : Number(elements.duration.value);
      const roundsTotal = Number(elements.rounds.value);
      if (gameType === "timed" &&
        (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 240)) {
        throw new Error("Choose a game time from 1 to 240 minutes.");
      }
      if (gameType === "rounds" &&
        (!Number.isInteger(roundsTotal) || roundsTotal < 1 || roundsTotal > MAX_ROUNDS)) {
        throw new Error(`Choose between 1 and ${MAX_ROUNDS} rounds.`);
      }
      const roomDocument = doc(collection(db, "localRooms"));
      const roomId = roomDocument.id;
      if (!roomId) throw new Error("The room service did not create a room ID.");
      const guestName = elements.playerName.value.trim() || makeGuestName(user.uid);
      const playerName = user.isAnonymous ? guestName : (user.displayName || guestName);
      const room = {
        name: elements.roomNameInput.value.trim() || "BIBDLE room",
        visibility: elements.visibility.value,
        gameType,
        durationMinutes: gameType === "timed" ? durationMinutes : null,
        roundsTotal: gameType === "rounds" ? roundsTotal : null,
        maxPlayers: MAX_ROOM_PLAYERS,
        playerCount: 1,
        hostUid: user.uid,
        status: "lobby",
        round: 0,
        bookId: null,
        verseId: null,
        usedBookIds: [],
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + ROOM_TTL_MS),
      };
      const player = {
        uid: user.uid,
        name: playerName,
        score: 0,
        lastRoundScore: 0,
        guesses: 0,
        activeRound: 0,
        roundCompleted: false,
        active: true,
        lastCorrect: false,
        joinedAt: serverTimestamp(),
        expiresAt: room.expiresAt,
      };
      await runTransaction(db, async (transaction) => {
        transaction.set(roomDocument, room);
        transaction.set(doc(db, "localRooms", roomId, "players", user.uid), player);
      });
      state.roomId = roomId;
      state.room = room;
      state.player = player;
      state.lastRound = 0;
      state.readyRound = 0;
      subscribeToRoom();
      renderRoom();
      setMessage("Room created. Share the link or QR code to invite players.");
    } catch (error) {
      reportError("Could not create the room.", error);
    }
  }

  function chooseNextVerse(usedBookIds = []) {
    const unusedBookIds = [...new Set(verses.map((verse) => verse.bookId))]
      .filter((bookId) => !usedBookIds.includes(bookId));
    const bookIds = unusedBookIds.length
      ? unusedBookIds
      : [...new Set(verses.map((verse) => verse.bookId))];
    const bookId = bookIds[Math.floor(Math.random() * bookIds.length)];
    const candidates = verses.filter((verse) => verse.bookId === bookId);
    const verse = candidates[Math.floor(Math.random() * candidates.length)];
    return { verse, usedBookIds: [...usedBookIds.filter((id) => id !== bookId), bookId] };
  }

  async function startNextRound() {
    if (!isHost() || !state.room || state.room.status !== "playing" && state.room.status !== "lobby") {
      return;
    }
    const nextRound = state.room.round + 1;
    const { verse, usedBookIds } = chooseNextVerse(state.room.usedBookIds || []);
    const patch = {
      status: "playing",
      round: nextRound,
      bookId: verse.bookId,
      verseId: verse.id,
      usedBookIds,
    };
    if (state.room.gameType === "timed" && nextRound === 1) {
      patch.startedAt = Date.now();
      patch.deadlineAt = Date.now() + state.room.durationMinutes * 60_000;
    }
    if (state.room.gameType === "rounds" && nextRound > state.room.roundsTotal) {
      await finishGame();
      return;
    }
    await updateDoc(roomRef(), patch);
    setMessage(`Round ${nextRound} is starting.`);
  }

  async function deleteFinishedRoom(roomId, finalRoom) {
    if (!finalRoom || finalRoom.hostUid !== getUser()?.uid) return;
    const players = await getDocs(playersRef(roomId));
    await Promise.all(players.docs.map((player) =>
      deleteDoc(doc(db, "localRooms", roomId, "players", player.id)),
    ));
    await deleteDoc(roomRef(roomId));
  }

  async function finishGame() {
    if (!state.room || state.room.status === "finished" || state.finishing) return;
    if (!isHost()) return;
    state.finishing = true;
    try {
      await updateDoc(roomRef(), {
        status: "finished",
        finishedAt: serverTimestamp(),
        expiresAt: serverTimestamp(),
      });
      state.room = {
        ...state.room,
        status: "finished",
        finishedAt: new Date(),
        expiresAt: new Date(),
      };
      state.finalRoom = state.room;
      state.finalPlayers = [...state.players];
      renderRoom();
      setMessage("Game finished. View the final scoreboard.");
      window.clearTimeout(state.cleanupTimeout);
      const roomId = state.roomId;
      const finalRoom = state.finalRoom;
      state.cleanupTimeout = window.setTimeout(() => {
        deleteFinishedRoom(roomId, finalRoom).catch((error) =>
          reportError("The finished room could not be deleted yet.", error),
        );
      }, FINAL_SCOREBOARD_MS);
    } finally {
      state.finishing = false;
    }
  }

  async function recordGuess({ guessCount, completed, solved }) {
    if (!state.room || state.room.status !== "playing" ||
      state.readyRound !== state.room.round || state.timerExpired ||
      state.player?.roundCompleted) return;
    const points = completed && solved ? calculateLocalRoundPoints(guessCount) : 0;
    const previousScore = Number.isFinite(state.player?.score) ? state.player.score : 0;
    const lastRound = state.room.round;
    await setDoc(playerRef(), {
      guesses: guessCount,
      activeRound: lastRound,
      roundCompleted: completed,
      lastRoundScore: completed ? points : 0,
      lastCorrect: completed && solved,
      score: completed ? previousScore + points : previousScore,
      active: true,
      expiresAt: state.room.expiresAt || new Date(Date.now() + ROOM_TTL_MS),
    }, { merge: true });
    if (completed) {
      setMessage(solved
        ? `You earned ${points} point${points === 1 ? "" : "s"} this round.`
        : "No points this round. Wait for the host to start the next book.");
    }
  }

  async function leaveRoom(updatePlayer = true) {
    state.roomUnsubscribe?.();
    state.playersUnsubscribe?.();
    window.clearInterval(state.clockInterval);
    if (updatePlayer && state.roomId && getUser()?.uid &&
      state.room?.status !== "finished") {
      try {
        if (isHost()) {
          await finishGame();
        }
        await runTransaction(db, async (transaction) => {
          const roomReference = roomRef();
          const memberReference = playerRef();
          const [roomSnapshot, playerSnapshot] = await Promise.all([
            transaction.get(roomReference),
            transaction.get(memberReference),
          ]);
          if (playerSnapshot.exists() && playerSnapshot.data().active !== false) {
            transaction.set(memberReference, { active: false }, { merge: true });
            if (roomSnapshot.exists()) {
              const count = Math.max(0, (roomSnapshot.data().playerCount || 0) - 1);
              transaction.update(roomReference, { playerCount: count });
            }
          }
        });
      } catch (error) {
        reportError("Could not update your room status.", error);
      }
    }
    state.roomId = "";
    state.room = null;
    state.players = [];
    state.player = null;
    state.lastRound = 0;
    state.readyRound = 0;
    state.timerExpired = false;
    state.finalRoom = null;
    state.finalPlayers = [];
    state.finishing = false;
    elements.setup.hidden = false;
    elements.roomView.hidden = true;
    elements.gameBar.hidden = true;
    elements.gameRoom.hidden = true;
    elements.gameLeave.hidden = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url);
    onActiveChange?.(false);
  }

  async function browsePublicRooms() {
    try {
      if (!isReady()) throw new Error("Room service is unavailable.");
      const publicRooms = await getDocs(query(
        collection(db, "localRooms"),
        where("visibility", "==", "public"),
        where("status", "in", ["lobby", "playing"]),
        limit(30),
      ));
      elements.publicRooms.replaceChildren();
      const availableRooms = publicRooms.docs
        .map((entry) => ({ entry, room: entry.data() }))
        .filter(({ room }) => room.visibility === "public" &&
          (room.status === "lobby" || room.status === "playing") &&
          (!room.expiresAt || room.expiresAt.toMillis?.() > Date.now() ||
            new Date(room.expiresAt).getTime() > Date.now()));
      if (!availableRooms.length) {
        elements.publicRooms.textContent = "No public rooms are open right now.";
        return;
      }
      availableRooms.forEach(({ entry, room }) => {
        const item = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = `${room.name} · ${room.status === "lobby" ? "Lobby" : "In progress"}`;
        const joinButton = document.createElement("button");
        joinButton.type = "button";
        joinButton.className = "pill-btn";
        joinButton.textContent = "Join";
        joinButton.addEventListener("click", () => {
          joinRoom(entry.id, elements.guestName.value).catch((error) =>
            reportError("Could not join the room.", error),
          );
        });
        item.append(label, joinButton);
        elements.publicRooms.append(item);
      });
    } catch (error) {
      reportError("Could not load public rooms.", error);
    }
  }

  function handleCustomDuration() {
    elements.customDuration.hidden = elements.duration.value !== "custom";
    elements.customDuration.required = elements.duration.value === "custom";
  }

  function updateGameTypeSettings() {
    const timed = elements.gameType.value === "timed";
    document.getElementById("timedRoomSettings").hidden = !timed;
    document.getElementById("roundRoomSettings").hidden = timed;
  }

  function openRoomModal() {
    if (!isReady()) {
      setMessage("Room service is unavailable. Check your connection and try again.", true);
    }
    openModal?.("localGame", { trigger: elements.button });
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(elements.inviteLink.value);
      setMessage("Invite link copied.");
    } catch {
      elements.inviteLink.select();
      setMessage("Select and copy the invite link.");
    }
  }

  elements.button?.addEventListener("click", openRoomModal);
  elements.createForm?.addEventListener("submit", createRoom);
  elements.joinForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const typedRoom = elements.joinCode.value.trim();
    const roomId = typedRoom.includes("?")
      ? new URL(typedRoom).searchParams.get("room")
      : typedRoom.split("/").filter(Boolean).pop();
    if (!roomId) {
      setMessage("Enter the full room link or room code.", true);
      return;
    }
    joinRoom(roomId, elements.guestName.value).catch((error) =>
      reportError("Could not join the room.", error),
    );
  });
  elements.signIn?.addEventListener("click", () => {
    document.getElementById("signInBtn")?.click();
  });
  elements.browse?.addEventListener("click", browsePublicRooms);
  elements.duration?.addEventListener("change", handleCustomDuration);
  elements.gameType?.addEventListener("change", updateGameTypeSettings);
  elements.copyLink?.addEventListener("click", copyInviteLink);
  elements.start?.addEventListener("click", () => {
    startNextRound().catch((error) => reportError("Could not start the game.", error));
  });
  elements.nextRound?.addEventListener("click", () => {
    startNextRound().catch((error) => reportError("Could not start the next round.", error));
  });
  elements.gameNextRound?.addEventListener("click", () => {
    startNextRound().catch((error) => reportError("Could not start the next round.", error));
  });
  elements.finish?.addEventListener("click", () => {
    finishGame().catch((error) => reportError("Could not finish the game.", error));
  });
  [elements.leave, elements.gameLeave].forEach((button) =>
    button?.addEventListener("click", () => {
      leaveRoom().then(() => {
        closeModal?.("localGame");
        setMessage("You left the room.");
      });
    }),
  );
  elements.gameRoom?.addEventListener("click", openRoomModal);
  elements.qrCode?.addEventListener("error", () => {
    setMessage("The QR code could not load. Share the invite link instead.", true);
  });
  if (elements.customDuration) elements.customDuration.hidden = true;
  updateGameTypeSettings();

  const invitedRoomId = new URLSearchParams(window.location.search).get("room");
  if (invitedRoomId) {
    elements.joinCode.value = invitedRoomId;
    openModal?.("localGame", { trigger: elements.button });
  }

  return {
    isActive,
    describeError: describeLocalGameError,
    canGuess() {
      return !isActive() || !!state.room && state.room.status === "playing" &&
        state.readyRound === state.room.round && !state.timerExpired &&
        !state.player?.roundCompleted;
    },
    recordGuess,
    leaveRoom,
    setUser() {},
  };
}
