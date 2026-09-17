const API_BASE_URL = "http://192.168.1.10:5000";

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

// 3. Lógica del Carrusel con Pre-carga Suave
function startPlayer() {
  if (slideTimer) clearTimeout(slideTimer);
  if (!playlist || playlist.length === 0) return;

  const currentItem = playlist[currentIndex];
  activeSlideElement.src = currentItem.url;
  activeSlideElement.classList.add("active");

  scheduleNextSlide(currentItem.duration || 5000);
}

function scheduleNextSlide(duration) {
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
      scheduleNextSlide(nextItem.duration || 5000);
    };
    imgLoader.onerror = () => {
      console.warn("Error cargando imagen:", nextItem.url);
      scheduleNextSlide(2000);
    };
    imgLoader.src = nextItem.url;
  }, duration);
}

// 4. Conexión SignalR (.NET)
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
  playlist = newPlaylist;
  localStorage.setItem("saved_playlist", JSON.stringify(newPlaylist));
  currentIndex = 0;
  startPlayer();
});

async function connectSignalR() {
  try {
    await connection.start();
    statusText.textContent = `Online (${SCREEN_CODE})`;
    statusText.className = "online";

    await connection.invoke("JoinScreen", SCREEN_CODE);

    // Iniciar el envío periódico de latidos
    startHeartbeat();

    // Registrar en BD si está pendiente
    await fetch(`${API_BASE_URL}/api/Screens/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: SCREEN_CODE })
    });
  } catch (err) {
    statusText.textContent = "Offline (Local)";
    statusText.className = "offline";
    setTimeout(connectSignalR, 5000);
  }
}

// 5. Cargar lista guardada en SQLite
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

// Inicialización
checkPairingState();
connectSignalR();
if (IS_PAIRED) {
  fetchPlaylistFromBackend();
}