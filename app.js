// Detectar automáticamente si corre en la laptop o en la TV Box
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "http://192.168.1.10:5000";

// Elementos del DOM
const pairingScreen = document.getElementById("pairing-screen");
const pairingCodeDisplay = document.getElementById("pairing-code-display");
const statusText = document.getElementById("status-text");

// Referencias a los elementos multimedia (Capas A y B)
const imgA = document.getElementById("slide-img-a");
const vidA = document.getElementById("slide-vid-a");
const imgB = document.getElementById("slide-img-b");
const vidB = document.getElementById("slide-vid-b");

// Estado del reproductor
let playlist = [];
let currentIndex = 0;
let slideTimer = null;
let currentLayer = "A";

// 1. Obtener o generar código único de pantalla
let SCREEN_CODE = localStorage.getItem("screen_code");
let IS_PAIRED = localStorage.getItem("is_paired") === "true";

if (!SCREEN_CODE) {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  SCREEN_CODE = `TV-${randomDigits}`;
  localStorage.setItem("screen_code", SCREEN_CODE);
}

// 2. Controlar la vista de vinculación
function checkPairingState() {
  if (!IS_PAIRED) {
    pairingCodeDisplay.textContent = SCREEN_CODE;
    pairingScreen.classList.remove("hidden");
  } else {
    pairingScreen.classList.add("hidden");
  }
}

// 3. Utilidades multimedia y temporizadores
function isVideoUrl(url) {
  if (!url) return false;
  return url.endsWith(".mp4") || url.endsWith(".webm");
}

function clearCurrentTimer() {
  if (slideTimer) {
    clearTimeout(slideTimer);
    slideTimer = null;
  }
}

function stopAllVideos() {
  [vidA, vidB].forEach((v) => {
    if (v) {
      v.pause();
      v.currentTime = 0;
      v.onended = null;
      v.removeAttribute("src");
      v.load();
    }
  });
}

function clearAllMedia() {
  clearCurrentTimer();
  stopAllVideos();
  [imgA, imgB, vidA, vidB].forEach((el) => {
    if (el) {
      el.classList.remove("active");
      if (el.tagName === "IMG") el.src = "";
    }
  });
}

// 4. Lógica de renderizado y transiciones (Capas A/B)
function renderItem(layer, item, onReady) {
  const isVid = isVideoUrl(item.url);
  const imgElem = layer === "A" ? imgA : imgB;
  const vidElem = layer === "A" ? vidA : vidB;

  if (isVid) {
    imgElem.classList.remove("active");
    vidElem.src = item.url;
    vidElem.load();

    vidElem.oncanplay = () => {
      vidElem.oncanplay = null;
      onReady(vidElem);
    };
    vidElem.onerror = () => {
      console.warn("Error cargando video:", item.url);
      scheduleNextSlide(3000);
    };
  } else {
    vidElem.classList.remove("active");
    const loader = new Image();
    loader.onload = () => {
      imgElem.src = item.url;
      onReady(imgElem);
    };
    loader.onerror = () => {
      console.warn("Error cargando imagen:", item.url);
      scheduleNextSlide(3000);
    };
    loader.src = item.url;
  }
}

function scheduleNextSlide(duration) {
  clearCurrentTimer();
  slideTimer = setTimeout(() => {
    advanceSlide();
  }, duration);
}

function startPlayer() {
  clearCurrentTimer();
  stopAllVideos();
  if (!playlist || playlist.length === 0) return;

  if (currentIndex >= playlist.length) currentIndex = 0;
  const currentItem = playlist[currentIndex];

  renderItem(currentLayer, currentItem, (activeElem) => {
    activeElem.classList.add("active");

    if (isVideoUrl(currentItem.url)) {
      activeElem.play().catch((e) => console.warn("Autoplay bloqueado:", e));
      activeElem.onended = () => advanceSlide();
    } else {
      scheduleNextSlide(currentItem.duration || 5000);
    }
  });
}

function advanceSlide() {
  clearCurrentTimer();
  currentIndex = (currentIndex + 1) % playlist.length;
  const nextItem = playlist[currentIndex];
  const nextLayer = currentLayer === "A" ? "B" : "A";

  renderItem(nextLayer, nextItem, (incomingElem) => {
    // Apagar la capa saliente
    const outgoingImg = currentLayer === "A" ? imgA : imgB;
    const outgoingVid = currentLayer === "A" ? vidA : vidB;
    outgoingImg.classList.remove("active");
    outgoingVid.classList.remove("active");
    outgoingVid.pause();

    // Activar capa entrante
    incomingElem.classList.add("active");
    currentLayer = nextLayer;

    if (isVideoUrl(nextItem.url)) {
      incomingElem.play().catch((e) => console.warn("Autoplay bloqueado:", e));
      incomingElem.onended = () => advanceSlide();
    } else {
      scheduleNextSlide(nextItem.duration || 5000);
    }
  });
}

// 5. Conexión SignalR (.NET)
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${API_BASE_URL}/signageHub`)
  .withAutomaticReconnect([0, 2000, 5000, 10000])
  .build();

connection.on("ScreenPaired", (data) => {
  console.log("Pantalla vinculada exitosamente:", data);
  IS_PAIRED = true;
  localStorage.setItem("is_paired", "true");
  pairingScreen.classList.add("hidden");
  fetchPlaylistFromBackend();
});

connection.on("UpdatePlaylist", (newPlaylist) => {
  console.log("Nueva lista recibida en tiempo real:", newPlaylist);
  clearCurrentTimer();
  playlist = newPlaylist;
  localStorage.setItem("saved_playlist", JSON.stringify(newPlaylist));
  currentIndex = 0;
  startPlayer();
});

connection.on("ReceiveCommand", (action) => {
  console.log("Comando remoto recibido:", action);
  if (action === "reload") {
    window.location.reload();
  } else if (action === "clear") {
    localStorage.removeItem("saved_playlist");
    playlist = [];
    clearAllMedia();
  }
});

let heartbeatTimer = null;

function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(async () => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      try {
        await connection.invoke("SendHeartbeat", SCREEN_CODE);
      } catch (err) {
        console.warn("Fallo al enviar heartbeat:", err);
      }
    }
  }, 25000);
}

async function connectSignalR() {
  try {
    await connection.start();
    statusText.textContent = `Online (${SCREEN_CODE})`;
    statusText.className = "online";

    await connection.invoke("JoinScreen", SCREEN_CODE);
    startHeartbeat();

    await fetch(`${API_BASE_URL}/api/Screens/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: SCREEN_CODE })
    });
  } catch (err) {
    statusText.textContent = "Offline (Local)";
    statusText.className = "offline";
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    setTimeout(connectSignalR, 5000);
  }
}

// 6. Cargar lista guardada en backend o local
async function fetchPlaylistFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/Playlist/${SCREEN_CODE}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        playlist = data;
        localStorage.setItem("saved_playlist", JSON.stringify(data));
        currentIndex = 0;
        startPlayer();
        return;
      }
    }
  } catch (e) {
    console.warn("Sin conexión con el backend, intentando caché local.");
  }

  const cached = localStorage.getItem("saved_playlist");
  if (cached) {
    playlist = JSON.parse(cached);
    currentIndex = 0;
    startPlayer();
  }
}

// Inicialización
checkPairingState();
connectSignalR();
if (IS_PAIRED) {
  fetchPlaylistFromBackend();
}