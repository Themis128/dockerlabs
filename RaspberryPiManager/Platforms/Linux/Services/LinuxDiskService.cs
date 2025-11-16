#if LINUX
using System.Diagnostics;
using RaspberryPiManager.Models;
using RaspberryPiManager.Services;

namespace RaspberryPiManager.Platforms.Linux.Services;

public class LinuxDiskService : IDiskManagementService
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
                        FileName = "lsblk",
                        Arguments = "-o NAME,TYPE,SIZE,MOUNTPOINT,FSTYPE,LABEL -n -b -J",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        CreateNoWindow = true
                    }
                };

                process.Start();
                var output = process.StandardOutput.ReadToEnd();
                process.WaitForExit();

                // Parse lsblk JSON output
                // Simplified - would need proper JSON parsing
                var lines = output.Split('\n');
                foreach (var line in lines)
                {
                    if (line.Contains("disk") && !line.Contains("loop"))
                    {
                        // Parse disk information
                        // This is simplified - real implementation would parse JSON properly
                    }
                }
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
                        FileName = "sudo",
                        Arguments = $"mkfs.vfat -F 32 {deviceId}",
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
                        FileName = "eject",
                        Arguments = deviceId,
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
                var mountPoint = $"/mnt/{Path.GetFileName(deviceId)}";
                Directory.CreateDirectory(mountPoint);

                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "sudo",
                        Arguments = $"mount {deviceId} {mountPoint}",
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
                        FileName = "sudo",
                        Arguments = $"umount {deviceId}",
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
        // Find boot partition (usually first partition)
        var bootPartition = $"{deviceId}1";
        return await Task.FromResult(bootPartition);
    }
}
#endif
