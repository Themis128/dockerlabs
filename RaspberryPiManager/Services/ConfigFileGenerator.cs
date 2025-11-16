using System.Text;
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
        if (!network.EnableWiFi || string.IsNullOrEmpty(network.SSID))
            return string.Empty;

        var sb = new StringBuilder();
        sb.AppendLine("ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev");
        sb.AppendLine("update_config=1");
        sb.AppendLine($"country={network.CountryCode}");
        sb.AppendLine();
        sb.AppendLine("network={");
        sb.AppendLine($"    ssid=\"{network.SSID}\"");

        if (!string.IsNullOrEmpty(network.Password))
        {
            sb.AppendLine($"    psk=\"{network.Password}\"");
        }
        else
        {
            sb.AppendLine("    key_mgmt=NONE");
        }

        if (network.UseStaticIP && !string.IsNullOrEmpty(network.StaticIP))
        {
            sb.AppendLine("    static_ip_address=");
            sb.AppendLine($"    static_ip={network.StaticIP}");
            if (!string.IsNullOrEmpty(network.Gateway))
                sb.AppendLine($"    static_routers={network.Gateway}");
            if (!string.IsNullOrEmpty(network.DNS))
                sb.AppendLine($"    static_domain_name_servers={network.DNS}");
        }

        sb.AppendLine("}");

        return sb.ToString();
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
