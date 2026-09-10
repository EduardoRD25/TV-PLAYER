using Microsoft.AspNetCore.SignalR;

namespace SignageBackend.Hubs;

public class SignageHub : Hub
{
    public async Task JoinScreen(string screenCode)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, screenCode);
        Console.WriteLine($"[TV Conectada] Pantalla con código '{screenCode}' se unió al Hub.");
    }
}
