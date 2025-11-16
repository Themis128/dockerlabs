using System.Collections.ObjectModel;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface ISDCardService
{
    IAsyncEnumerable<SDCardInfo> GetSDCardsAsync(CancellationToken cancellationToken = default);
    ValueTask<bool> FormatSDCardAsync(string deviceId, string fileSystem = "FAT32", CancellationToken cancellationToken = default);
    ValueTask<bool> EjectSDCardAsync(string deviceId, CancellationToken cancellationToken = default);
    ValueTask<bool> MountSDCardAsync(string deviceId, CancellationToken cancellationToken = default);
    ValueTask<bool> UnmountSDCardAsync(string deviceId, CancellationToken cancellationToken = default);
    ValueTask<SDCardInfo?> GetSDCardInfoAsync(string deviceId, CancellationToken cancellationToken = default);
}

public class SDCardService : ISDCardService
{
    private readonly ILogger<SDCardService> _logger;
    private readonly IDiskManagementService _diskService;

    public SDCardService(IDiskManagementService diskService, ILogger<SDCardService> logger)
    {
        _diskService = diskService;
        _logger = logger;
    }

    public async IAsyncEnumerable<SDCardInfo> GetSDCardsAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        // Use IAsyncEnumerable for streaming results (2025 best practice)
        var disks = await _diskService.GetRemovableDisksAsync().ConfigureAwait(false);

        foreach (var disk in disks)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var cardInfo = new SDCardInfo
            {
                DeviceId = disk.DeviceId,
                DriveLetter = disk.DriveLetter,
                MountPoint = disk.MountPoint,
                Label = disk.Label,
                TotalSizeBytes = disk.TotalSizeBytes,
                FreeSpaceBytes = disk.FreeSpaceBytes,
                FileSystem = disk.FileSystem,
                IsRemovable = true,
                IsFormatted = !string.IsNullOrEmpty(disk.FileSystem),
                IsMounted = disk.IsMounted,
                Partitions = disk.Partitions.Select(p => new PartitionInfo
                {
                    PartitionId = p.PartitionId,
                    PartitionNumber = p.PartitionNumber,
                    SizeBytes = p.SizeBytes,
                    FileSystem = p.FileSystem,
                    Label = p.Label,
                    IsBootPartition = p.IsBootPartition,
                    MountPoint = p.MountPoint
                }).ToList(),
                Status = DetermineStatus(disk)
            };

            yield return cardInfo;
        }
    }

    public async ValueTask<bool> FormatSDCardAsync(string deviceId, string fileSystem = "FAT32", CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Formatting SD card: {DeviceId} with {FileSystem}", deviceId, fileSystem);
            return await _diskService.FormatDiskAsync(deviceId, fileSystem).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Format operation cancelled for: {DeviceId}", deviceId);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error formatting SD card: {DeviceId}", deviceId);
            return false;
        }
    }

    public async ValueTask<bool> EjectSDCardAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Ejecting SD card: {DeviceId}", deviceId);
            return await _diskService.EjectDiskAsync(deviceId).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Eject operation cancelled for: {DeviceId}", deviceId);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ejecting SD card: {DeviceId}", deviceId);
            return false;
        }
    }

    public async ValueTask<bool> MountSDCardAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Mounting SD card: {DeviceId}", deviceId);
            return await _diskService.MountDiskAsync(deviceId).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Mount operation cancelled for: {DeviceId}", deviceId);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error mounting SD card: {DeviceId}", deviceId);
            return false;
        }
    }

    public async ValueTask<bool> UnmountSDCardAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Unmounting SD card: {DeviceId}", deviceId);
            return await _diskService.UnmountDiskAsync(deviceId).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Unmount operation cancelled for: {DeviceId}", deviceId);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unmounting SD card: {DeviceId}", deviceId);
            return false;
        }
    }

    public async ValueTask<SDCardInfo?> GetSDCardInfoAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        await foreach (var card in GetSDCardsAsync(cancellationToken).ConfigureAwait(false))
        {
            if (card.DeviceId == deviceId)
                return card;
        }
        return null;
    }

    private SDCardStatus DetermineStatus(DiskInfo disk)
    {
        if (!disk.IsMounted && string.IsNullOrEmpty(disk.FileSystem))
            return SDCardStatus.NotFormatted;

        if (disk.IsMounted)
            return SDCardStatus.InUse;

        return SDCardStatus.Ready;
    }
}
