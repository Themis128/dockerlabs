namespace RaspberryPiManager.Models;

public class SDCardInfo
{
    public string DeviceId { get; set; } = string.Empty;
    public string DriveLetter { get; set; } = string.Empty; // Windows
    public string MountPoint { get; set; } = string.Empty; // Linux/Mac
    public string Label { get; set; } = string.Empty;
    public long TotalSizeBytes { get; set; }
    public long FreeSpaceBytes { get; set; }
    public string FileSystem { get; set; } = string.Empty;
    public bool IsRemovable { get; set; }
    public bool IsFormatted { get; set; }
    public bool IsMounted { get; set; }
    public List<PartitionInfo> Partitions { get; set; } = new();
    public SDCardStatus Status { get; set; } = SDCardStatus.Unknown;
}

public class PartitionInfo
{
    public string PartitionId { get; set; } = string.Empty;
    public int PartitionNumber { get; set; }
    public long SizeBytes { get; set; }
    public string FileSystem { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool IsBootPartition { get; set; }
    public string MountPoint { get; set; } = string.Empty;
}

public enum SDCardStatus
{
    Unknown,
    Ready,
    InUse,
    Protected,
    Error,
    NotFormatted
}
