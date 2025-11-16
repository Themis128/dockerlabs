using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IBackupService
{
    Task<BackupProfile> CreateBackupAsync(string deviceId, string backupPath, BackupType type, PiSettings? settings = null);
    Task<bool> CompressBackupAsync(string backupPath, string compressedPath);
    Task<string> CalculateChecksumAsync(string filePath);
}

public class BackupService : IBackupService
{
    private readonly IImageWriterService _imageWriter;
    private readonly IDiskManagementService _diskService;
    private readonly ILogger<BackupService>? _logger;

    public BackupService(
        IImageWriterService imageWriter,
        IDiskManagementService diskService,
        ILogger<BackupService> logger)
    {
        _imageWriter = imageWriter;
        _diskService = diskService;
        _logger = logger;
    }

    public async Task<BackupProfile> CreateBackupAsync(string deviceId, string backupPath, BackupType type, PiSettings? settings = null)
    {
        try
        {
            _logger?.LogInformation($"Creating backup of {deviceId} to {backupPath}");

            var backup = new BackupProfile
            {
                Name = Path.GetFileNameWithoutExtension(backupPath),
                CreatedDate = DateTime.Now,
                BackupFilePath = backupPath,
                Type = type,
                Settings = settings
            };

            if (type == BackupType.FullImage)
            {
                // Create full disk image using dd or similar
                await CreateFullImageBackupAsync(deviceId, backupPath);
                backup.BackupSizeBytes = new FileInfo(backupPath).Length;
            }
            else if (type == BackupType.SettingsOnly)
            {
                // Backup only settings files
                await CreateSettingsBackupAsync(deviceId, backupPath, settings);
                backup.BackupSizeBytes = new FileInfo(backupPath).Length;
            }

            // Calculate checksum
            backup.Checksum = await CalculateChecksumAsync(backupPath);

            // Save metadata
            var metadataPath = backupPath + ".meta";
            var metadataJson = JsonConvert.SerializeObject(backup, Formatting.Indented);
            await File.WriteAllTextAsync(metadataPath, metadataJson);

            _logger?.LogInformation($"Backup created: {backupPath}");
            return backup;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error creating backup: {ex.Message}");
            throw;
        }
    }

    public async Task<bool> CompressBackupAsync(string backupPath, string compressedPath)
    {
        return await Task.Run(() =>
        {
            try
            {
                using var sourceStream = File.OpenRead(backupPath);
                using var targetStream = File.Create(compressedPath);
                using var compressionStream = new GZipStream(targetStream, CompressionMode.Compress);

                sourceStream.CopyTo(compressionStream);

                return true;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Error compressing backup: {ex.Message}");
                return false;
            }
        });
    }

    public async Task<string> CalculateChecksumAsync(string filePath)
    {
        return await Task.Run(() =>
        {
            using var sha256 = SHA256.Create();
            using var fileStream = File.OpenRead(filePath);
            var hashBytes = sha256.ComputeHash(fileStream);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
        });
    }

    private async Task CreateFullImageBackupAsync(string deviceId, string backupPath)
    {
        // Use platform-specific dd command to create full disk image
        await Task.Run(() =>
        {
            var process = new System.Diagnostics.Process
            {
                StartInfo = new System.Diagnostics.ProcessStartInfo
                {
#if WINDOWS
                    FileName = "dd",
                    Arguments = $"if=\"{deviceId}\" of=\"{backupPath}\" bs=4M",
#elif LINUX
                    FileName = "sudo",
                    Arguments = $"dd if=\"{deviceId}\" of=\"{backupPath}\" bs=4M status=progress",
#elif MACCATALYST || IOS
                    FileName = "sudo",
                    Arguments = $"dd if=\"{deviceId}\" of=\"{backupPath}\" bs=4m status=progress",
#endif
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };

            process.Start();
            process.WaitForExit();
        });
    }

    private async Task CreateSettingsBackupAsync(string deviceId, string backupPath, PiSettings? settings)
    {
        if (settings == null)
            return;

        var settingsJson = JsonConvert.SerializeObject(settings, Formatting.Indented);
        await File.WriteAllTextAsync(backupPath, settingsJson);
    }
}
