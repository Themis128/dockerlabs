using System.IO;

namespace RaspberryPiManager.Utilities;

public interface IFileSystemHelper
{
    Task<bool> MountPartitionAsync(string devicePath, string mountPoint);
    Task<bool> UnmountPartitionAsync(string mountPoint);
    Task<string?> FindBootPartitionAsync(string deviceId);
    Task<bool> CopyFileToBootPartitionAsync(string sourceFile, string bootPartitionPath, string fileName);
    Task<List<string>> ListBootPartitionFilesAsync(string bootPartitionPath);
}

public class FileSystemHelper : IFileSystemHelper
{
    public async Task<bool> MountPartitionAsync(string devicePath, string mountPoint)
    {
        return await Task.Run(() =>
        {
            try
            {
                if (!Directory.Exists(mountPoint))
                {
                    Directory.CreateDirectory(mountPoint);
                }

#if LINUX
                var process = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "sudo",
                        Arguments = $"mount {devicePath} {mountPoint}",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };
                process.Start();
                process.WaitForExit();
                return process.ExitCode == 0;
#elif MACCATALYST || IOS
                var process = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "/usr/sbin/diskutil",
                        Arguments = $"mount {devicePath}",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };
                process.Start();
                process.WaitForExit();
                return process.ExitCode == 0;
#else
                // Windows auto-mounts
                return true;
#endif
            }
            catch
            {
                return false;
            }
        });
    }

    public async Task<bool> UnmountPartitionAsync(string mountPoint)
    {
        return await Task.Run(() =>
        {
            try
            {
#if LINUX
                var process = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "sudo",
                        Arguments = $"umount {mountPoint}",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };
                process.Start();
                process.WaitForExit();
                return process.ExitCode == 0;
#elif MACCATALYST || IOS
                var process = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "/usr/sbin/diskutil",
                        Arguments = $"unmount {mountPoint}",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };
                process.Start();
                process.WaitForExit();
                return process.ExitCode == 0;
#else
                // Windows
                var process = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "diskpart",
                        Arguments = $"/s {CreateUnmountScript(mountPoint)}",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };
                process.Start();
                process.WaitForExit();
                return process.ExitCode == 0;
#endif
            }
            catch
            {
                return false;
            }
        });
    }

    public async Task<string?> FindBootPartitionAsync(string deviceId)
    {
        return await Task.Run(() =>
        {
            // Find first FAT32 partition (usually boot partition)
#if WINDOWS
            var driveLetter = deviceId.Replace("\\", "").Replace(":", "");
            var bootPath = $"{driveLetter}:\\";
            if (Directory.Exists(bootPath))
                return bootPath;
#elif LINUX
            var bootPartition = $"{deviceId}1";
            var mountPoint = $"/mnt/{Path.GetFileName(bootPartition)}";
            if (MountPartitionAsync(bootPartition, mountPoint).Result)
                return mountPoint;
#elif MACCATALYST || IOS
            var bootPartition = $"{deviceId}s1";
            // Use diskutil to find mount point
            var process = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "/usr/sbin/diskutil",
                    Arguments = $"info {bootPartition}",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true
                }
            };
            process.Start();
            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit();
            // Parse mount point from output
#endif
            return null;
        });
    }

    public async Task<bool> CopyFileToBootPartitionAsync(string sourceFile, string bootPartitionPath, string fileName)
    {
        return await Task.Run(() =>
        {
            try
            {
                var destPath = Path.Combine(bootPartitionPath, fileName);
                File.Copy(sourceFile, destPath, true);
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error copying file: {ex.Message}");
                return false;
            }
        });
    }

    public async Task<List<string>> ListBootPartitionFilesAsync(string bootPartitionPath)
    {
        return await Task.Run(() =>
        {
            if (!Directory.Exists(bootPartitionPath))
                return new List<string>();

            return Directory.GetFiles(bootPartitionPath).Select(Path.GetFileName).Where(f => f != null).Cast<string>().ToList();
        });
    }

#if WINDOWS
    private string CreateUnmountScript(string mountPoint)
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"unmount_{Guid.NewGuid()}.txt");
        var driveLetter = mountPoint.Replace("\\", "").Replace(":", "");
        File.WriteAllText(tempFile, $"select volume {driveLetter}\nremove");
        return tempFile;
    }
#endif
}
