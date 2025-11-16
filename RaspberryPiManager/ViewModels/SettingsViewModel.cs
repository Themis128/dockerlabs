using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using RaspberryPiManager.Models;
using RaspberryPiManager.Services;

namespace RaspberryPiManager.ViewModels;

public partial class SettingsViewModel : ObservableObject
{
    private readonly ISettingsService _settingsService;
    private readonly IProfileService _profileService;

    [ObservableProperty]
    private PiSettings currentSettings = new();

    [ObservableProperty]
    private SDCardInfo? selectedSDCard;

    [ObservableProperty]
    private string statusMessage = string.Empty;

    public SettingsViewModel(ISettingsService settingsService, IProfileService profileService)
    {
        _settingsService = settingsService;
        _profileService = profileService;
    }

    [RelayCommand]
    private async Task LoadSettingsFromSDCard()
    {
        if (SelectedSDCard == null)
        {
            StatusMessage = "Please select an SD card";
            return;
        }

        try
        {
            var settings = await _settingsService.LoadSettingsFromSDCardAsync(SelectedSDCard.DeviceId);
            if (settings != null)
            {
                CurrentSettings = settings;
                StatusMessage = "Settings loaded from SD card";
            }
            else
            {
                StatusMessage = "No settings found on SD card";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task ApplySettingsToSDCard()
    {
        if (SelectedSDCard == null)
        {
            StatusMessage = "Please select an SD card";
            return;
        }

        try
        {
            StatusMessage = "Applying settings...";
            var success = await _settingsService.ApplySettingsToSDCardAsync(SelectedSDCard.DeviceId, CurrentSettings);
            StatusMessage = success ? "Settings applied successfully" : "Failed to apply settings";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private Task LoadProfile(SettingsProfile? profile)
    {
        if (profile == null) return Task.CompletedTask;

        try
        {
            CurrentSettings = profile.Settings;
            StatusMessage = $"Profile '{profile.Name}' loaded";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
        return Task.CompletedTask;
    }

    [RelayCommand]
    private void AddUser()
    {
        CurrentSettings.Users.Users.Add(new UserAccount
        {
            Username = "newuser",
            HasSudo = true
        });
    }

    [RelayCommand]
    private void RemoveUser(UserAccount? user)
    {
        if (user != null)
        {
            CurrentSettings.Users.Users.Remove(user);
        }
    }

    [RelayCommand]
    private void AddPackage()
    {
        CurrentSettings.Packages.PackagesToInstall.Add("package-name");
    }

    [RelayCommand]
    private void RemovePackage(string? package)
    {
        if (package != null)
        {
            CurrentSettings.Packages.PackagesToInstall.Remove(package);
        }
    }
}
