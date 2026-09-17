namespace SignageBackend.Models;

public class Screen
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty; // Ej: "TV-8492"
    public string Name { get; set; } = string.Empty; // Ej: "TV Mostrador"
    public bool IsPaired { get; set; } = false;      // ¿Ya fue reclamada por un cliente?
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Relación 1 a muchos con los elementos de su playlist
    public List<PlaylistItem> Items { get; set; } = new();
}

public class PlaylistItem
{
    public int Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public int DurationMs { get; set; } = 6000;
    public int Order { get; set; } = 0;

    // Clave foránea hacia Screen
    public int ScreenId { get; set; }
    public Screen? Screen { get; set; }
}