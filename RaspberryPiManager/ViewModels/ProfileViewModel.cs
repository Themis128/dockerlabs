using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using RaspberryPiManager.Models;
using RaspberryPiManager.Services;

namespace RaspberryPiManager.ViewModels;

public partial class ProfileViewModel : ObservableObject
{
    private readonly IProfileService _profileService;
    private readonly ISettingsService _settingsService;

    [ObservableProperty]
    private List<SettingsProfile> profiles = new();

    [ObservableProperty]
    private SettingsProfile? selectedProfile;

    [ObservableProperty]
    private List<ProfileTemplate> templates = new();

    [ObservableProperty]
    private string statusMessage = string.Empty;

    [ObservableProperty]
    private string newProfileName = string.Empty;

    [ObservableProperty]
    private string newProfileDescription = string.Empty;

    public ProfileViewModel(IProfileService profileService, ISettingsService settingsService)
    {
        _profileService = profileService;
        _settingsService = settingsService;
        LoadProfilesCommand.Execute(null);
        LoadTemplatesCommand.Execute(null);
    }

    [RelayCommand]
    private async Task LoadProfiles()
    {
        try
        {
            Profiles = await _profileService.GetProfilesAsync();
            StatusMessage = $"Loaded {Profiles.Count} profile(s)";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task LoadTemplates()
    {
        try
        {
            Templates = await _profileService.GetTemplatesAsync();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task CreateProfileFromTemplate(ProfileTemplate? template)
    {
        if (template == null) return;

        try
        {
            var profile = await _profileService.CreateProfileFromTemplateAsync(template.Name);
            profile.Name = NewProfileName;
            profile.Description = NewProfileDescription;

            await _profileService.SaveProfileAsync(profile);
            StatusMessage = $"Profile '{profile.Name}' created";
            await LoadProfiles();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task SaveProfile()
    {
        if (SelectedProfile == null) return;

        try
        {
            await _profileService.SaveProfileAsync(SelectedProfile);
            StatusMessage = $"Profile '{SelectedProfile.Name}' saved";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task DeleteProfile(SettingsProfile? profile)
    {
        if (profile == null) return;

        try
        {
            await _profileService.DeleteProfileAsync(profile.Id);
            StatusMessage = $"Profile '{profile.Name}' deleted";
            await LoadProfiles();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task CreateNewProfile()
    {
        try
        {
            var profile = new SettingsProfile
            {
                Name = NewProfileName,
                Description = NewProfileDescription,
                Settings = new PiSettings()
            };

            await _profileService.SaveProfileAsync(profile);
            StatusMessage = $"Profile '{profile.Name}' created";
            await LoadProfiles();

            NewProfileName = string.Empty;
            NewProfileDescription = string.Empty;
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }
}
