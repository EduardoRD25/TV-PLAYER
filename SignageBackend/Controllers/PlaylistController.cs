using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SignageBackend.Hubs;
using SignageBackend.Models;

namespace SignageBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlaylistController : ControllerBase
{
    private readonly IHubContext<SignageHub> _hubContext;

    public PlaylistController(IHubContext<SignageHub> hubContext)
    {
        _hubContext = hubContext;
    }

    [HttpPost("update")]
    public async Task<IActionResult> UpdateScreenPlaylist([FromBody] PlaylistUpdateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ScreenCode) || request.Slides.Count == 0)
        {
            return BadRequest("El código de pantalla y las diapositivas son obligatorios.");
        }

        // Envía la nueva lista en tiempo real por WebSocket a la TV
        await _hubContext.Clients.Group(request.ScreenCode)
            .SendAsync("UpdatePlaylist", request.Slides);

        Console.WriteLine($"[Actualización] Enviada a la pantalla {request.ScreenCode} ({request.Slides.Count} imágenes)");

        return Ok(new { message = $"Playlist enviada a la pantalla {request.ScreenCode} exitosamente." });
    }
}