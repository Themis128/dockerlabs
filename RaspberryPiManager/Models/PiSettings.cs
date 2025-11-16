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
