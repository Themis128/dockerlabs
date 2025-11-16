#if WINDOWS
using System.Management;
using System.Text;
using RaspberryPiManager.Models;
using RaspberryPiManager.Services;

namespace RaspberryPiManager.Platforms.Windows.Services;

public class WindowsDiskService : IDiskManagementService
{
    public async Task<List<DiskInfo>> GetRemovableDisksAsync()
    {
        return await Task.Run(() =>
        {
            var disks = new List<DiskInfo>();

            try
            {
                using var searcher = new ManagementObjectSearcher(
                    "SELECT * FROM Win32_LogicalDisk WHERE DriveType = 2"); // Removable drives

                foreach (ManagementObject disk in searcher.Get())
                {
                    var deviceId = disk["DeviceID"]?.ToString() ?? string.Empty;
                    var driveType = Convert.ToInt32(disk["DriveType"]);

                    if (driveType == 2) // Removable
                    {
                        var diskInfo = new DiskInfo
                        {
                            DeviceId = deviceId,
                            DriveLetter = deviceId,
                            Label = disk["VolumeName"]?.ToString() ?? string.Empty,
                            TotalSizeBytes = Convert.ToInt64(disk["Size"] ?? 0),
                            FreeSpaceBytes = Convert.ToInt64(disk["FreeSpace"] ?? 0),
                            FileSystem = disk["FileSystem"]?.ToString() ?? string.Empty,
                            IsRemovable = true,
                            IsMounted = !string.IsNullOrEmpty(disk["FileSystem"]?.ToString())
                        };

                        disks.Add(diskInfo);
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error
                System.Diagnostics.Debug.WriteLine($"Error getting removable disks: {ex.Message}");
            }

            return disks;
        });
    }

    public async Task<bool> FormatDiskAsync(string deviceId, string fileSystem)
    {
        return await Task.Run(() =>
        {
            try
            {
                var driveLetter = deviceId.Replace("\\", "").Replace(":", "");
                var script = $@"
select volume {driveLetter}
format fs={fileSystem} quick
assign letter={driveLetter}
";

                var process = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "diskpart",
                        Arguments = $"/s {CreateTempScript(script)}",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    }
                };

                process.Start();
                process.WaitForExit();

                return process.ExitCode == 0;
            }
            catch
            {
                return false;
            }
        });
    }

    public Task<bool> EjectDiskAsync(string deviceId)
    {
        // Use Shell32 to eject
        return Task.FromResult(true);
    }

    public Task<bool> MountDiskAsync(string deviceId)
    {
        // Windows auto-mounts, just return true
        return Task.FromResult(true);
    }

    public Task<bool> UnmountDiskAsync(string deviceId)
    {
        return Task.Run(() =>
        {
            try
            {
                var driveLetter = deviceId.Replace("\\", "").Replace(":", "");
                var process = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "diskpart",
                        Arguments = $"/s {CreateTempScript($"select volume {driveLetter}\nremove")}",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };

                process.Start();
                process.WaitForExit();
                return process.ExitCode == 0;
            }
            catch
            {
                return false;
            }
        });
    }

    public async Task<string?> GetBootPartitionPathAsync(string deviceId)
    {
        var disks = await GetRemovableDisksAsync();
        var disk = disks.FirstOrDefault(d => d.DeviceId == deviceId);
        return disk?.DriveLetter;
    }

    private string CreateTempScript(string content)
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"diskpart_{Guid.NewGuid()}.txt");
        File.WriteAllText(tempFile, content);
        return tempFile;
    }
}
#endif
