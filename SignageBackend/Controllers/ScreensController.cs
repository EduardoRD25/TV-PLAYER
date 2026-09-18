using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SignageBackend.Data;
using SignageBackend.Hubs;
using SignageBackend.Models;

namespace SignageBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScreensController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<SignageHub> _hubContext;

    public ScreensController(AppDbContext db, IHubContext<SignageHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    [HttpPost("register")]
    public async Task<IActionResult> RegisterScreen([FromBody] RegisterScreenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest("El código es obligatorio.");

        var screen = await _db.Screens.FirstOrDefaultAsync(s => s.Code == request.Code);
        if (screen == null)
        {
            screen = new Screen
            {
                Code = request.Code.ToUpper().Trim(),
                Name = "Pantalla Pendiente",
                IsPaired = false,
                LastPingAt = DateTime.UtcNow
            };
            _db.Screens.Add(screen);
            await _db.SaveChangesAsync();
        }

        return Ok(new { screen.Code, screen.IsPaired });
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> DeleteScreen(string code)
    {
        var screen = await _db.Screens
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Code == code);

        if (screen == null)
            return NotFound(new { message = "Pantalla no encontrada." });

        // Eliminar diapositivas asociadas y la pantalla
        _db.PlaylistItems.RemoveRange(screen.Items);
        _db.Screens.Remove(screen);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Pantalla {code} eliminada correctamente." });
    }

    [HttpPost("pair")]
    public async Task<IActionResult> PairScreen([FromBody] PairScreenRequest request)
    {
        var screen = await _db.Screens
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Code == request.Code.ToUpper().Trim());

        if (screen == null)
            return NotFound("Código no encontrado.");

        screen.Name = string.IsNullOrWhiteSpace(request.Name) ? "Pantalla Principal" : request.Name;
        screen.IsPaired = true;
        screen.LastPingAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _hubContext.Clients.Group(screen.Code).SendAsync("ScreenPaired", new
        {
            screenCode = screen.Code,
            screenName = screen.Name
        });

        return Ok(new { message = $"Pantalla {screen.Code} vinculada exitosamente." });
    }

    // Endpoint clave para el panel administrativo
    [HttpGet]
    public async Task<IActionResult> GetAllScreens()
    {
        var threshold = DateTime.UtcNow.AddSeconds(-60);

        var screens = await _db.Screens
            .Select(s => new
            {
                s.Id,
                s.Code,
                s.Name,
                s.IsPaired,
                s.LastPingAt,
                // Si el ping fue hace menos de 60 segundos, está en línea
                IsOnline = s.LastPingAt >= threshold,
                SlideCount = s.Items.Count
            })
            .ToListAsync();

        return Ok(screens);
    }

    [HttpPost("{code}/command")]
    public async Task<IActionResult> SendCommand(string code, [FromBody] CommandRequest req, [FromServices] IHubContext<SignageHub> hubContext)
    {
        await hubContext.Clients.Group(code).SendAsync("ReceiveCommand", req.Action);
        return Ok(new { message = $"Comando {req.Action} enviado a {code}" });
    }

    public class CommandRequest
    {
        public string Action { get; set; } = string.Empty;
    }
}