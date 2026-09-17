using System.IO;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using SignageBackend.Data;
using SignageBackend.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 1. Base de datos SQLite
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=signage.db"));

// 2. Servicios del sistema
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Permitir CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(
                  "http://localhost:5173", // Vite default
                  "http://localhost:3000", // CRA default
                  "http://127.0.0.1:5173"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Obligatorio para SignalR con WebSockets
    });
});

var app = builder.Build();
app.UseCors("AllowReactApp");

// 3. Crear base de datos automáticamente
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// 4. Asegurar existencia de la carpeta 'uploads'
var uploadsDirectory = Path.Combine(app.Environment.ContentRootPath, "uploads");
if (!Directory.Exists(uploadsDirectory))
{
    Directory.CreateDirectory(uploadsDirectory);
}

// 5. Exponer la carpeta 'uploads' como archivos estáticos públicos
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsDirectory),
    RequestPath = "/uploads"
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthorization();

app.MapControllers();
app.MapHub<SignageHub>("/signageHub");

app.Run();