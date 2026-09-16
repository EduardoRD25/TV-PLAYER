using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SignageBackend.Data;
using SignageBackend.Hubs;
using SignageBackend.Models;

namespace SignageBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlaylistController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<SignageHub> _hubContext;

    public PlaylistController(AppDbContext db, IHubContext<SignageHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    // GET: api/playlist/{screenCode} -> Para recuperar la playlist guardada
    [HttpGet("{screenCode}")]
    public async Task<IActionResult> GetPlaylist(string screenCode)
    {
        var screen = await _db.Screens
            .Include(s => s.Items.OrderBy(i => i.Order))
            .FirstOrDefaultAsync(s => s.Code == screenCode);

        if (screen == null)
        {
            return NotFound($"No se encontró la pantalla {screenCode}");
        }

        var response = screen.Items.Select(i => new SlideDto
        {
            Url = i.ImageUrl,
            Duration = i.DurationMs
        }).ToList();

        return Ok(response);
    }

    // POST: api/playlist/update -> Guarda en BD y notifica a la TV en tiempo real
    [HttpPost("update")]
    public async Task<IActionResult> UpdateScreenPlaylist([FromBody] PlaylistUpdateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ScreenCode) || request.Slides.Count == 0)
        {
            return BadRequest("El código de pantalla y las diapositivas son obligatorios.");
        }

        // 1. Buscar si la pantalla ya existe, o crearla
        var screen = await _db.Screens
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Code == request.ScreenCode);

        if (screen == null)
        {
            screen = new Screen
            {
                Code = request.ScreenCode,
                Name = $"Pantalla {request.ScreenCode}"
            };
            _db.Screens.Add(screen);
        }

        // 2. Reemplazar los ítems anteriores por los nuevos
        _db.PlaylistItems.RemoveRange(screen.Items);

        int orderIndex = 0;
        screen.Items = request.Slides.Select(s => new PlaylistItem
        {
            ImageUrl = s.Url,
            DurationMs = s.Duration,
            Order = orderIndex++
        }).ToList();

        await _db.SaveChangesAsync();

        // 3. Notificar a la TV por SignalR
        await _hubContext.Clients.Group(request.ScreenCode)
            .SendAsync("UpdatePlaylist", request.Slides);

        return Ok(new { 
            message = $"Playlist guardada en BD y enviada a {request.ScreenCode} exitosamente." 
        });
    }
}