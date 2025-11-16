using System.Collections.ObjectModel;

namespace RaspberryPiManager.Models;

public class PiSettings
{
    public NetworkSettings Network { get; set; } = new();
    public SSHSettings SSH { get; set; } = new();
    public SystemSettings System { get; set; } = new();
    public UserSettings Users { get; set; } = new();
    public CustomScripts Scripts { get; set; } = new();
    public PackageSettings Packages { get; set; } = new();
    public BootSettings Boot { get; set; } = new();
}

public class NetworkSettings
{
    public bool EnableWiFi { get; set; }
    public string SSID { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string CountryCode { get; set; } = "US";
    public bool UseStaticIP { get; set; }
    public string StaticIP { get; set; } = string.Empty;
    public string Gateway { get; set; } = string.Empty;
    public string DNS { get; set; } = string.Empty;
    public bool EnableEthernet { get; set; } = true;

    // WPA3 Support (2025 standards) - Enhanced
    public WPASecurityType SecurityType { get; set; } = WPASecurityType.WPA3_Personal;
    public bool UseTransitionMode { get; set; } = true; // WPA2/WPA3 compatibility
    public bool EnablePMF { get; set; } = true; // Protected Management Frames (required for WPA3)

    // Hidden network support
    public bool IsHiddenNetwork { get; set; } = false;

    // Network priority (higher = preferred)
    public int Priority { get; set; } = 0;

    // PSK pre-computation
    public bool UsePrecomputedPSK { get; set; } = false;

    // Frequency band preference
    public string? FrequencyBand { get; set; } // "2.4GHz" or "5GHz"

    // Advanced SAE options (WPA3-Personal)
    public string? SAEPasswordId { get; set; }
    public int? SAEAntiCloggingThreshold { get; set; }
    public bool? SAESync { get; set; }

    // Enterprise settings (WPA2/WPA3-Enterprise)
    public string? EAPMethod { get; set; } // TLS, PEAP, TTLS, PWD, etc.
    public string? CAFilePath { get; set; }
    public string? ClientCertPath { get; set; }
    public string? PrivateKeyPath { get; set; }
    public string? PrivateKeyPassphrase { get; set; }
    public string? Identity { get; set; }
    public string? AnonymousIdentity { get; set; }
    public string? Phase2Auth { get; set; } // "auth=MSCHAPV2", "auth=PAP", etc.
    public string? EAPPassword { get; set; }

    // Multiple networks support
    public List<WiFiNetwork> Networks { get; set; } = new();
}

public class WiFiNetwork
{
    public string SSID { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public WPASecurityType SecurityType { get; set; } = WPASecurityType.WPA3_Personal;
    public bool UseTransitionMode { get; set; } = true;
    public bool EnablePMF { get; set; } = true;
    public bool IsHiddenNetwork { get; set; } = false;
    public int Priority { get; set; } = 0;
    public bool UsePrecomputedPSK { get; set; } = false;
    public string? FrequencyBand { get; set; }
    public string? SAEPasswordId { get; set; }
    public int? SAEAntiCloggingThreshold { get; set; }
    public bool? SAESync { get; set; }

    // Enterprise settings
    public string? EAPMethod { get; set; }
    public string? CAFilePath { get; set; }
    public string? ClientCertPath { get; set; }
    public string? PrivateKeyPath { get; set; }
    public string? PrivateKeyPassphrase { get; set; }
    public string? Identity { get; set; }
    public string? AnonymousIdentity { get; set; }
    public string? Phase2Auth { get; set; }
    public string? EAPPassword { get; set; }
}

public enum WPASecurityType
{
    WPA3_Personal,      // SAE (Simultaneous Authentication of Equals) - Recommended
    WPA2_Personal,      // WPA-PSK (legacy support)
    WPA3_Enterprise,    // WPA-EAP-SUITE-B-192 (requires certificates)
    WPA2_Enterprise,    // WPA-EAP (legacy enterprise)
    Open                // No security (not recommended)
}

public class SSHSettings
{
    public bool EnableSSH { get; set; } = true;
    public bool EnablePasswordAuth { get; set; } = true;
    public int Port { get; set; } = 22;
    public List<string> AuthorizedKeys { get; set; } = new();
    public bool DisableRootLogin { get; set; } = true;
}

public class SystemSettings
{
    public string Hostname { get; set; } = "raspberrypi";
    public string Locale { get; set; } = "en_US.UTF-8";
    public string Timezone { get; set; } = "UTC";
    public string KeyboardLayout { get; set; } = "us";
    public string KeyboardModel { get; set; } = "pc105";
    public string KeyboardVariant { get; set; } = string.Empty;
    public bool EnableCamera { get; set; }
    public bool EnableSPI { get; set; }
    public bool EnableI2C { get; set; }
    public bool EnableSerial { get; set; }
}

public class UserSettings
{
    public List<UserAccount> Users { get; set; } = new();
    public string DefaultPassword { get; set; } = string.Empty;
}

public class UserAccount
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool HasSudo { get; set; } = true;
    public List<string> Groups { get; set; } = new();
}

public class CustomScripts
{
    public List<string> PreInstallScripts { get; set; } = new();
    public List<string> PostInstallScripts { get; set; } = new();
    public List<string> FirstBootScripts { get; set; } = new();
}

public class PackageSettings
{
    public List<string> PackagesToInstall { get; set; } = new();
    public bool UpdatePackageList { get; set; } = true;
    public bool UpgradePackages { get; set; } = false;
}

public class BootSettings
{
    public Dictionary<string, string> ConfigTxtEntries { get; set; } = new();
    public bool EnableSSH { get; set; } = true;
    public bool EnableSerialConsole { get; set; }
    public int GpuMemory { get; set; } = 64;
    public bool DisableOverscan { get; set; } = true;
}
