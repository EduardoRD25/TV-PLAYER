//Este archivo se encargará de hablar con tu backend .NET

// Usa la IP de tu laptop para que funcione tanto en tu PC como si abres el panel desde tu celular
const BASE_URL = "http://192.168.1.10:5000/api";

export const api = {
  // 1. Obtener todas las pantallas
  getScreens: async () => {
    const res = await fetch(`${BASE_URL}/Screens`);
    if (!res.ok) throw new Error("Error al obtener pantallas");
    return await res.json();
  },

  // 2. Vincular pantalla por código
  pairScreen: async (code, name) => {
    const res = await fetch(`${BASE_URL}/Screens/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name })
    });
    if (!res.ok) throw new Error("Código no encontrado o inválido");
    return await res.json();
  },

  // 3. Subir archivo de imagen física
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/Media/upload`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Error al subir archivo");
    return await res.json();
  },

  // 4. Obtener slides de una pantalla específica
  getPlaylist: async (screenCode) => {
    const res = await fetch(`${BASE_URL}/Playlist/${screenCode}`);
    if (!res.ok) throw new Error("Error al cargar playlist");
    return await res.json();
  },

  // 5. Guardar y publicar playlist en tiempo real
  savePlaylist: async (screenCode, slides) => {
    const res = await fetch(`${BASE_URL}/Playlist/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenCode, slides })
    });
    if (!res.ok) throw new Error("Error al publicar cambios");
    return await res.json();
  },

  // Eliminar una pantalla de la BD
  deleteScreen: async (code) => {
    const res = await fetch(`${BASE_URL}/Screens/${code}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Error al eliminar pantalla");
    return await res.json();
  },

  // Enviar comando remoto (recargar visor)
  sendCommand: async (screenCode, action) => {
    // Reutilizamos el endpoint o invocamos vía fetch/SignalR
    // En este caso lo conectamos vía Hub o endpoint ligero
  }
  
};