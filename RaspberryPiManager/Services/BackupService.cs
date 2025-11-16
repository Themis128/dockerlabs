using System.Buffers;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IBackupService
{
    Task<BackupProfile> CreateBackupAsync(string deviceId, string backupPath, BackupType type, PiSettings? settings = null, CancellationToken cancellationToken = default);
    Task<bool> CompressBackupAsync(string backupPath, string compressedPath, CancellationToken cancellationToken = default);
    Task<string> CalculateChecksumAsync(string filePath, CancellationToken cancellationToken = default);
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

    public async Task<BackupProfile> CreateBackupAsync(string deviceId, string backupPath, BackupType type, PiSettings? settings = null, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger?.LogInformation("Creating backup of {DeviceId} to {BackupPath}", deviceId, backupPath);

            var backup = new BackupProfile
            {
                Name = Path.GetFileNameWithoutExtension(backupPath),
                CreatedDate = DateTime.UtcNow, // Use UTC for consistency
                BackupFilePath = backupPath,
                Type = type,
                Settings = settings
            };

            if (type == BackupType.FullImage)
            {
                // Create full disk image using dd or similar
                await CreateFullImageBackupAsync(deviceId, backupPath, cancellationToken).ConfigureAwait(false);
                backup.BackupSizeBytes = new FileInfo(backupPath).Length;
            }
            else if (type == BackupType.SettingsOnly)
            {
                // Backup only settings files
                await CreateSettingsBackupAsync(deviceId, backupPath, settings, cancellationToken).ConfigureAwait(false);
                backup.BackupSizeBytes = new FileInfo(backupPath).Length;
            }

            // Calculate checksum
            backup.Checksum = await CalculateChecksumAsync(backupPath, cancellationToken).ConfigureAwait(false);

            // Save metadata using async I/O
            var metadataPath = backupPath + ".meta";
            var metadataJson = JsonConvert.SerializeObject(backup, Formatting.Indented);
            await File.WriteAllTextAsync(metadataPath, metadataJson, cancellationToken).ConfigureAwait(false);

            _logger?.LogInformation("Backup created: {BackupPath}", backupPath);
            return backup;
        }
        catch (OperationCanceledException)
        {
            _logger?.LogWarning("Backup creation cancelled for: {DeviceId}", deviceId);
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error creating backup: {Message}", ex.Message);
            throw;
        }
    }

    public async Task<bool> CompressBackupAsync(string backupPath, string compressedPath, CancellationToken cancellationToken = default)
    {
        try
        {
            // Use async file I/O with ArrayPool for efficient streaming
            await using var sourceStream = new FileStream(backupPath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 8192, useAsync: true);
            await using var targetStream = new FileStream(compressedPath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 8192, useAsync: true);
            await using var compressionStream = new GZipStream(targetStream, CompressionLevel.Optimal, leaveOpen: false);

            // Use ArrayPool for buffer management
            var pool = ArrayPool<byte>.Shared;
            var buffer = pool.Rent(8192);

            try
            {
                int bytesRead;
                while ((bytesRead = await sourceStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken).ConfigureAwait(false)) > 0)
                {
                    await compressionStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken).ConfigureAwait(false);
                }
            }
            finally
            {
                pool.Return(buffer);
            }

            return true;
        }
        catch (OperationCanceledException)
        {
            _logger?.LogWarning("Compression cancelled for: {BackupPath}", backupPath);
            return false;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error compressing backup: {Message}", ex.Message);
            return false;
        }
    }

    public async Task<string> CalculateChecksumAsync(string filePath, CancellationToken cancellationToken = default)
    {
        try
        {
            // Use async file I/O with incremental hashing for better performance
            using var sha256 = SHA256.Create();
            await using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 8192, useAsync: true);

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
                return Convert.ToHexString(hashBytes).ToLowerInvariant();
            }
            finally
            {
                pool.Return(buffer);
            }
        }
        catch (OperationCanceledException)
        {
            _logger?.LogWarning("Checksum calculation cancelled for: {FilePath}", filePath);
            throw;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error calculating checksum for: {FilePath}", filePath);
            throw;
        }
    }

    private async Task CreateFullImageBackupAsync(string deviceId, string backupPath, CancellationToken cancellationToken = default)
    {
        // Use platform-specific dd command to create full disk image
        using var process = new System.Diagnostics.Process
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
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            }
        };

        process.Start();
        await process.WaitForExitAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task CreateSettingsBackupAsync(string deviceId, string backupPath, PiSettings? settings, CancellationToken cancellationToken = default)
    {
        if (settings == null)
            return;

        var settingsJson = JsonConvert.SerializeObject(settings, Formatting.Indented);
        await File.WriteAllTextAsync(backupPath, settingsJson, cancellationToken).ConfigureAwait(false);
    }
}
