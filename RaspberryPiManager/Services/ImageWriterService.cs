using System.IO;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IImageWriterService
{
    Task<bool> WriteImageAsync(string imagePath, string targetDevice, IProgress<double>? progress = null);
    Task<bool> VerifyImageAsync(string imagePath, string targetDevice);
    Task<long> GetImageSizeAsync(string imagePath);
}

public class ImageWriterService : IImageWriterService
{
    private readonly ILogger<ImageWriterService>? _logger;
    private readonly IDiskManagementService _diskService;

#if WINDOWS
    private readonly Platforms.Windows.Services.WindowsImageWriter _imageWriter;
#elif LINUX
    private readonly Platforms.Linux.Services.LinuxImageWriter _imageWriter;
#elif MACCATALYST || IOS
    private readonly Platforms.macOS.Services.MacImageWriter _imageWriter;
#endif

    public ImageWriterService(
        IDiskManagementService diskService,
#if WINDOWS
        Platforms.Windows.Services.WindowsImageWriter imageWriter,
#elif LINUX
        Platforms.Linux.Services.LinuxImageWriter imageWriter,
#elif MACCATALYST || IOS
        Platforms.macOS.Services.MacImageWriter imageWriter,
#else
        object imageWriter,
#endif
        ILogger<ImageWriterService> logger)
    {
        _diskService = diskService;
        _imageWriter = imageWriter;
        _logger = logger;
    }

    public async Task<bool> WriteImageAsync(string imagePath, string targetDevice, IProgress<double>? progress = null)
    {
        try
        {
            _logger?.LogInformation($"Writing image {imagePath} to {targetDevice}");

            // Unmount target device first
            await _diskService.UnmountDiskAsync(targetDevice);

            // Write image using platform-specific writer
#if WINDOWS
            return await ((Platforms.Windows.Services.WindowsImageWriter)_imageWriter).WriteImageAsync(imagePath, targetDevice, progress);
#elif LINUX
            return await ((Platforms.Linux.Services.LinuxImageWriter)_imageWriter).WriteImageAsync(imagePath, targetDevice, progress);
#elif MACCATALYST || IOS
            return await ((Platforms.macOS.Services.MacImageWriter)_imageWriter).WriteImageAsync(imagePath, targetDevice, progress);
#else
            return false;
#endif
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error writing image to {targetDevice}");
            return false;
        }
    }

    public async Task<bool> VerifyImageAsync(string imagePath, string targetDevice)
    {
        try
        {
            _logger?.LogInformation($"Verifying image on {targetDevice}");
#if WINDOWS
            return await ((Platforms.Windows.Services.WindowsImageWriter)_imageWriter).VerifyImageAsync(imagePath, targetDevice);
#elif LINUX
            return await ((Platforms.Linux.Services.LinuxImageWriter)_imageWriter).VerifyImageAsync(imagePath, targetDevice);
#elif MACCATALYST || IOS
            return await ((Platforms.macOS.Services.MacImageWriter)_imageWriter).VerifyImageAsync(imagePath, targetDevice);
#else
            return false;
#endif
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error verifying image on {targetDevice}");
            return false;
        }
    }

    public async Task<long> GetImageSizeAsync(string imagePath)
    {
        return await Task.Run(() =>
        {
            if (!File.Exists(imagePath))
                return 0;

            return new FileInfo(imagePath).Length;
        });
    }
}
