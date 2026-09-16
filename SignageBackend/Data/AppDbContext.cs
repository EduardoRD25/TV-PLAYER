using Microsoft.EntityFrameworkCore;
using SignageBackend.Models;

namespace SignageBackend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Screen> Screens => Set<Screen>();
    public DbSet<PlaylistItem> PlaylistItems => Set<PlaylistItem>();
}