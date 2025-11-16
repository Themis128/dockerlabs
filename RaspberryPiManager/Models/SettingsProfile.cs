namespace RaspberryPiManager.Models;

public class SettingsProfile
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; } = DateTime.Now;
    public DateTime ModifiedDate { get; set; } = DateTime.Now;
    public PiSettings Settings { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    public bool IsTemplate { get; set; }
    public string TemplateCategory { get; set; } = string.Empty; // "Home", "Server", "IoT", "Media", etc.
}

public class ProfileTemplate
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public PiSettings DefaultSettings { get; set; } = new();
}
