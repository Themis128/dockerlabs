using System.IO;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IImageWriterService
{
    Task<bool> WriteImageAsync(string imagePath, string targetDevice, IProgress<double>? progress = null, CancellationToken cancellationToken = default);
    Task<bool> VerifyImageAsync(string imagePath, string targetDevice, CancellationToken cancellationToken = default);
    ValueTask<long> GetImageSizeAsync(string imagePath, CancellationToken cancellationToken = default);
}

public class ImageWriterService : IImageWriterService
{
    private readonly ILogger<ImageWriterService> _logger;
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

    public async Task<bool> WriteImageAsync(string imagePath, string targetDevice, IProgress<double>? progress = null, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Writing image {ImagePath} to {TargetDevice}", imagePath, targetDevice);

            // Unmount target device first
            await _diskService.UnmountDiskAsync(targetDevice).ConfigureAwait(false);

            // Write image using platform-specific writer
#if WINDOWS
            return await ((Platforms.Windows.Services.WindowsImageWriter)_imageWriter).WriteImageAsync(imagePath, targetDevice, progress).ConfigureAwait(false);
#elif LINUX
            return await ((Platforms.Linux.Services.LinuxImageWriter)_imageWriter).WriteImageAsync(imagePath, targetDevice, progress).ConfigureAwait(false);
#elif MACCATALYST || IOS
            return await ((Platforms.macOS.Services.MacImageWriter)_imageWriter).WriteImageAsync(imagePath, targetDevice, progress).ConfigureAwait(false);
#else
            return false;
#endif
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Image write cancelled for: {TargetDevice}", targetDevice);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing image to {TargetDevice}", targetDevice);
            return false;
        }
    }

    public async Task<bool> VerifyImageAsync(string imagePath, string targetDevice, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Verifying image on {TargetDevice}", targetDevice);
#if WINDOWS
            return await ((Platforms.Windows.Services.WindowsImageWriter)_imageWriter).VerifyImageAsync(imagePath, targetDevice).ConfigureAwait(false);
#elif LINUX
            return await ((Platforms.Linux.Services.LinuxImageWriter)_imageWriter).VerifyImageAsync(imagePath, targetDevice).ConfigureAwait(false);
#elif MACCATALYST || IOS
            return await ((Platforms.macOS.Services.MacImageWriter)_imageWriter).VerifyImageAsync(imagePath, targetDevice).ConfigureAwait(false);
#else
            return false;
#endif
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Image verification cancelled for: {TargetDevice}", targetDevice);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying image on {TargetDevice}", targetDevice);
            return false;
        }
    }

    public async ValueTask<long> GetImageSizeAsync(string imagePath, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(imagePath))
            return 0;

        // Use async file I/O for better performance
        var fileInfo = new FileInfo(imagePath);
        return await ValueTask.FromResult(fileInfo.Length).ConfigureAwait(false);
    }
}
