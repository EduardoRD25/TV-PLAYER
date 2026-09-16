using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SignageBackend.Data;
using SignageBackend.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 1. Base de datos SQLite local
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=signage.db"));

// 2. Servicios del sistema
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 3. Crear la base de datos automáticamente al iniciar si no existe
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

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