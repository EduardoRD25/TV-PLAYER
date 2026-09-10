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
// Puedes asignarle un código a esta pantalla (ej. "PANTALLA-SALA-01")
const SCREEN_CODE = localStorage.getItem("screen_code") || "PANTALLA-SALA-01";
localStorage.setItem("screen_code", SCREEN_CODE);

// Conexión en tiempo real con SignalR (.NET Hub)
// Cambia la URL cuando tu hermano tenga su Hub levantado (ej. http://localhost:5000/signageHub)
const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://192.168.1.9:5000/signageHub") 
  .withAutomaticReconnect([0, 2000, 5000, 10000])
  .build();

// Evento que emitirá .NET cuando el dueño actualice su menú
connection.on("UpdatePlaylist", (newPlaylist) => {
  console.log("Nueva lista recibida desde el backend:", newPlaylist);
  playlist = newPlaylist;
  localStorage.setItem('saved_playlist', JSON.stringify(newPlaylist));
  currentIndex = 0;
  startPlayer();
});

// Iniciar conexión y unirse al grupo de la pantalla
async function connectSignalR() {
  try {
    await connection.start();
    console.log("Conectado a SignalR");
    statusText.textContent = `Online (${SCREEN_CODE})`;
    statusText.className = "online";

    // Informar al backend a qué pantalla representamos
    await connection.invoke("JoinScreen", SCREEN_CODE);
  } catch (err) {
    console.error("Error conectando a SignalR:", err);
    statusText.textContent = "Offline (Local)";
    statusText.className = "offline";
    setTimeout(connectSignalR, 5000);
  }
}

connectSignalR();