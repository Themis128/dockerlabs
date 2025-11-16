using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using RaspberryPiManager.Models;
using RaspberryPiManager.Services;

namespace RaspberryPiManager.ViewModels;

public partial class BackupRestoreViewModel : ObservableObject
{
    private readonly IBackupService _backupService;
    private readonly IRestoreService _restoreService;
    private readonly ISDCardService _sdCardService;

    private List<BackupProfile> _backups = new();
    public List<BackupProfile> Backups
    {
        get => _backups;
        set => SetProperty(ref _backups, value);
    }

    private BackupProfile? _selectedBackup;
    public BackupProfile? SelectedBackup
    {
        get => _selectedBackup;
        set => SetProperty(ref _selectedBackup, value);
    }

    private SDCardInfo? _selectedSDCard;
    public SDCardInfo? SelectedSDCard
    {
        get => _selectedSDCard;
        set => SetProperty(ref _selectedSDCard, value);
    }

    private double _backupProgress;
    public double BackupProgress
    {
        get => _backupProgress;
        set => SetProperty(ref _backupProgress, value);
    }

    private double _restoreProgress;
    public double RestoreProgress
    {
        get => _restoreProgress;
        set => SetProperty(ref _restoreProgress, value);
    }

    private bool _isBackingUp;
    public bool IsBackingUp
    {
        get => _isBackingUp;
        set => SetProperty(ref _isBackingUp, value);
    }

    private bool _isRestoring;
    public bool IsRestoring
    {
        get => _isRestoring;
        set => SetProperty(ref _isRestoring, value);
    }

    private string _statusMessage = string.Empty;
    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    private RestoreOptions _restoreOptions = new();
    public RestoreOptions RestoreOptions
    {
        get => _restoreOptions;
        set => SetProperty(ref _restoreOptions, value);
    }

    public BackupRestoreViewModel(
        IBackupService backupService,
        IRestoreService restoreService,
        ISDCardService sdCardService)
    {
        _backupService = backupService;
        _restoreService = restoreService;
        _sdCardService = sdCardService;
        LoadBackupsCommand.Execute(null);
    }

    [RelayCommand]
    private Task LoadBackups()
    {
        // Load backups from backup directory
        StatusMessage = "Loading backups...";
        // Implementation would scan backup directory
        return Task.CompletedTask;
    }

    [RelayCommand]
    private async Task CreateBackup()
    {
        if (SelectedSDCard == null)
        {
            StatusMessage = "Please select an SD card";
            return;
        }

        IsBackingUp = true;
        BackupProgress = 0;
        StatusMessage = "Creating backup...";

        try
        {
            var backupPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                "RaspberryPiBackups",
                $"backup_{DateTime.Now:yyyyMMdd_HHmmss}.img");

            Directory.CreateDirectory(Path.GetDirectoryName(backupPath)!);

            var backup = await _backupService.CreateBackupAsync(
                SelectedSDCard.DeviceId,
                backupPath,
                BackupType.FullImage);

            StatusMessage = $"Backup created: {backup.Name}";
            await LoadBackups();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
        finally
        {
            IsBackingUp = false;
        }
    }

    [RelayCommand]
    private async Task RestoreBackup()
    {
        if (SelectedBackup == null)
        {
            StatusMessage = "Please select a backup";
            return;
        }

        if (SelectedSDCard == null)
        {
            StatusMessage = "Please select an SD card";
            return;
        }

        IsRestoring = true;
        RestoreProgress = 0;
        StatusMessage = "Restoring backup...";

        try
        {
            RestoreOptions.TargetSDCard = SelectedSDCard.DeviceId;
            var progress = new Progress<double>(p => RestoreProgress = p);

            var success = await _restoreService.RestoreBackupAsync(SelectedBackup, RestoreOptions, progress);
            StatusMessage = success ? "Restore completed successfully" : "Restore failed";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
        finally
        {
            IsRestoring = false;
        }
    }

    [RelayCommand]
    private async Task DeleteBackup(BackupProfile? backup)
    {
        if (backup == null) return;

        try
        {
            if (File.Exists(backup.BackupFilePath))
            {
                File.Delete(backup.BackupFilePath);
            }

            var metadataPath = backup.BackupFilePath + ".meta";
            if (File.Exists(metadataPath))
            {
                File.Delete(metadataPath);
            }

            StatusMessage = "Backup deleted";
            await LoadBackups();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }
}
