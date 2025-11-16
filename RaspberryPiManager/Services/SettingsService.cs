using System.IO;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface ISettingsService
{
    Task<bool> ApplySettingsToSDCardAsync(string deviceId, PiSettings settings, CancellationToken cancellationToken = default);
    Task<PiSettings?> LoadSettingsFromSDCardAsync(string deviceId, CancellationToken cancellationToken = default);
    Task<bool> WriteConfigFilesAsync(string bootPartitionPath, PiSettings settings, CancellationToken cancellationToken = default);
}

public class SettingsService : ISettingsService
{
    private readonly IConfigFileGenerator _configGenerator;
    private readonly IDiskManagementService _diskService;
    private readonly ILogger<SettingsService> _logger;

    public SettingsService(
        IConfigFileGenerator configGenerator,
        IDiskManagementService diskService,
        ILogger<SettingsService> logger)
    {
        _configGenerator = configGenerator;
        _diskService = diskService;
        _logger = logger;
    }

    public async Task<bool> ApplySettingsToSDCardAsync(string deviceId, PiSettings settings, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Applying settings to SD card: {DeviceId}", deviceId);

            // Get boot partition path
            var bootPath = await _diskService.GetBootPartitionPathAsync(deviceId).ConfigureAwait(false);
            if (string.IsNullOrEmpty(bootPath))
            {
                _logger.LogError("Could not find boot partition for device: {DeviceId}", deviceId);
                return false;
            }

            // Mount if not mounted
            await _diskService.MountDiskAsync(deviceId).ConfigureAwait(false);

            // Write config files
            return await WriteConfigFilesAsync(bootPath, settings, cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Settings application cancelled for: {DeviceId}", deviceId);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying settings to SD card: {DeviceId}", deviceId);
            return false;
        }
    }

    public async Task<PiSettings?> LoadSettingsFromSDCardAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        try
        {
            var bootPath = await _diskService.GetBootPartitionPathAsync(deviceId).ConfigureAwait(false);
            if (string.IsNullOrEmpty(bootPath))
                return null;

            await _diskService.MountDiskAsync(deviceId).ConfigureAwait(false);

            var settings = new PiSettings();

            // Read config files using async I/O
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
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Settings loading cancelled for: {DeviceId}", deviceId);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading settings from SD card: {DeviceId}", deviceId);
            return null;
        }
    }

    public async Task<bool> WriteConfigFilesAsync(string bootPartitionPath, PiSettings settings, CancellationToken cancellationToken = default)
    {
        try
        {
            var files = _configGenerator.GenerateAllConfigFiles(settings);

            foreach (var file in files)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var filePath = Path.Combine(bootPartitionPath, file.Key);

                if (string.IsNullOrEmpty(file.Value))
                    continue;

                // Use async file I/O (2025 best practice)
                await File.WriteAllTextAsync(filePath, file.Value, cancellationToken).ConfigureAwait(false);

                // Make firstrun.sh executable
                if (file.Key == "firstrun.sh")
                {
                    // On Windows, this won't work, but on Linux/Mac it will
                    try
                    {
                        using var process = new System.Diagnostics.Process
                        {
                            StartInfo = new System.Diagnostics.ProcessStartInfo
                            {
                                FileName = "chmod",
                                Arguments = $"+x \"{filePath}\"",
                                UseShellExecute = false,
                                CreateNoWindow = true,
                                RedirectStandardOutput = true,
                                RedirectStandardError = true
                            }
                        };
                        process.Start();
                        await process.WaitForExitAsync(cancellationToken).ConfigureAwait(false);
                    }
                    catch
                    {
                        // chmod not available on Windows, that's okay
                    }
                }
            }

            _logger.LogInformation("Config files written to: {BootPartitionPath}", bootPartitionPath);
            return true;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Config file writing cancelled");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing config files: {Message}", ex.Message);
            return false;
        }
    }
}
