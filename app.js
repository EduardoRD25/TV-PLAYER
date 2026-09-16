// Registro de Service Worker para funcionamiento Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker activo'))
    .catch(err => console.error('Error en Service Worker:', err));
}

// Ocultar cursor en pantalla
let mouseTimer;
document.addEventListener('mousemove', () => {
  document.body.classList.remove('hide-cursor');
  clearTimeout(mouseTimer);
  mouseTimer = setTimeout(() => document.body.classList.add('hide-cursor'), 3000);
});

// Playlist inicial por defecto o recuperada de caché local
let playlist = JSON.parse(localStorage.getItem('saved_playlist')) || [
  { url: 'https://picsum.photos/id/1060/1920/1080', duration: 6000 },
  { url: 'https://picsum.photos/id/292/1920/1080', duration: 6000 },
  { url: 'https://picsum.photos/id/429/1920/1080', duration: 6000 }
];

let currentIndex = 0;
let loopTimer = null;
const container = document.getElementById('player');
const statusText = document.getElementById('status-text');

function renderSlides() {
  container.innerHTML = '';
  playlist.forEach((item, index) => {
    const img = document.createElement('img');
    img.src = item.url;
    img.className = `slide ${index === 0 ? 'active' : ''}`;
    container.appendChild(img);
  });
}

function nextSlide() {
  const slides = document.querySelectorAll('.slide');
  if (slides.length === 0) return;

  slides[currentIndex].classList.remove('active');
  currentIndex = (currentIndex + 1) % slides.length;
  slides[currentIndex].classList.add('active');

  const currentDuration = playlist[currentIndex].duration || 5000;
  loopTimer = setTimeout(nextSlide, currentDuration);
}

function startPlayer() {
  clearTimeout(loopTimer);
  renderSlides();
  if (playlist.length > 1) {
    loopTimer = setTimeout(nextSlide, playlist[0].duration || 5000);
  }
}

// Inicializar reproductor
startPlayer();

// --- CONFIGURACIÓN DE PANTALLA ---
// --- CONFIGURACIÓN DE PANTALLA ---
const SCREEN_CODE = localStorage.getItem("screen_code") || "PANTALLA-SALA-01";
localStorage.setItem("screen_code", SCREEN_CODE);

const API_BASE_URL = "http://192.168.1.10:5000";

// --- FUNCIÓN PARA OBTENER PLAYLIST DE LA BD (.NET) ---
async function fetchPlaylistFromBackend() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/Playlist/${SCREEN_CODE}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        console.log("Playlist cargada desde base de datos:", data);
        playlist = data;
        localStorage.setItem("saved_playlist", JSON.stringify(data));
        currentIndex = 0;
        startPlayer();
        return;
      }
    }
  } catch (err) {
    console.warn("No se pudo conectar al backend, usando caché local:", err);
  }

  // Si no hay respuesta o falla la red, recurre a lo que tenga en disco
  const cached = localStorage.getItem("saved_playlist");
  if (cached) {
    playlist = JSON.parse(cached);
    startPlayer();
  }
}

// --- CONEXIÓN SIGNALR ---
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${API_BASE_URL}/signageHub`)
  .withAutomaticReconnect([0, 2000, 5000, 10000])
  .build();

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
  } catch (err) {
    statusText.textContent = "Offline (Local)";
    statusText.className = "offline";
    setTimeout(connectSignalR, 5000);
  }
}

// Arrancar el visor: primero consulta la BD y luego abre el WebSocket
fetchPlaylistFromBackend();
connectSignalR();