using System.Net.Http;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IImageDownloadService
{
    Task<List<OSImage>> GetAvailableImagesAsync();
    Task<bool> DownloadImageAsync(OSImage image, string destinationPath, IProgress<double>? progress = null);
    Task<bool> VerifyImageChecksumAsync(string imagePath, string expectedChecksum);
}

public class ImageDownloadService : IImageDownloadService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ImageDownloadService>? _logger;

    public ImageDownloadService(HttpClient httpClient, ILogger<ImageDownloadService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<List<OSImage>> GetAvailableImagesAsync()
    {
        return await Task.Run(() =>
        {
            var images = new List<OSImage>
            {
                new OSImage
                {
                    Name = "Raspberry Pi OS (64-bit)",
                    Description = "Official Raspberry Pi OS with desktop",
                    OSFamily = "RaspberryPiOS",
                    DownloadUrl = "https://downloads.raspberrypi.org/raspios_arm64/images/raspios_arm64-latest/",
                    IsOfficial = true,
                    SupportedModels = new List<string> { "Pi 4", "Pi 5", "Pi 400", "CM4" }
                },
                new OSImage
                {
                    Name = "Raspberry Pi OS Lite (64-bit)",
                    Description = "Official Raspberry Pi OS without desktop",
                    OSFamily = "RaspberryPiOS",
                    DownloadUrl = "https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-latest/",
                    IsOfficial = true,
                    SupportedModels = new List<string> { "Pi 4", "Pi 5", "Pi 400", "CM4" }
                },
                new OSImage
                {
                    Name = "Ubuntu Server 24.04 LTS",
                    Description = "Ubuntu Server for Raspberry Pi",
                    OSFamily = "Ubuntu",
                    DownloadUrl = "https://cdimage.ubuntu.com/releases/24.04/release/",
                    IsOfficial = true,
                    SupportedModels = new List<string> { "Pi 4", "Pi 5" }
                }
            };

            return images;
        });
    }

    public async Task<bool> DownloadImageAsync(OSImage image, string destinationPath, IProgress<double>? progress = null)
    {
        try
        {
            _logger?.LogInformation($"Downloading image: {image.Name} to {destinationPath}");

            using var response = await _httpClient.GetAsync(image.DownloadUrl, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            var totalBytes = response.Content.Headers.ContentLength ?? 0;
            var downloadedBytes = 0L;

            using var fileStream = new FileStream(destinationPath, FileMode.Create, FileAccess.Write, FileShare.None);
            using var contentStream = await response.Content.ReadAsStreamAsync();

            var buffer = new byte[8192];
            int bytesRead;

            while ((bytesRead = await contentStream.ReadAsync(buffer, 0, buffer.Length)) > 0)
            {
                await fileStream.WriteAsync(buffer, 0, bytesRead);
                downloadedBytes += bytesRead;

                if (totalBytes > 0 && progress != null)
                {
                    var percent = (double)downloadedBytes / totalBytes * 100;
                    progress.Report(percent);
                }
            }

            _logger?.LogInformation($"Download completed: {downloadedBytes} bytes");
            return true;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error downloading image: {image.Name}");
            return false;
        }
    }

    public async Task<bool> VerifyImageChecksumAsync(string imagePath, string expectedChecksum)
    {
        return await Task.Run(() =>
        {
            try
            {
                // Calculate SHA256 of file
                using var sha256 = System.Security.Cryptography.SHA256.Create();
                using var fileStream = File.OpenRead(imagePath);
                var hashBytes = sha256.ComputeHash(fileStream);
                var actualChecksum = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();

                return actualChecksum.Equals(expectedChecksum, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        });
    }
}
