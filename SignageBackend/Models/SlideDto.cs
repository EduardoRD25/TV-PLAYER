namespace SignageBackend.Models;

public class SlideDto
{
    public string Url { get; set; } = string.Empty;
    public int Duration { get; set; } = 6000;
}

public class PlaylistUpdateRequest
{
    public string ScreenCode { get; set; } = string.Empty;
    public List<SlideDto> Slides { get; set; } = new();
}


public class FileUploadDto
{
    public IFormFile File { get; set; } = null!;
}

//CLASES PARA EL EMPAREJAMIENTO
public class RegisterScreenRequest
{
    public string Code { get; set; } = string.Empty;
}

public class PairScreenRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}