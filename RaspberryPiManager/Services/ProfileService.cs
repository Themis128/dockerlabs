using System.IO;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IProfileService
{
    Task<List<SettingsProfile>> GetProfilesAsync();
    Task<SettingsProfile?> LoadProfileAsync(string profileId);
    Task<bool> SaveProfileAsync(SettingsProfile profile);
    Task<bool> DeleteProfileAsync(string profileId);
    Task<List<ProfileTemplate>> GetTemplatesAsync();
    Task<SettingsProfile> CreateProfileFromTemplateAsync(string templateName);
}

public class ProfileService : IProfileService
{
    private readonly string _profilesDirectory;
    private readonly ILogger<ProfileService>? _logger;

    public ProfileService(ILogger<ProfileService> logger)
    {
        _profilesDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "RaspberryPiManager",
            "Profiles");

        Directory.CreateDirectory(_profilesDirectory);
        _logger = logger;
    }

    public async Task<List<SettingsProfile>> GetProfilesAsync()
    {
        return await Task.Run(() =>
        {
            var profiles = new List<SettingsProfile>();

            if (!Directory.Exists(_profilesDirectory))
                return profiles;

            foreach (var file in Directory.GetFiles(_profilesDirectory, "*.json"))
            {
                try
                {
                    var json = File.ReadAllText(file);
                    var profile = JsonConvert.DeserializeObject<SettingsProfile>(json);
                    if (profile != null)
                        profiles.Add(profile);
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, $"Error loading profile from {file}");
                }
            }

            return profiles.OrderByDescending(p => p.ModifiedDate).ToList();
        });
    }

    public async Task<SettingsProfile?> LoadProfileAsync(string profileId)
    {
        return await Task.Run(() =>
        {
            var profilePath = Path.Combine(_profilesDirectory, $"{profileId}.json");

            if (!File.Exists(profilePath))
                return null;

            try
            {
                var json = File.ReadAllText(profilePath);
                return JsonConvert.DeserializeObject<SettingsProfile>(json);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Error loading profile: {profileId}");
                return null;
            }
        });
    }

    public async Task<bool> SaveProfileAsync(SettingsProfile profile)
    {
        return await Task.Run(() =>
        {
            try
            {
                profile.ModifiedDate = DateTime.Now;
                var profilePath = Path.Combine(_profilesDirectory, $"{profile.Id}.json");
                var json = JsonConvert.SerializeObject(profile, Formatting.Indented);
                File.WriteAllText(profilePath, json);

                _logger?.LogInformation($"Profile saved: {profile.Name}");
                return true;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Error saving profile: {profile.Name}");
                return false;
            }
        });
    }

    public async Task<bool> DeleteProfileAsync(string profileId)
    {
        return await Task.Run(() =>
        {
            try
            {
                var profilePath = Path.Combine(_profilesDirectory, $"{profileId}.json");
                if (File.Exists(profilePath))
                {
                    File.Delete(profilePath);
                    _logger?.LogInformation($"Profile deleted: {profileId}");
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Error deleting profile: {profileId}");
                return false;
            }
        });
    }

    public async Task<List<ProfileTemplate>> GetTemplatesAsync()
    {
        return await Task.Run(() =>
        {
            var templates = new List<ProfileTemplate>
            {
                new ProfileTemplate
                {
                    Name = "Home Server",
                    Category = "Server",
                    Description = "Basic home server setup with SSH enabled",
                    DefaultSettings = new PiSettings
                    {
                        SSH = new SSHSettings { EnableSSH = true, EnablePasswordAuth = true },
                        System = new SystemSettings { Hostname = "home-server" }
                    }
                },
                new ProfileTemplate
                {
                    Name = "IoT Device",
                    Category = "IoT",
                    Description = "IoT device with WiFi and minimal packages",
                    DefaultSettings = new PiSettings
                    {
                        Network = new NetworkSettings { EnableWiFi = true },
                        SSH = new SSHSettings { EnableSSH = true },
                        System = new SystemSettings { Hostname = "iot-device" },
                        Packages = new PackageSettings { PackagesToInstall = new List<string> { "python3", "pip" } }
                    }
                },
                new ProfileTemplate
                {
                    Name = "Media Center",
                    Category = "Media",
                    Description = "Media center setup with required packages",
                    DefaultSettings = new PiSettings
                    {
                        SSH = new SSHSettings { EnableSSH = true },
                        System = new SystemSettings { Hostname = "media-center" },
                        Packages = new PackageSettings
                        {
                            PackagesToInstall = new List<string> { "kodi", "vlc", "ffmpeg" }
                        }
                    }
                }
            };

            return templates;
        });
    }

    public async Task<SettingsProfile> CreateProfileFromTemplateAsync(string templateName)
    {
        var templates = await GetTemplatesAsync();
        var template = templates.FirstOrDefault(t => t.Name == templateName);

        if (template == null)
            throw new ArgumentException($"Template not found: {templateName}");

        return new SettingsProfile
        {
            Name = template.Name,
            Description = template.Description,
            Settings = JsonConvert.DeserializeObject<PiSettings>(
                JsonConvert.SerializeObject(template.DefaultSettings)) ?? new PiSettings(),
            IsTemplate = false,
            TemplateCategory = template.Category
        };
    }
}
