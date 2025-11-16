using System.IO;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface ISettingsService
{
    Task<bool> ApplySettingsToSDCardAsync(string deviceId, PiSettings settings);
    Task<PiSettings?> LoadSettingsFromSDCardAsync(string deviceId);
    Task<bool> WriteConfigFilesAsync(string bootPartitionPath, PiSettings settings);
}

public class SettingsService : ISettingsService
{
    private readonly IConfigFileGenerator _configGenerator;
    private readonly IDiskManagementService _diskService;
    private readonly ILogger<SettingsService>? _logger;

    public SettingsService(
        IConfigFileGenerator configGenerator,
        IDiskManagementService diskService,
        ILogger<SettingsService> logger)
    {
        _configGenerator = configGenerator;
        _diskService = diskService;
        _logger = logger;
    }

    public async Task<bool> ApplySettingsToSDCardAsync(string deviceId, PiSettings settings)
    {
        try
        {
            _logger?.LogInformation($"Applying settings to SD card: {deviceId}");

            // Get boot partition path
            var bootPath = await _diskService.GetBootPartitionPathAsync(deviceId);
            if (string.IsNullOrEmpty(bootPath))
            {
                _logger?.LogError("Could not find boot partition");
                return false;
            }

            // Mount if not mounted
            await _diskService.MountDiskAsync(deviceId);

            // Write config files
            return await WriteConfigFilesAsync(bootPath, settings);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error applying settings to SD card: {deviceId}");
            return false;
        }
    }

    public async Task<PiSettings?> LoadSettingsFromSDCardAsync(string deviceId)
    {
        try
        {
            var bootPath = await _diskService.GetBootPartitionPathAsync(deviceId);
            if (string.IsNullOrEmpty(bootPath))
                return null;

            await _diskService.MountDiskAsync(deviceId);

            var settings = new PiSettings();

            // Read config files
            var sshFile = Path.Combine(bootPath, "ssh");
            if (File.Exists(sshFile))
            {
                settings.SSH.EnableSSH = true;
            }

            var wpaFile = Path.Combine(bootPath, "wpa_supplicant.conf");
            if (File.Exists(wpaFile))
            {
                // Parse wpa_supplicant.conf
                settings.Network.EnableWiFi = true;
                // Parse SSID, password, etc.
            }

            return settings;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"Error loading settings from SD card: {deviceId}");
            return null;
        }
    }

    public async Task<bool> WriteConfigFilesAsync(string bootPartitionPath, PiSettings settings)
    {
        return await Task.Run(() =>
        {
            try
            {
                var files = _configGenerator.GenerateAllConfigFiles(settings);

                foreach (var file in files)
                {
                    var filePath = Path.Combine(bootPartitionPath, file.Key);

                    if (string.IsNullOrEmpty(file.Value))
                        continue;

                    File.WriteAllText(filePath, file.Value);

                    // Make firstrun.sh executable
                    if (file.Key == "firstrun.sh")
                    {
                        // On Windows, this won't work, but on Linux/Mac it will
                        try
                        {
                            var process = new System.Diagnostics.Process
                            {
                                StartInfo = new System.Diagnostics.ProcessStartInfo
                                {
                                    FileName = "chmod",
                                    Arguments = $"+x \"{filePath}\"",
                                    UseShellExecute = false,
                                    CreateNoWindow = true
                                }
                            };
                            process.Start();
                            process.WaitForExit();
                        }
                        catch
                        {
                            // chmod not available on Windows, that's okay
                        }
                    }
                }

                _logger?.LogInformation($"Config files written to: {bootPartitionPath}");
                return true;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Error writing config files: {ex.Message}");
                return false;
            }
        });
    }
}
