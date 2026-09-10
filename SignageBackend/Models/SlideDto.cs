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