namespace RaspberryPiManager.Models;

public class BackupProfile
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; } = DateTime.Now;
    public string BackupFilePath { get; set; } = string.Empty;
    public long BackupSizeBytes { get; set; }
    public bool IsCompressed { get; set; }
    public string Checksum { get; set; } = string.Empty;
    public PiSettings? Settings { get; set; }
    public OSImage? OSImage { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = new();
    public BackupType Type { get; set; } = BackupType.FullImage;
}

public enum BackupType
{
    FullImage,
    SettingsOnly,
    BootPartition,
    RootPartition
}

public class RestoreOptions
{
    public string BackupFilePath { get; set; } = string.Empty;
    public string TargetSDCard { get; set; } = string.Empty;
    public bool RestoreSettings { get; set; } = true;
    public bool RestoreOS { get; set; } = true;
    public bool FormatBeforeRestore { get; set; } = true;
    public bool VerifyAfterRestore { get; set; } = true;
}
