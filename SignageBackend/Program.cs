using System.IO;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using SignageBackend.Data;
using SignageBackend.Hubs;
using Microsoft.AspNetCore.StaticFiles;

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
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true) // Cubre localhost, 127.0.0.1 y cualquier IP de la red local
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();
//app.UseCors("AllowReactApp");
app.UseCors("AllowAll");


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

// Configurar tipos MIME para videos e imágenes
var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".mp4"] = "video/mp4";
contentTypeProvider.Mappings[".webm"] = "video/webm";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypeProvider
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(policy => policy
    .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials());
app.UseAuthorization();

app.MapControllers();
app.MapHub<SignageHub>("/signageHub");

app.Run();