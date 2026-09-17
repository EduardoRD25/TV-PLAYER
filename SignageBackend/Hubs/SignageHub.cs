using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SignageBackend.Data;

namespace SignageBackend.Hubs;

public class SignageHub : Hub
{
    private readonly AppDbContext _db;

    public SignageHub(AppDbContext db)
    {
        _db = db;
    }

    public async Task JoinScreen(string screenCode)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, screenCode);
        Console.WriteLine($"[TV Conectada] Pantalla con código '{screenCode}' se unió al Hub.");
    }

    // Método que invoca el visor web periódicamente
    public async Task SendHeartbeat(string screenCode)
    {
        if (string.IsNullOrWhiteSpace(screenCode)) return;

        var screen = await _db.Screens.FirstOrDefaultAsync(s => s.Code == screenCode);
        if (screen != null)
        {
            screen.LastPingAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }
}