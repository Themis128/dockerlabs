using System.Collections.ObjectModel;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface ISDCardService
{
    Task<ObservableCollection<SDCardInfo>> GetSDCardsAsync();
    Task<bool> FormatSDCardAsync(string deviceId, string fileSystem = "FAT32");
    Task<bool> EjectSDCardAsync(string deviceId);
    Task<bool> MountSDCardAsync(string deviceId);
    Task<bool> UnmountSDCardAsync(string deviceId);
    Task<SDCardInfo?> GetSDCardInfoAsync(string deviceId);
}

public class SDCardService : ISDCardService
{
    private readonly ILogger<SDCardService>? _logger;
    private readonly IDiskManagementService _diskService;

    public SDCardService(IDiskManagementService diskService, ILogger<SDCardService> logger)
    {
        _diskService = diskService;
        _logger = logger;
    }

    public async Task<ObservableCollection<SDCardInfo>> GetSDCardsAsync()
    {
        return await Task.Run(async () =>
        {
            var cards = new ObservableCollection<SDCardInfo>();
            var disks = await _diskService.GetRemovableDisksAsync();

            foreach (var disk in disks)
            {
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

                cards.Add(cardInfo);
            }

            return cards;
        });
    }

    public async Task<bool> FormatSDCardAsync(string deviceId, string fileSystem = "FAT32")
    {
        try
        {
            _logger?.LogInformation($"Formatting SD card: {deviceId} with {fileSystem}");
            return await _diskService.FormatDiskAsync(deviceId, fileSystem);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error formatting SD card: {deviceId}");
            return false;
        }
    }

    public async Task<bool> EjectSDCardAsync(string deviceId)
    {
        try
        {
            _logger?.LogInformation($"Ejecting SD card: {deviceId}");
            return await _diskService.EjectDiskAsync(deviceId);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error ejecting SD card: {deviceId}");
            return false;
        }
    }

    public async Task<bool> MountSDCardAsync(string deviceId)
    {
        try
        {
            _logger?.LogInformation($"Mounting SD card: {deviceId}");
            return await _diskService.MountDiskAsync(deviceId);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error mounting SD card: {deviceId}");
            return false;
        }
    }

    public async Task<bool> UnmountSDCardAsync(string deviceId)
    {
        try
        {
            _logger?.LogInformation($"Unmounting SD card: {deviceId}");
            return await _diskService.UnmountDiskAsync(deviceId);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error unmounting SD card: {deviceId}");
            return false;
        }
    }

    public async Task<SDCardInfo?> GetSDCardInfoAsync(string deviceId)
    {
        var cards = await GetSDCardsAsync();
        return cards.FirstOrDefault(c => c.DeviceId == deviceId);
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
