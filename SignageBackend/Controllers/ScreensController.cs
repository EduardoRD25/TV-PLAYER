//Tendrá los endpoints para registrar la pantalla no emparejada, 
//emparejarla desde el panel de administración y listar las pantallas existentes

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

    // 1. La TV arranca y registra su código generado si no existe en BD
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
                IsPaired = false
            };
            _db.Screens.Add(screen);
            await _db.SaveChangesAsync();
        }

        return Ok(new { screen.Code, screen.IsPaired });
    }

    // 2. El dueño ingresa el código en su celular/React para reclamar la TV
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

        await _db.SaveChangesAsync();

        // Notificar en tiempo real a la TV Box que fue vinculada exitosamente
        await _hubContext.Clients.Group(screen.Code).SendAsync("ScreenPaired", new
        {
            screenCode = screen.Code,
            screenName = screen.Name
        });

        return Ok(new { message = $"Pantalla {screen.Code} vinculada exitosamente." });
    }

    // 3. Obtener listado de pantallas (para el panel en React de tu hermano)
    [HttpGet]
    public async Task<IActionResult> GetAllScreens()
    {
        var screens = await _db.Screens
            .Select(s => new
            {
                s.Id,
                s.Code,
                s.Name,
                s.IsPaired,
                ItemCount = s.Items.Count
            })
            .ToListAsync();

        return Ok(screens);
    }
}