using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace SignageBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    // Extensiones permitidas (imágenes y videos)
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm" };
    private const long MaxFileSizeInBytes = 60 * 1024 * 1024; // 60 MB

    public MediaController(IWebHostEnvironment env)
    {
        _env = env;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo no proporcionado." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = "Formato no permitido. Usa JPG, PNG, WEBP, MP4 o WEBM." });

        // Límite de tamaño: 60 MB
        if (file.Length > MaxFileSizeInBytes)
            return BadRequest(new { message = "El archivo supera el límite de 60 MB." });

        // Resolución segura de la ruta wwwroot/uploads usando IWebHostEnvironment
        var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadsFolder = Path.Combine(webRoot, "uploads");

        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var publicUrl = $"{baseUrl}/uploads/{uniqueFileName}";

        return Ok(new
        {
            fileName = uniqueFileName,
            url = publicUrl,
            size = file.Length,
            isVideo = ext == ".mp4" || ext == ".webm"
        });
    }
}