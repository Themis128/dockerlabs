using System.Linq;
using System.Text;
using System.Security.Cryptography;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Services;

public interface IConfigFileGenerator
{
    string GenerateSSHFile();
    string GenerateWPASupplicantConf(NetworkSettings network);
    string GenerateUserConf(UserSettings users);
    string GenerateConfigTxt(BootSettings boot);
    string GenerateFirstRunScript(CustomScripts scripts, PackageSettings packages);
    Dictionary<string, string> GenerateAllConfigFiles(PiSettings settings);
}

public class ConfigFileGenerator : IConfigFileGenerator
{
    public string GenerateSSHFile()
    {
        // Empty file enables SSH on first boot
        return string.Empty;
    }

    public string GenerateWPASupplicantConf(NetworkSettings network)
    {
        if (!network.EnableWiFi)
            return string.Empty;

        var sb = new StringBuilder();
        sb.AppendLine("ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev");
        sb.AppendLine("update_config=1");
        sb.AppendLine($"country={network.CountryCode}");

        // Frequency band preference
        if (!string.IsNullOrEmpty(network.FrequencyBand))
        {
            if (network.FrequencyBand == "5GHz")
            {
                sb.AppendLine("freq_list=5180 5200 5220 5240 5260 5280 5300 5320 5500 5520 5540 5560 5580 5600 5620 5640 5660 5680 5700 5720 5745 5765 5785 5805 5825");
            }
            else if (network.FrequencyBand == "2.4GHz")
            {
                sb.AppendLine("freq_list=2412 2417 2422 2427 2432 2437 2442 2447 2452 2457 2462 2467 2472 2484");
            }
        }

        sb.AppendLine();

        // Support multiple networks or single network (backward compatibility)
        var networks = new List<WiFiNetwork>();
        if (network.Networks.Count > 0)
        {
            networks.AddRange(network.Networks);
        }
        else if (!string.IsNullOrEmpty(network.SSID))
        {
            // Convert single network to WiFiNetwork for unified processing
            networks.Add(new WiFiNetwork
            {
                SSID = network.SSID,
                Password = network.Password,
                SecurityType = network.SecurityType,
                UseTransitionMode = network.UseTransitionMode,
                EnablePMF = network.EnablePMF,
                IsHiddenNetwork = network.IsHiddenNetwork,
                Priority = network.Priority,
                UsePrecomputedPSK = network.UsePrecomputedPSK,
                FrequencyBand = network.FrequencyBand,
                SAEPasswordId = network.SAEPasswordId,
                SAEAntiCloggingThreshold = network.SAEAntiCloggingThreshold,
                SAESync = network.SAESync,
                EAPMethod = network.EAPMethod,
                CAFilePath = network.CAFilePath,
                ClientCertPath = network.ClientCertPath,
                PrivateKeyPath = network.PrivateKeyPath,
                PrivateKeyPassphrase = network.PrivateKeyPassphrase,
                Identity = network.Identity,
                AnonymousIdentity = network.AnonymousIdentity,
                Phase2Auth = network.Phase2Auth,
                EAPPassword = network.EAPPassword,
                AutoConnect = network.AutoConnect,
                MinSignalStrength = network.MinSignalStrength,
                EnableFastRoaming = network.EnableFastRoaming,
                MobilityDomain = network.MobilityDomain,
                UseFTEAP = network.UseFTEAP,
                UseFTPSK = network.UseFTPSK,
                EnableRRM = network.EnableRRM,
                RRMNeighborReport = network.RRMNeighborReport,
                EnableWNM = network.EnableWNM,
                BSSTransition = network.BSSTransition,
                WNMSleepMode = network.WNMSleepMode,
                ConnectionTimeout = network.ConnectionTimeout,
                MaxRetries = network.MaxRetries,
                IsGuestNetwork = network.IsGuestNetwork,
                EnableIsolation = network.EnableIsolation,
                VLANId = network.VLANId,
                EnableMACFiltering = network.EnableMACFiltering,
                AllowedMACAddresses = network.AllowedMACAddresses,
                BlockedMACAddresses = network.BlockedMACAddresses,
                EnableHotspot20 = network.EnableHotspot20,
                Interworking = network.Interworking,
                HS20 = network.HS20,
                DomainName = network.DomainName
            });
        }

        // Sort by priority (higher first)
        networks = networks.OrderByDescending(n => n.Priority).ToList();

        foreach (var net in networks)
        {
            if (string.IsNullOrEmpty(net.SSID))
                continue;

            sb.AppendLine("network={");
            sb.AppendLine($"    ssid=\"{net.SSID}\"");

            // Hidden network support
            if (net.IsHiddenNetwork)
            {
                sb.AppendLine("    scan_ssid=1");
            }

            // Network priority
            if (net.Priority > 0)
            {
                sb.AppendLine($"    priority={net.Priority}");
            }

            // Generate network configuration
            GenerateNetworkConfig(sb, net);

            sb.AppendLine("}");
        }

        return sb.ToString();
    }

    private void GenerateNetworkConfig(StringBuilder sb, WiFiNetwork net)
    {
        switch (net.SecurityType)
        {
            case WPASecurityType.WPA3_Personal:
                if (net.UseTransitionMode)
                {
                    // WPA2/WPA3 Transition Mode
                    sb.AppendLine("    key_mgmt=WPA-PSK SAE");
                    sb.AppendLine("    proto=RSN");
                    sb.AppendLine("    pairwise=CCMP");
                    sb.AppendLine("    group=CCMP");
                }
                else
                {
                    // Pure WPA3-Personal (SAE only)
                    sb.AppendLine("    key_mgmt=SAE");
                    sb.AppendLine("    proto=RSN");
                    sb.AppendLine("    pairwise=CCMP");
                    sb.AppendLine("    group=CCMP");
                }

                // PSK handling
                AppendPSK(sb, net.SSID, net.Password, net.UsePrecomputedPSK);

                // Protected Management Frames (PMF) - Required for WPA3
                if (net.EnablePMF)
                {
                    sb.AppendLine("    ieee80211w=2");
                }

                // Advanced SAE options
                if (!string.IsNullOrEmpty(net.SAEPasswordId))
                {
                    sb.AppendLine($"    sae_password_id=\"{net.SAEPasswordId}\"");
                }
                if (net.SAEAntiCloggingThreshold.HasValue)
                {
                    sb.AppendLine($"    sae_anti_clogging_threshold={net.SAEAntiCloggingThreshold.Value}");
                }
                if (net.SAESync.HasValue)
                {
                    sb.AppendLine($"    sae_sync={(net.SAESync.Value ? 1 : 0)}");
                }
                break;

            case WPASecurityType.WPA2_Personal:
                sb.AppendLine("    key_mgmt=WPA-PSK");
                sb.AppendLine("    proto=RSN");
                sb.AppendLine("    pairwise=CCMP");
                sb.AppendLine("    group=CCMP");

                AppendPSK(sb, net.SSID, net.Password, net.UsePrecomputedPSK);

                if (net.EnablePMF)
                {
                    sb.AppendLine("    ieee80211w=1");
                }
                break;

            case WPASecurityType.WPA3_Enterprise:
                sb.AppendLine("    key_mgmt=WPA-EAP-SUITE-B-192");
                sb.AppendLine("    proto=RSN");
                sb.AppendLine("    pairwise=GCMP-256");
                sb.AppendLine("    group=GCMP-256");
                sb.AppendLine("    ieee80211w=2");

                AppendEnterpriseConfig(sb, net);
                break;

            case WPASecurityType.WPA2_Enterprise:
                sb.AppendLine("    key_mgmt=WPA-EAP");
                sb.AppendLine("    proto=RSN");
                sb.AppendLine("    pairwise=CCMP");
                sb.AppendLine("    group=CCMP");

                AppendEnterpriseConfig(sb, net);
                break;

            case WPASecurityType.OWE:
                // Opportunistic Wireless Encryption (encrypted open networks)
                sb.AppendLine("    key_mgmt=OWE");
                sb.AppendLine("    proto=RSN");
                sb.AppendLine("    pairwise=CCMP");
                sb.AppendLine("    group=CCMP");
                sb.AppendLine("    ieee80211w=2"); // PMF required for OWE
                break;

            case WPASecurityType.Open:
                sb.AppendLine("    key_mgmt=NONE");
                break;
        }

        // Phase 1: Auto-connect settings
        if (!net.AutoConnect)
        {
            sb.AppendLine("    disabled=1"); // Manual connection only
        }

        // Signal strength threshold
        if (net.MinSignalStrength.HasValue)
        {
            sb.AppendLine($"    signal_threshold={net.MinSignalStrength.Value}");
        }

        // Phase 1: 802.11r Fast Roaming
        if (net.EnableFastRoaming)
        {
            var mobilityDomain = net.MobilityDomain ?? 1234;
            sb.AppendLine($"    mobility_domain={mobilityDomain}");

            // FT-EAP for enterprise networks
            if (net.SecurityType == WPASecurityType.WPA3_Enterprise ||
                net.SecurityType == WPASecurityType.WPA2_Enterprise)
            {
                if (net.UseFTEAP)
                {
                    sb.AppendLine("    ft_eap_method=FT-EAP");
                }
            }

            // FT-PSK for personal networks
            if (net.SecurityType == WPASecurityType.WPA3_Personal ||
                net.SecurityType == WPASecurityType.WPA2_Personal)
            {
                if (net.UseFTPSK)
                {
                    sb.AppendLine("    ft_psk=1");
                }
            }
        }

        // Phase 2: 802.11k (Radio Resource Management)
        if (net.EnableRRM)
        {
            if (net.RRMNeighborReport)
            {
                sb.AppendLine("    rrm_neighbor_report=1");
            }
        }

        // Phase 2: 802.11v (Wireless Network Management)
        if (net.EnableWNM)
        {
            if (net.BSSTransition)
            {
                sb.AppendLine("    bss_transition=1");
            }

            if (net.WNMSleepMode)
            {
                sb.AppendLine("    wnm_sleep_mode=1");
            }
        }

        // Phase 3: Connection Timeout Settings
        if (net.ConnectionTimeout.HasValue)
        {
            sb.AppendLine($"    connection_timeout={net.ConnectionTimeout.Value}");
        }

        if (net.MaxRetries.HasValue)
        {
            sb.AppendLine($"    max_retries={net.MaxRetries.Value}");
        }

        // Phase 3: Guest Network Isolation
        if (net.IsGuestNetwork || net.EnableIsolation)
        {
            sb.AppendLine("    ap_isolate=1"); // Client isolation
        }

        if (net.VLANId.HasValue)
        {
            sb.AppendLine($"    vlan_id={net.VLANId.Value}");
        }

        // Phase 3: MAC Address Filtering
        // Note: MAC filtering is typically handled at AP level, but we document it
        if (net.EnableMACFiltering)
        {
            // wpa_supplicant doesn't directly support MAC filtering
            // This would typically be configured at the AP/router level
            // We include it in the model for documentation and future AP configuration
        }

        // Phase 3: Hotspot 2.0 / Passpoint
        if (net.EnableHotspot20)
        {
            sb.AppendLine("    interworking=1");
            sb.AppendLine("    hs20=1");

            if (!string.IsNullOrEmpty(net.DomainName))
            {
                sb.AppendLine($"    domain_name=\"{net.DomainName}\"");
            }
        }

        // Frequency band preference (per network)
        if (!string.IsNullOrEmpty(net.FrequencyBand))
        {
            if (net.FrequencyBand == "5GHz")
            {
                sb.AppendLine("    freq_list=5180 5200 5220 5240 5260 5280 5300 5320 5500 5520 5540 5560 5580 5600 5620 5640 5660 5680 5700 5720 5745 5765 5785 5805 5825");
            }
            else if (net.FrequencyBand == "2.4GHz")
            {
                sb.AppendLine("    freq_list=2412 2417 2422 2427 2432 2437 2442 2447 2452 2457 2462 2467 2472 2484");
            }
        }
    }

    private void AppendPSK(StringBuilder sb, string ssid, string password, bool usePrecomputed)
    {
        if (usePrecomputed && !string.IsNullOrEmpty(password))
        {
            var pskHex = ComputePSK(ssid, password);
            if (!string.IsNullOrEmpty(pskHex))
            {
                sb.AppendLine($"    psk={pskHex}");
                return;
            }
        }
        sb.AppendLine($"    psk=\"{password}\"");
    }

    private string? ComputePSK(string ssid, string password)
    {
        try
        {
            // PBKDF2 with SHA1, 4096 iterations, 32 bytes output (matches wpa_passphrase)
            using var pbkdf2 = new Rfc2898DeriveBytes(
                password,
                Encoding.UTF8.GetBytes(ssid),
                4096,
                HashAlgorithmName.SHA1);

            var pskBytes = pbkdf2.GetBytes(32);
            return BitConverter.ToString(pskBytes).Replace("-", "").ToLowerInvariant();
        }
        catch
        {
            return null;
        }
    }

    private void AppendEnterpriseConfig(StringBuilder sb, WiFiNetwork net)
    {
        if (!string.IsNullOrEmpty(net.EAPMethod))
        {
            sb.AppendLine($"    eap={net.EAPMethod}");
        }

        // Identity and anonymous identity
        if (!string.IsNullOrEmpty(net.Identity))
        {
            sb.AppendLine($"    identity=\"{net.Identity}\"");
        }
        if (!string.IsNullOrEmpty(net.AnonymousIdentity))
        {
            sb.AppendLine($"    anonymous_identity=\"{net.AnonymousIdentity}\"");
        }

        // Certificates (for TLS-based methods or WPA3-Enterprise)
        if (net.SecurityType == WPASecurityType.WPA3_Enterprise ||
            (net.EAPMethod == "TLS" || net.EAPMethod == "TTLS"))
        {
            if (!string.IsNullOrEmpty(net.CAFilePath))
            {
                sb.AppendLine($"    ca_cert=\"{net.CAFilePath}\"");
            }
            if (!string.IsNullOrEmpty(net.ClientCertPath))
            {
                sb.AppendLine($"    client_cert=\"{net.ClientCertPath}\"");
            }
            if (!string.IsNullOrEmpty(net.PrivateKeyPath))
            {
                sb.AppendLine($"    private_key=\"{net.PrivateKeyPath}\"");
            }
            if (!string.IsNullOrEmpty(net.PrivateKeyPassphrase))
            {
                sb.AppendLine($"    private_key_passwd=\"{net.PrivateKeyPassphrase}\"");
            }
        }

        // Phase 2 authentication
        if (!string.IsNullOrEmpty(net.Phase2Auth))
        {
            sb.AppendLine($"    phase2=\"{net.Phase2Auth}\"");
        }

        // Password for EAP methods that need it
        if (!string.IsNullOrEmpty(net.EAPPassword))
        {
            sb.AppendLine($"    password=\"{net.EAPPassword}\"");
        }
    }

    public string GenerateUserConf(UserSettings users)
    {
        if (users.Users.Count == 0 && string.IsNullOrEmpty(users.DefaultPassword))
            return string.Empty;

        // Raspberry Pi OS uses userconf file with format: username:encrypted_password
        // For simplicity, we'll generate a basic userconf
        // In production, password should be properly encrypted
        var sb = new StringBuilder();

        if (!string.IsNullOrEmpty(users.DefaultPassword))
        {
            // Default user is 'pi'
            // Password needs to be encrypted - this is simplified
            var encrypted = EncryptPassword(users.DefaultPassword);
            sb.AppendLine($"pi:{encrypted}");
        }

        foreach (var user in users.Users)
        {
            var encrypted = EncryptPassword(user.Password);
            sb.AppendLine($"{user.Username}:{encrypted}");
        }

        return sb.ToString();
    }

    public string GenerateConfigTxt(BootSettings boot)
    {
        var sb = new StringBuilder();

        if (boot.EnableSSH)
            sb.AppendLine("enable_uart=1");

        if (boot.EnableSerialConsole)
            sb.AppendLine("enable_uart=1");

        if (boot.DisableOverscan)
            sb.AppendLine("disable_overscan=1");

        sb.AppendLine($"gpu_mem={boot.GpuMemory}");

        foreach (var entry in boot.ConfigTxtEntries)
        {
            sb.AppendLine($"{entry.Key}={entry.Value}");
        }

        return sb.ToString();
    }

    public string GenerateFirstRunScript(CustomScripts scripts, PackageSettings packages)
    {
        var sb = new StringBuilder();
        sb.AppendLine("#!/bin/bash");
        sb.AppendLine("set -e");
        sb.AppendLine();
        sb.AppendLine("# First run script for Raspberry Pi");
        sb.AppendLine();

        // Pre-install scripts
        foreach (var script in scripts.PreInstallScripts)
        {
            sb.AppendLine("# Pre-install: " + script);
            sb.AppendLine(script);
            sb.AppendLine();
        }

        // Package installation
        if (packages.UpdatePackageList)
        {
            sb.AppendLine("apt-get update -y");
        }

        if (packages.PackagesToInstall.Count > 0)
        {
            sb.AppendLine($"apt-get install -y {string.Join(" ", packages.PackagesToInstall)}");
        }

        if (packages.UpgradePackages)
        {
            sb.AppendLine("apt-get upgrade -y");
        }

        // Post-install scripts
        foreach (var script in scripts.PostInstallScripts)
        {
            sb.AppendLine("# Post-install: " + script);
            sb.AppendLine(script);
            sb.AppendLine();
        }

        // First boot scripts
        foreach (var script in scripts.FirstBootScripts)
        {
            sb.AppendLine("# First boot: " + script);
            sb.AppendLine(script);
            sb.AppendLine();
        }

        // Remove this script after running
        sb.AppendLine("rm /boot/firstrun.sh");
        sb.AppendLine("systemctl disable firstrun.service");

        return sb.ToString();
    }

    public Dictionary<string, string> GenerateAllConfigFiles(PiSettings settings)
    {
        var files = new Dictionary<string, string>();

        if (settings.SSH.EnableSSH)
        {
            files["ssh"] = GenerateSSHFile();
        }

        if (settings.Network.EnableWiFi)
        {
            files["wpa_supplicant.conf"] = GenerateWPASupplicantConf(settings.Network);
        }

        if (settings.Users.Users.Count > 0 || !string.IsNullOrEmpty(settings.Users.DefaultPassword))
        {
            files["userconf"] = GenerateUserConf(settings.Users);
        }

        files["config.txt"] = GenerateConfigTxt(settings.Boot);
        files["firstrun.sh"] = GenerateFirstRunScript(settings.Scripts, settings.Packages);

        return files;
    }

    private string EncryptPassword(string password)
    {
        // In production, use proper password encryption (openssl passwd -6)
        // This is a placeholder - should use actual encryption
        return $"$6$rounds=5000${Guid.NewGuid():N}${Convert.ToBase64String(Encoding.UTF8.GetBytes(password))}";
    }
}
