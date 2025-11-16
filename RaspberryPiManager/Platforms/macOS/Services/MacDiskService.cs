#if MACCATALYST || IOS
using System.Diagnostics;
using RaspberryPiManager.Models;
using RaspberryPiManager.Services;

namespace RaspberryPiManager.Platforms.macOS.Services;

public class MacDiskService : IDiskManagementService
{
    public async Task<List<DiskInfo>> GetRemovableDisksAsync()
    {
        return await Task.Run(() =>
        {
            var disks = new List<DiskInfo>();

            try
            {
                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "/usr/sbin/diskutil",
                        Arguments = "list -plist external",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        CreateNoWindow = true
                    }
                };

                process.Start();
                var output = process.StandardOutput.ReadToEnd();
                process.WaitForExit();

                // Parse diskutil plist output
                // Simplified - would need proper plist parsing
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error getting removable disks: {ex.Message}");
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
                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "/usr/sbin/diskutil",
                        Arguments = $"eraseDisk FAT32 RPI {deviceId}",
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

    public Task<bool> EjectDiskAsync(string deviceId)
    {
        return Task.Run(() =>
        {
            try
            {
                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "/usr/sbin/diskutil",
                        Arguments = $"eject {deviceId}",
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

    public Task<bool> MountDiskAsync(string deviceId)
    {
        return Task.Run(() =>
        {
            try
            {
                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "/usr/sbin/diskutil",
                        Arguments = $"mount {deviceId}",
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

    public Task<bool> UnmountDiskAsync(string deviceId)
    {
        return Task.Run(() =>
        {
            try
            {
                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "/usr/sbin/diskutil",
                        Arguments = $"unmount {deviceId}",
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
        // Find boot partition using diskutil
        var bootPartition = $"{deviceId}s1";
        return await Task.FromResult(bootPartition);
    }
}
#endif
