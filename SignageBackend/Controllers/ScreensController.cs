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
}