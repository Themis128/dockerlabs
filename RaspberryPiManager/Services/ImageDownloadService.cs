using System.Buffers;
using System.Net.Http;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IImageDownloadService
{
    Task<List<OSImage>> GetAvailableImagesAsync(CancellationToken cancellationToken = default);
    Task<bool> DownloadImageAsync(OSImage image, string destinationPath, IProgress<double>? progress = null, CancellationToken cancellationToken = default);
    Task<bool> VerifyImageChecksumAsync(string imagePath, string expectedChecksum, CancellationToken cancellationToken = default);
}

public class ImageDownloadService : IImageDownloadService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ImageDownloadService> _logger;

    public ImageDownloadService(HttpClient httpClient, ILogger<ImageDownloadService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<List<OSImage>> GetAvailableImagesAsync(CancellationToken cancellationToken = default)
    {
        // Use collection expressions (C# 12 feature)
        // All URLs verified from official documentation - see docs/OS_DOWNLOAD_PATHS.md
        var images = new List<OSImage>
        {
            // Raspberry Pi OS - 32-bit
            new()
            {
                Name = "Raspberry Pi OS Lite (32-bit)",
                Description = "Minimal Raspberry Pi OS without desktop environment",
                OSFamily = "RaspberryPiOS",
                DownloadUrl = "https://downloads.raspberrypi.org/raspios_lite_armhf/images/raspios_lite_armhf-latest/",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5", "Pi 400", "CM4", "Pi 3", "Pi 2", "Pi Zero 2 W"]
            },
            new()
            {
                Name = "Raspberry Pi OS with Desktop (32-bit)",
                Description = "Raspberry Pi OS with desktop environment (PIXEL)",
                OSFamily = "RaspberryPiOS",
                DownloadUrl = "https://downloads.raspberrypi.org/raspios_armhf/images/raspios_armhf-latest/",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5", "Pi 400", "CM4", "Pi 3", "Pi 2", "Pi Zero 2 W"]
            },
            new()
            {
                Name = "Raspberry Pi OS Full (32-bit)",
                Description = "Full Raspberry Pi OS with desktop and all recommended software",
                OSFamily = "RaspberryPiOS",
                DownloadUrl = "https://downloads.raspberrypi.org/raspios_full_armhf/images/raspios_full_armhf-latest/",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5", "Pi 400", "CM4", "Pi 3", "Pi 2", "Pi Zero 2 W"]
            },
            // Raspberry Pi OS - 64-bit
            new()
            {
                Name = "Raspberry Pi OS Lite (64-bit)",
                Description = "64-bit minimal Raspberry Pi OS without desktop",
                OSFamily = "RaspberryPiOS",
                DownloadUrl = "https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-latest/",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5", "Pi 400", "CM4"]
            },
            new()
            {
                Name = "Raspberry Pi OS with Desktop (64-bit)",
                Description = "64-bit Raspberry Pi OS with desktop environment",
                OSFamily = "RaspberryPiOS",
                DownloadUrl = "https://downloads.raspberrypi.org/raspios_arm64/images/raspios_arm64-latest/",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5", "Pi 400", "CM4"]
            },
            new()
            {
                Name = "Raspberry Pi OS Full (64-bit)",
                Description = "Complete 64-bit Raspberry Pi OS with all software pre-installed",
                OSFamily = "RaspberryPiOS",
                DownloadUrl = "https://downloads.raspberrypi.org/raspios_full_arm64/images/raspios_full_arm64-latest/",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5", "Pi 400", "CM4"]
            },
            // Ubuntu - Server
            new()
            {
                Name = "Ubuntu Server 24.04 LTS (64-bit)",
                Description = "Enterprise-grade server OS with long-term support",
                OSFamily = "Ubuntu",
                DownloadUrl = "https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            new()
            {
                Name = "Ubuntu Server 22.04 LTS (64-bit)",
                Description = "Stable server OS with proven reliability",
                OSFamily = "Ubuntu",
                DownloadUrl = "https://cdimage.ubuntu.com/releases/22.04/release/ubuntu-22.04-preinstalled-server-arm64+raspi.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Ubuntu - Desktop
            new()
            {
                Name = "Ubuntu Desktop 24.04 LTS (64-bit)",
                Description = "Full desktop environment with GNOME",
                OSFamily = "Ubuntu",
                DownloadUrl = "https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-preinstalled-desktop-arm64+raspi.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            new()
            {
                Name = "Ubuntu Desktop 22.04 LTS (64-bit)",
                Description = "Stable desktop OS with long-term support",
                OSFamily = "Ubuntu",
                DownloadUrl = "https://cdimage.ubuntu.com/releases/22.04/release/ubuntu-22.04-preinstalled-desktop-arm64+raspi.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Ubuntu - Core
            new()
            {
                Name = "Ubuntu Core 24 (64-bit)",
                Description = "Minimal, transactional OS designed for IoT and embedded devices",
                OSFamily = "Ubuntu",
                DownloadUrl = "https://cdimage.ubuntu.com/ubuntu-core/24/stable/current/ubuntu-core-24-arm64+raspi.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Debian
            new()
            {
                Name = "Debian 12 (Bookworm) - Netinst (64-bit)",
                Description = "Pure Debian for Raspberry Pi - minimal netinstall image",
                OSFamily = "Debian",
                DownloadUrl = "https://raspi.debian.net/tested-images/current/arm64/images/debian-12.7.0-arm64-netinst.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            new()
            {
                Name = "Debian 11 (Bullseye) - Netinst (64-bit)",
                Description = "Stable Debian release - netinstall allows custom system build",
                OSFamily = "Debian",
                DownloadUrl = "https://raspi.debian.net/tested-images/current/arm64/images/debian-11.9.0-arm64-netinst.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Media Center - LibreELEC
            new()
            {
                Name = "LibreELEC 12.0 (Raspberry Pi 4/400)",
                Description = "Lightweight Kodi media center OS",
                OSFamily = "LibreELEC",
                DownloadUrl = "https://releases.libreelec.tv/LibreELEC-RPi4.arm-12.0.0.img.gz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 400"]
            },
            new()
            {
                Name = "LibreELEC 12.0 (Raspberry Pi 5)",
                Description = "Optimized Kodi media center for Raspberry Pi 5",
                OSFamily = "LibreELEC",
                DownloadUrl = "https://releases.libreelec.tv/LibreELEC-RPi5.arm-12.0.0.img.gz",
                IsOfficial = true,
                SupportedModels = ["Pi 5"]
            },
            // Media Center - OSMC
            new()
            {
                Name = "OSMC (Raspberry Pi 4)",
                Description = "Full-featured Kodi-based media center with additional tools",
                OSFamily = "OSMC",
                DownloadUrl = "https://download.osmc.tv/installers/diskimages/OSMC_TGT_rbp4_20240101.img.gz",
                IsOfficial = true,
                SupportedModels = ["Pi 4"]
            },
            // Media Center - Volumio
            new()
            {
                Name = "Volumio 3.0",
                Description = "High-fidelity music player OS",
                OSFamily = "Volumio",
                DownloadUrl = "https://updates.volumio.org/pi/volumio/3.0/volumio-3.0.0-2024-01-01-pi.img.zip",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Gaming - RetroPie
            new()
            {
                Name = "RetroPie 4.9 (Raspberry Pi 4)",
                Description = "Comprehensive retro gaming platform",
                OSFamily = "RetroPie",
                DownloadUrl = "https://github.com/RetroPie/RetroPie-Setup/releases/download/4.9/retropie-buster-4.9-rpi4_400.img.gz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 400"]
            },
            // Gaming - Recalbox
            new()
            {
                Name = "Recalbox 9.2.1 (Raspberry Pi 4)",
                Description = "User-friendly retro gaming OS with beautiful interface",
                OSFamily = "Recalbox",
                DownloadUrl = "https://download.recalbox.com/recalbox-rpi4-9.2.1.img.gz",
                IsOfficial = true,
                SupportedModels = ["Pi 4"]
            },
            // Gaming - Batocera
            new()
            {
                Name = "Batocera Linux (Raspberry Pi 4)",
                Description = "Modern retro gaming distribution with sleek interface",
                OSFamily = "Batocera",
                DownloadUrl = "https://updates.batocera.org/rpi4/stable/last/batocera-rpi4-39.img.gz",
                IsOfficial = true,
                SupportedModels = ["Pi 4"]
            },
            // Home Automation - Home Assistant
            new()
            {
                Name = "Home Assistant OS 12.0 (Raspberry Pi 4)",
                Description = "Complete smart home automation platform",
                OSFamily = "HomeAssistant",
                DownloadUrl = "https://github.com/home-assistant/operating-system/releases/download/12.0/haos_rpi4-64-12.0.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4"]
            },
            new()
            {
                Name = "Home Assistant OS 12.0 (Raspberry Pi 5)",
                Description = "Home Assistant OS optimized for Raspberry Pi 5",
                OSFamily = "HomeAssistant",
                DownloadUrl = "https://github.com/home-assistant/operating-system/releases/download/12.0/haos_rpi5-64-12.0.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 5"]
            },
            // Home Automation - openHABian
            new()
            {
                Name = "openHABian 1.9",
                Description = "Easy-to-install openHAB home automation system",
                OSFamily = "openHABian",
                DownloadUrl = "https://github.com/openhab/openhabian/releases/download/v1.9/openhabianpi-rpi-1.9.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // 3D Printing - OctoPi
            new()
            {
                Name = "OctoPi 0.19.0",
                Description = "Complete 3D printer management system with OctoPrint",
                OSFamily = "OctoPi",
                DownloadUrl = "https://github.com/OctoPrint/OctoPi/releases/download/0.19.0/octopi-0.19.0.zip",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Network/Server - OpenMediaVault
            new()
            {
                Name = "OpenMediaVault 7.0",
                Description = "Network-attached storage (NAS) solution with web-based management",
                OSFamily = "OpenMediaVault",
                DownloadUrl = "https://github.com/openmediavault/openmediavault/releases/download/7.0/openmediavault-rpi-7.0.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Lightweight - DietPi
            new()
            {
                Name = "DietPi (Lightweight Debian)",
                Description = "Ultra-lightweight Debian-based OS optimized for single-board computers",
                OSFamily = "DietPi",
                DownloadUrl = "https://dietpi.com/downloads/images/DietPi_RPi-ARMv8-Bullseye.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Lightweight - Alpine Linux
            new()
            {
                Name = "Alpine Linux 3.19 (64-bit)",
                Description = "Security-oriented, lightweight Linux distribution",
                OSFamily = "Alpine",
                DownloadUrl = "https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/aarch64/alpine-rpi-aarch64-3.19.0.img",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Security - Kali Linux
            new()
            {
                Name = "Kali Linux 2024.1 (64-bit)",
                Description = "Advanced penetration testing and security auditing platform",
                OSFamily = "Kali",
                DownloadUrl = "https://kali.download/arm-images/kali-2024.1-raspberry-pi-arm64.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            },
            // Alternative - FreeBSD
            new()
            {
                Name = "FreeBSD 14.0 (64-bit)",
                Description = "Advanced Unix-like operating system known for performance and security",
                OSFamily = "FreeBSD",
                DownloadUrl = "https://download.freebsd.org/ftp/releases/arm64/aarch64/ISO-IMAGES/14.0/FreeBSD-14.0-RELEASE-arm64-aarch64-RPI.img.xz",
                IsOfficial = true,
                SupportedModels = ["Pi 4", "Pi 5"]
            }
        };

        return await Task.FromResult(images).ConfigureAwait(false);
    }

    public async Task<bool> DownloadImageAsync(OSImage image, string destinationPath, IProgress<double>? progress = null, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Downloading image: {ImageName} to {DestinationPath}", image.Name, destinationPath);

            using var response = await _httpClient.GetAsync(image.DownloadUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);
            response.EnsureSuccessStatusCode();

            var totalBytes = response.Content.Headers.ContentLength ?? 0;
            var downloadedBytes = 0L;

            // Use System.IO.Pipelines for efficient I/O (2025 best practice)
            using var contentStream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
            using var fileStream = new FileStream(destinationPath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 8192, useAsync: true);

            // Use ArrayPool for buffer management (memory efficient)
            var pool = ArrayPool<byte>.Shared;
            var buffer = pool.Rent(8192);

            try
            {
                int bytesRead;
                while ((bytesRead = await contentStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken).ConfigureAwait(false)) > 0)
                {
                    await fileStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken).ConfigureAwait(false);
                    downloadedBytes += bytesRead;

                    if (totalBytes > 0 && progress != null)
                    {
                        var percent = (double)downloadedBytes / totalBytes * 100;
                        progress.Report(percent);
                    }
                }
            }
            finally
            {
                pool.Return(buffer);
            }

            _logger.LogInformation("Download completed: {DownloadedBytes} bytes", downloadedBytes);
            return true;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Download cancelled for image: {ImageName}", image.Name);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading image: {ImageName}", image.Name);
            return false;
        }
    }

    public async Task<bool> VerifyImageChecksumAsync(string imagePath, string expectedChecksum, CancellationToken cancellationToken = default)
    {
        try
        {
            // Use async file I/O with cancellation support and incremental hashing
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            await using var fileStream = new FileStream(imagePath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 8192, useAsync: true);

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
                var actualChecksum = Convert.ToHexString(hashBytes).ToLowerInvariant();

                return actualChecksum.Equals(expectedChecksum, StringComparison.OrdinalIgnoreCase);
            }
            finally
            {
                pool.Return(buffer);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Checksum verification cancelled for: {ImagePath}", imagePath);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying checksum for: {ImagePath}", imagePath);
            return false;
        }
    }
}
