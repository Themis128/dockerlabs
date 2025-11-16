using System.IO.Compression;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IRestoreService
{
    Task<bool> RestoreBackupAsync(BackupProfile backup, RestoreOptions options, IProgress<double>? progress = null);
    Task<BackupProfile?> LoadBackupMetadataAsync(string backupPath);
    Task<bool> VerifyBackupAsync(string backupPath, string expectedChecksum);
}

public class RestoreService : IRestoreService
{
    private readonly IImageWriterService _imageWriter;
    private readonly IDiskManagementService _diskService;
    private readonly IBackupService _backupService;
    private readonly ILogger<RestoreService>? _logger;

    public RestoreService(
        IImageWriterService imageWriter,
        IDiskManagementService diskService,
        IBackupService backupService,
        ILogger<RestoreService> logger)
    {
        _imageWriter = imageWriter;
        _diskService = diskService;
        _backupService = backupService;
        _logger = logger;
    }

    public async Task<bool> RestoreBackupAsync(BackupProfile backup, RestoreOptions options, IProgress<double>? progress = null)
    {
        try
        {
            _logger?.LogInformation($"Restoring backup {backup.BackupFilePath} to {options.TargetSDCard}");

            // Verify backup
            if (!string.IsNullOrEmpty(backup.Checksum))
            {
                var isValid = await VerifyBackupAsync(backup.BackupFilePath, backup.Checksum);
                if (!isValid)
                {
                    _logger?.LogError("Backup checksum verification failed");
                    return false;
                }
            }

            // Format target if requested
            if (options.FormatBeforeRestore)
            {
                await _diskService.FormatDiskAsync(options.TargetSDCard, "FAT32");
            }

            // Restore based on type
            if (backup.Type == BackupType.FullImage && options.RestoreOS)
            {
                // Decompress if needed
                var imagePath = backup.BackupFilePath;
                if (backup.IsCompressed)
                {
                    imagePath = await DecompressBackupAsync(backup.BackupFilePath);
                }

                // Write image
                var success = await _imageWriter.WriteImageAsync(imagePath, options.TargetSDCard, progress);
                if (!success)
                    return false;

                // Verify if requested
                if (options.VerifyAfterRestore)
                {
                    return await _imageWriter.VerifyImageAsync(imagePath, options.TargetSDCard);
                }
            }

            // Restore settings if requested
            if (options.RestoreSettings && backup.Settings != null)
            {
                // Note: This creates a new instance - in production, should use DI
                var settingsService = new SettingsService(
                    new ConfigFileGenerator(),
                    _diskService,
                    Microsoft.Extensions.Logging.Abstractions.NullLogger<SettingsService>.Instance);

                await settingsService.ApplySettingsToSDCardAsync(options.TargetSDCard, backup.Settings);
            }

            _logger?.LogInformation("Restore completed successfully");
            return true;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error restoring backup: {ex.Message}");
            return false;
        }
    }

    public async Task<BackupProfile?> LoadBackupMetadataAsync(string backupPath)
    {
        return await Task.Run(() =>
        {
            try
            {
                var metadataPath = backupPath + ".meta";
                if (!File.Exists(metadataPath))
                    return null;

                var metadataJson = File.ReadAllText(metadataPath);
                return JsonConvert.DeserializeObject<BackupProfile>(metadataJson);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Error loading backup metadata: {ex.Message}");
                return null;
            }
        });
    }

    public async Task<bool> VerifyBackupAsync(string backupPath, string expectedChecksum)
    {
        var actualChecksum = await _backupService.CalculateChecksumAsync(backupPath);
        return actualChecksum.Equals(expectedChecksum, StringComparison.OrdinalIgnoreCase);
    }

    private async Task<string> DecompressBackupAsync(string compressedPath)
    {
        return await Task.Run(() =>
        {
            var decompressedPath = compressedPath.Replace(".gz", "");

            using var sourceStream = File.OpenRead(compressedPath);
            using var targetStream = File.Create(decompressedPath);
            using var decompressionStream = new GZipStream(sourceStream, CompressionMode.Decompress);

            decompressionStream.CopyTo(targetStream);

            return decompressedPath;
        });
    }
}
