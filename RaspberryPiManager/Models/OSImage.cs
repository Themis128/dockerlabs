namespace RaspberryPiManager.Models;

public class OSImage
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Version { get; set; } = string.Empty;
    public string OSFamily { get; set; } = string.Empty; // "RaspberryPiOS", "Ubuntu", "Custom"
    public string DownloadUrl { get; set; } = string.Empty;
    public string Checksum { get; set; } = string.Empty;
    public DateTime LastModified { get; set; }
    public bool IsOfficial { get; set; }
    public List<string> SupportedModels { get; set; } = new(); // Pi 4, Pi 5, etc.
}

public class OSImageMetadata
{
    public string ImagePath { get; set; } = string.Empty;
    public long UncompressedSize { get; set; }
    public string Format { get; set; } = string.Empty; // "img", "zip", "xz"
    public bool IsCompressed { get; set; }
    public Dictionary<string, object> Properties { get; set; } = new();
}
