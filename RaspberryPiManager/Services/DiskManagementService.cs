using RaspberryPiManager.Models;
#if WINDOWS
using RaspberryPiManager.Platforms.Windows.Services;
#elif LINUX
using RaspberryPiManager.Platforms.Linux.Services;
#elif MACCATALYST || IOS
using RaspberryPiManager.Platforms.macOS.Services;
#endif

namespace RaspberryPiManager.Services;

public interface IDiskManagementService
{
    Task<List<DiskInfo>> GetRemovableDisksAsync();
    Task<bool> FormatDiskAsync(string deviceId, string fileSystem);
    Task<bool> EjectDiskAsync(string deviceId);
    Task<bool> MountDiskAsync(string deviceId);
    Task<bool> UnmountDiskAsync(string deviceId);
    Task<string?> GetBootPartitionPathAsync(string deviceId);
}

public class DiskInfo
{
    public string DeviceId { get; set; } = string.Empty;
    public string DriveLetter { get; set; } = string.Empty;
    public string MountPoint { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public long TotalSizeBytes { get; set; }
    public long FreeSpaceBytes { get; set; }
    public string FileSystem { get; set; } = string.Empty;
    public bool IsRemovable { get; set; }
    public bool IsMounted { get; set; }
    public List<PartitionInfo> Partitions { get; set; } = new();
}

#if WINDOWS

public class DiskManagementService : IDiskManagementService
{
    private readonly WindowsDiskService _windowsDiskService;

    public DiskManagementService(WindowsDiskService windowsDiskService)
    {
        _windowsDiskService = windowsDiskService;
    }

    public Task<List<DiskInfo>> GetRemovableDisksAsync() => _windowsDiskService.GetRemovableDisksAsync();
    public Task<bool> FormatDiskAsync(string deviceId, string fileSystem) => _windowsDiskService.FormatDiskAsync(deviceId, fileSystem);
    public Task<bool> EjectDiskAsync(string deviceId) => _windowsDiskService.EjectDiskAsync(deviceId);
    public Task<bool> MountDiskAsync(string deviceId) => _windowsDiskService.MountDiskAsync(deviceId);
    public Task<bool> UnmountDiskAsync(string deviceId) => _windowsDiskService.UnmountDiskAsync(deviceId);
    public Task<string?> GetBootPartitionPathAsync(string deviceId) => _windowsDiskService.GetBootPartitionPathAsync(deviceId);
}

#elif LINUX
public class DiskManagementService : IDiskManagementService
{
    private readonly LinuxDiskService _linuxDiskService;

    public DiskManagementService(LinuxDiskService linuxDiskService)
    {
        _linuxDiskService = linuxDiskService;
    }

    public Task<List<DiskInfo>> GetRemovableDisksAsync() => _linuxDiskService.GetRemovableDisksAsync();
    public Task<bool> FormatDiskAsync(string deviceId, string fileSystem) => _linuxDiskService.FormatDiskAsync(deviceId, fileSystem);
    public Task<bool> EjectDiskAsync(string deviceId) => _linuxDiskService.EjectDiskAsync(deviceId);
    public Task<bool> MountDiskAsync(string deviceId) => _linuxDiskService.MountDiskAsync(deviceId);
    public Task<bool> UnmountDiskAsync(string deviceId) => _linuxDiskService.UnmountDiskAsync(deviceId);
    public Task<string?> GetBootPartitionPathAsync(string deviceId) => _linuxDiskService.GetBootPartitionPathAsync(deviceId);
}

#elif MACCATALYST || IOS
public class DiskManagementService : IDiskManagementService
{
    private readonly MacDiskService _macDiskService;

    public DiskManagementService(MacDiskService macDiskService)
    {
        _macDiskService = macDiskService;
    }

    public Task<List<DiskInfo>> GetRemovableDisksAsync() => _macDiskService.GetRemovableDisksAsync();
    public Task<bool> FormatDiskAsync(string deviceId, string fileSystem) => _macDiskService.FormatDiskAsync(deviceId, fileSystem);
    public Task<bool> EjectDiskAsync(string deviceId) => _macDiskService.EjectDiskAsync(deviceId);
    public Task<bool> MountDiskAsync(string deviceId) => _macDiskService.MountDiskAsync(deviceId);
    public Task<bool> UnmountDiskAsync(string deviceId) => _macDiskService.UnmountDiskAsync(deviceId);
    public Task<string?> GetBootPartitionPathAsync(string deviceId) => _macDiskService.GetBootPartitionPathAsync(deviceId);
}

#else
public class DiskManagementService : IDiskManagementService
{
    public Task<List<DiskInfo>> GetRemovableDisksAsync() => Task.FromResult(new List<DiskInfo>());
    public Task<bool> FormatDiskAsync(string deviceId, string fileSystem) => Task.FromResult(false);
    public Task<bool> EjectDiskAsync(string deviceId) => Task.FromResult(false);
    public Task<bool> MountDiskAsync(string deviceId) => Task.FromResult(false);
    public Task<bool> UnmountDiskAsync(string deviceId) => Task.FromResult(false);
    public Task<string?> GetBootPartitionPathAsync(string deviceId) => Task.FromResult<string?>(null);
}
#endif
