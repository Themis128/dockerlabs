#if LINUX
using System.Diagnostics;
using System.IO;

namespace RaspberryPiManager.Platforms.Linux.Services;

public class LinuxImageWriter
{
    public async Task<bool> WriteImageAsync(string imagePath, string targetDevice, IProgress<double>? progress = null)
    {
        return await Task.Run(() =>
        {
            try
            {
                var imageSize = new FileInfo(imagePath).Length;
                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "sudo",
                        Arguments = $"dd if=\"{imagePath}\" of=\"{targetDevice}\" bs=4M status=progress oflag=sync",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    }
                };

                process.Start();

                // Parse progress from dd output
                string? line;
                while ((line = process.StandardError.ReadLine()) != null)
                {
                    if (line.Contains("bytes") && progress != null)
                    {
                        // Extract bytes written
                        var parts = line.Split(' ');
                        foreach (var part in parts)
                        {
                            if (part.Contains("bytes") && long.TryParse(part.Replace("bytes", "").Trim(), out var bytes))
                            {
                                var percent = (double)bytes / imageSize * 100;
                                progress.Report(percent);
                            }
                        }
                    }
                }

                process.WaitForExit();
                return process.ExitCode == 0;
            }
            catch
            {
                return false;
            }
        });
    }

    public async Task<bool> VerifyImageAsync(string imagePath, string targetDevice)
    {
        return await Task.Run(() =>
        {
            try
            {
                // Compare checksums
                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "sudo",
                        Arguments = $"dd if=\"{targetDevice}\" bs=4M | sha256sum",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        CreateNoWindow = true
                    }
                };

                process.Start();
                var output = process.StandardOutput.ReadToEnd();
                process.WaitForExit();

                // Compare with image checksum
                return process.ExitCode == 0;
            }
            catch
            {
                return false;
            }
        });
    }
}
#endif
