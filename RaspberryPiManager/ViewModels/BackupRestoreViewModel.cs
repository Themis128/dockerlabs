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

    [ObservableProperty]
    private List<BackupProfile> backups = new();

    [ObservableProperty]
    private BackupProfile? selectedBackup;

    [ObservableProperty]
    private SDCardInfo? selectedSDCard;

    [ObservableProperty]
    private double backupProgress;

    [ObservableProperty]
    private double restoreProgress;

    [ObservableProperty]
    private bool isBackingUp;

    [ObservableProperty]
    private bool isRestoring;

    [ObservableProperty]
    private string statusMessage = string.Empty;

    [ObservableProperty]
    private RestoreOptions restoreOptions = new();

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
