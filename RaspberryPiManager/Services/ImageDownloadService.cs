using System.Buffers;
using System.Net.Http;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IImageDownloadService
{
    Task<List<OSImage>> GetAvailableImagesAsync(CancellationToken cancellationToken = default);
    Task<bool> DownloadImageAsync(OSImage image, string destinationPath, IProgress<double>? progress = null, CancellationToken cancellationToken = default);
    Task<bool> VerifyImageChecksumAsync(string imagePath, string expectedChecksum, CancellationToken cancellationToken = default);
}

public class ImageDownloadService : IImageDownloadService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ImageDownloadService> _logger;

    public ImageDownloadService(IHttpClientFactory httpClientFactory, ILogger<ImageDownloadService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<List<OSImage>> GetAvailableImagesAsync(CancellationToken cancellationToken = default)
    {
        // Use collection expressions (C# 12 feature)
        var images = new List<OSImage>
        {
            new()
            {
                Name = "Raspberry Pi OS (64-bit)",
                Description = "Official Raspberry Pi OS with desktop",
                OSFamily = "RaspberryPiOS",
                DownloadUrl = "https://downloads.raspberrypi.org/raspios_arm64/images/raspios_arm64-latest/",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5", "Pi 400", "CM4"]
            },
            new()
            {
                Name = "Raspberry Pi OS Lite (64-bit)",
                Description = "Official Raspberry Pi OS without desktop",
                OSFamily = "RaspberryPiOS",
                DownloadUrl = "https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-latest/",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5", "Pi 400", "CM4"]
            },
            new()
            {
                Name = "Ubuntu Server 24.04 LTS",
                Description = "Ubuntu Server for Raspberry Pi",
                OSFamily = "Ubuntu",
                DownloadUrl = "https://cdimage.ubuntu.com/releases/24.04/release/",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            }
        };

        return await Task.FromResult(images).ConfigureAwait(false);
    }

    public async Task<bool> DownloadImageAsync(OSImage image, string destinationPath, IProgress<double>? progress = null, CancellationToken cancellationToken = default)
    {
        using var httpClient = _httpClientFactory.CreateClient(nameof(ImageDownloadService));

        try
        {
            _logger.LogInformation("Downloading image: {ImageName} to {DestinationPath}", image.Name, destinationPath);

            using var response = await httpClient.GetAsync(image.DownloadUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);
            response.EnsureSuccessStatusCode();

            var totalBytes = response.Content.Headers.ContentLength ?? 0;
            var downloadedBytes = 0L;

            // Use System.IO.Pipelines for efficient I/O (2025 best practice)
            using var contentStream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
            using var fileStream = new FileStream(destinationPath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 8192, useAsync: true);

            // Use ArrayPool for buffer management (memory efficient)
            var pool = ArrayPool<byte>.Shared;
            var buffer = pool.Rent(8192);

            try
            {
                int bytesRead;
                while ((bytesRead = await contentStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken).ConfigureAwait(false)) > 0)
                {
                    await fileStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken).ConfigureAwait(false);
                    downloadedBytes += bytesRead;

                    if (totalBytes > 0 && progress != null)
                    {
                        var percent = (double)downloadedBytes / totalBytes * 100;
                        progress.Report(percent);
                    }
                }
            }
            finally
            {
                pool.Return(buffer);
            }

            _logger.LogInformation("Download completed: {DownloadedBytes} bytes", downloadedBytes);
            return true;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Download cancelled for image: {ImageName}", image.Name);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading image: {ImageName}", image.Name);
            return false;
        }
    }

    public async Task<bool> VerifyImageChecksumAsync(string imagePath, string expectedChecksum, CancellationToken cancellationToken = default)
    {
        try
        {
            // Use async file I/O with cancellation support and incremental hashing
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            await using var fileStream = new FileStream(imagePath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 8192, useAsync: true);

            // Use ArrayPool for efficient buffer management
            var pool = ArrayPool<byte>.Shared;
            var buffer = pool.Rent(8192);

            try
            {
                int bytesRead;
                while ((bytesRead = await fileStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken).ConfigureAwait(false)) > 0)
                {
                    sha256.TransformBlock(buffer, 0, bytesRead, null, 0);
                }
                sha256.TransformFinalBlock(Array.Empty<byte>(), 0, 0);

                var hashBytes = sha256.Hash ?? throw new InvalidOperationException("Hash computation failed");
                var actualChecksum = Convert.ToHexString(hashBytes).ToLowerInvariant();

                return actualChecksum.Equals(expectedChecksum, StringComparison.OrdinalIgnoreCase);
            }
            finally
            {
                pool.Return(buffer);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Checksum verification cancelled for: {ImagePath}", imagePath);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying checksum for: {ImagePath}", imagePath);
            return false;
        }
    }
}
