//Este controlador valida que el archivo sea una imagen (.jpg, .png, .jpeg, .webp), 
// genera un nombre de archivo único usando un Guid (para evitar colisiones de nombres) 
// y devuelve la URL completa con la IP o dominio del servidor.
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SignageBackend.Models;

namespace SignageBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

    public MediaController(IWebHostEnvironment env)
    {
        _env = env;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadImage([FromForm] FileUploadDto request)
    {
        var file = request.File;

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No se ha proporcionado ningún archivo." });
        }

        // 1. Validar extensión
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Formato no permitido. Solo se aceptan .jpg, .jpeg, .png y .webp." });
        }

        // 2. Limitar tamaño a 15 MB
        if (file.Length > 15 * 1024 * 1024)
        {
            return BadRequest(new { message = "El archivo excede el tamaño máximo de 15 MB." });
        }

        // 3. Generar nombre único
        var uniqueFileName = $"{Guid.NewGuid()}{extension}";
        var uploadPath = Path.Combine(_env.ContentRootPath, "uploads", uniqueFileName);

        // 4. Guardar archivo en disco
        using (var stream = new FileStream(uploadPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // 5. URL accesible
        var fileUrl = $"{Request.Scheme}://{Request.Host}/uploads/{uniqueFileName}";

        return Ok(new
        {
            fileName = uniqueFileName,
            url = fileUrl,
            size = file.Length
        });
    }
}