import React, { useState, useEffect } from "react";
import { api } from "./api";
import { Tv, Plus, Upload, Trash2, CheckCircle2 } from "lucide-react";
import "./App.css";

function App() {
  const [screens, setScreens] = useState([]);
  const [selectedScreen, setSelectedScreen] = useState(null);
  const [slides, setSlides] = useState([]);
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [pairName, setPairName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Cargar pantallas y refrescar cada 10 segundos
  const loadScreens = async () => {
    try {
      const data = await api.getScreens();
      setScreens(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadScreens();
    const interval = setInterval(loadScreens, 10000);
    return () => clearInterval(interval);
  }, []);

  // Al seleccionar una pantalla, cargar su playlist actual
  const handleSelectScreen = async (screen) => {
    setSelectedScreen(screen);
    try {
      const currentSlides = await api.getPlaylist(screen.code);
      setSlides(currentSlides);
    } catch (err) {
      setSlides([]);
    }
  };

  // Emparejar nueva pantalla
  const handlePair = async (e) => {
    e.preventDefault();
    try {
      await api.pairScreen(pairCode, pairName);
      setShowPairModal(false);
      setPairCode("");
      setPairName("");
      loadScreens();
      alert("¡Pantalla vinculada con éxito!");
    } catch (err) {
      alert(err.message);
    }
  };

  // Subir imagen física y sumarla a la lista
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await api.uploadImage(file);
      // Agregar nuevo slide a la lista local
      setSlides([...slides, { url: res.url, duration: 5000 }]);
    } catch (err) {
      alert("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  // Cambiar la duración de una diapositiva individual
  const handleDurationChange = (index, newSeconds) => {
    const parsedSeconds = Math.max(1, parseInt(newSeconds) || 1); // Mínimo 1 segundo
    const updatedSlides = [...slides];
    updatedSlides[index] = {
      ...updatedSlides[index],
      duration: parsedSeconds * 1000 // Convertir a milisegundos para el backend y TV
    };
    setSlides(updatedSlides);
  };

  // Eliminar slide
  const handleRemoveSlide = (index) => {
    setSlides(slides.filter((_, i) => i !== index));
  };

  // Publicar cambios a la TV
  const handlePublish = async () => {
    if (!selectedScreen) return;
    try {
      await api.savePlaylist(selectedScreen.code, slides);
      setStatusMsg("¡Cambios publicados en vivo a la pantalla!");
      setTimeout(() => setStatusMsg(""), 4000);
      loadScreens();
    } catch (err) {
      alert("Error al guardar cambios");
    }
  };

  return (
    <div className="dashboard-container">
      <header>
        <div>
          <h1>Panel de Control Signage</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Gestión de Pantallas en Tiempo Real</p>
        </div>
        <button className="btn-primary" onClick={() => setShowPairModal(true)}>
          <Plus size={18} /> Vincular Nueva Pantalla
        </button>
      </header>

      {/* Grid de Pantallas */}
      {/* Grid de Pantallas */}
      <section style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Tus Pantallas Registradas</h2>
        
        {screens.length === 0 ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>
            No se encontraron pantallas conectadas. Revisa que el backend esté corriendo.
          </p>
        ) : (
          <div className="screens-grid">
            {screens.map((screen) => {
              const code = screen.code || screen.Code;
              const name = screen.name || screen.Name;
              const isOnline = screen.isOnline ?? screen.IsOnline ?? false;
              const slideCount = screen.slideCount ?? screen.SlideCount ?? screen.itemCount ?? 0;

              return (
                <div
                  key={code}
                  className={`screen-card ${selectedScreen?.code === code ? "selected" : ""}`}
                  onClick={() => handleSelectScreen({ code, name, isOnline, slideCount })}
                  style={{ cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span className={`badge ${isOnline ? "online" : "offline"}`}>
                      {isOnline ? "● En Línea" : "○ Desconectada"}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{code}</span>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "6px" }}>{name}</h3>
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    {slideCount} {slideCount === 1 ? "diapositiva" : "diapositivas"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Editor de Contenido */}
      {selectedScreen && (
        <section className="editor-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2>Editando: {selectedScreen.name} ({selectedScreen.code})</h2>
              <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Organiza las fotos que se mostrarán en este televisor</span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <label className="btn-primary" style={{ cursor: "pointer" }}>
                <Upload size={18} /> {uploading ? "Subiendo..." : "Subir Foto"}
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
              <button className="btn-success" onClick={handlePublish}>
                <CheckCircle2 size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} />
                Publicar a la TV
              </button>
            </div>
          </div>

          {statusMsg && (
            <div style={{ background: "#065f46", color: "#6ee7b7", padding: "10px", borderRadius: "8px", marginBottom: "16px" }}>
              {statusMsg}
            </div>
          )}

          {slides.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: "40px" }}>
              Esta pantalla no tiene imágenes. Haz clic en "Subir Foto" para agregar la primera.
            </p>
          ) : (
            <div className="slides-preview">
              {slides.map((slide, index) => (
                <div key={index} className="slide-item">
                  <img src={slide.url} alt={`Slide ${index + 1}`} />
                  <div className="slide-info">
                    <div className="duration-control">
                      <label>Segundos:</label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={Math.round((slide.duration || 5000) / 1000)}
                        onChange={(e) => handleDurationChange(index, e.target.value)}
                        className="duration-input"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveSlide(index)}
                      className="btn-delete"
                    >
                      <Trash2 size={14} style={{ verticalAlign: "middle" }} /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal para Vincular Pantalla */}
      {showPairModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 style={{ marginBottom: "16px" }}>Vincular Pantalla</h2>
            <form onSubmit={handlePair}>
              <div className="input-group">
                <label>Código que aparece en la TV (Ej. TV-6449):</label>
                <input
                  type="text"
                  placeholder="TV-XXXX"
                  required
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="input-group">
                <label>Nombre de la Pantalla:</label>
                <input
                  type="text"
                  placeholder="Ej: Menú Mostrador, Caja 1"
                  required
                  value={pairName}
                  onChange={(e) => setPairName(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowPairModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Vincular Ahora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;