// Detectar automáticamente si corre en la laptop o en la TV Box
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "http://192.168.1.10:5000";

// Elementos del DOM
const pairingScreen = document.getElementById("pairing-screen");
const pairingCodeDisplay = document.getElementById("pairing-code-display");
const statusText = document.getElementById("status-text");
const slideA = document.getElementById("slide-a");
const slideB = document.getElementById("slide-b");

// Estado del reproductor
let playlist = [];
let currentIndex = 0;
let slideTimer = null;
let activeSlideElement = slideA;

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

// 3. Control estricto de temporizadores
function clearCurrentTimer() {
  if (slideTimer) {
    clearTimeout(slideTimer);
    slideTimer = null;
  }
}

// 4. Lógica del Carrusel con Pre-carga Suave
function startPlayer() {
  clearCurrentTimer();
  if (!playlist || playlist.length === 0) return;

  if (currentIndex >= playlist.length) {
    currentIndex = 0;
  }

  const currentItem = playlist[currentIndex];
  activeSlideElement.src = currentItem.url;
  activeSlideElement.classList.add("active");

  const duration = currentItem.duration || 5000;
  scheduleNextSlide(duration);
}

function scheduleNextSlide(duration) {
  clearCurrentTimer();

  slideTimer = setTimeout(() => {
    currentIndex = (currentIndex + 1) % playlist.length;
    const nextItem = playlist[currentIndex];

    const incomingElement = activeSlideElement === slideA ? slideB : slideA;
    const outgoingElement = activeSlideElement;

    const imgLoader = new Image();
    imgLoader.onload = () => {
      incomingElement.src = nextItem.url;
      incomingElement.classList.add("active");
      outgoingElement.classList.remove("active");
      activeSlideElement = incomingElement;

      // Programar la duración específica del nuevo slide
      const nextDuration = nextItem.duration || 5000;
      scheduleNextSlide(nextDuration);
    };

    imgLoader.onerror = () => {
      console.warn("Error cargando imagen:", nextItem.url);
      scheduleNextSlide(3000);
    };

    imgLoader.src = nextItem.url;
  }, duration);
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

// Variable para el temporizador de heartbeat
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
  }, 25000); // Cada 25 segundos
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

// 6. Cargar lista guardada en SQLite
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