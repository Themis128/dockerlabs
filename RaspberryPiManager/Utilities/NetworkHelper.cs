using System.Net.NetworkInformation;
using System.Net;
using System.Net.Sockets;
using RaspberryPiManager.Models;

namespace RaspberryPiManager.Utilities;

public interface INetworkHelper
{
    Task<bool> ValidateIPAddressAsync(string ipAddress);
    Task<bool> ValidateSubnetMaskAsync(string subnetMask);
    Task<string> GetDefaultGatewayAsync();
    Task<List<string>> GetDNSServersAsync();
    Task<bool> TestNetworkConnectivityAsync(string host, int port);
    string GenerateWPASupplicantContent(NetworkSettings settings);
}

public class NetworkHelper : INetworkHelper
{
    public async Task<bool> ValidateIPAddressAsync(string ipAddress)
    {
        return await Task.Run(() =>
        {
            return IPAddress.TryParse(ipAddress, out _);
        });
    }

    public async Task<bool> ValidateSubnetMaskAsync(string subnetMask)
    {
        return await Task.Run(() =>
        {
            if (!IPAddress.TryParse(subnetMask, out var mask))
                return false;

            var bytes = mask.GetAddressBytes();
            var binary = string.Join("", bytes.Select(b => Convert.ToString(b, 2).PadLeft(8, '0')));

            // Check if it's a valid subnet mask (all 1s followed by all 0s)
            var foundZero = false;
            foreach (var bit in binary)
            {
                if (bit == '0')
                {
                    foundZero = true;
                }
                else if (foundZero)
                {
                    return false; // Found a 1 after a 0, invalid mask
                }
            }

            return true;
        });
    }

    public async Task<string> GetDefaultGatewayAsync()
    {
        return await Task.Run(() =>
        {
            try
            {
                var interfaces = NetworkInterface.GetAllNetworkInterfaces();
                foreach (var ni in interfaces)
                {
                    if (ni.OperationalStatus == OperationalStatus.Up)
                    {
                        var props = ni.GetIPProperties();
                        var gateways = props.GatewayAddresses;
                        if (gateways.Count > 0)
                        {
                            return gateways[0].Address.ToString();
                        }
                    }
                }
            }
            catch
            {
                // Ignore errors
            }

            return "192.168.1.1"; // Default fallback
        });
    }

    public async Task<List<string>> GetDNSServersAsync()
    {
        return await Task.Run(() =>
        {
            var dnsServers = new List<string>();

            try
            {
                var interfaces = NetworkInterface.GetAllNetworkInterfaces();
                foreach (var ni in interfaces)
                {
                    if (ni.OperationalStatus == OperationalStatus.Up)
                    {
                        var props = ni.GetIPProperties();
                        foreach (var dns in props.DnsAddresses)
                        {
                            if (!dnsServers.Contains(dns.ToString()))
                            {
                                dnsServers.Add(dns.ToString());
                            }
                        }
                    }
                }
            }
            catch
            {
                // Ignore errors
            }

            // Default DNS servers if none found
            if (dnsServers.Count == 0)
            {
                dnsServers.Add("8.8.8.8");
                dnsServers.Add("8.8.4.4");
            }

            return dnsServers;
        });
    }

    public async Task<bool> TestNetworkConnectivityAsync(string host, int port)
    {
        return await Task.Run(async () =>
        {
            try
            {
                using var client = new TcpClient();
                var connectTask = client.ConnectAsync(host, port);
                var success = await Task.WhenAny(connectTask, Task.Delay(TimeSpan.FromSeconds(2))) == connectTask;

                if (success && !connectTask.IsFaulted)
                {
                    return true;
                }

                return false;
            }
            catch
            {
                return false;
            }
        });
    }

    public string GenerateWPASupplicantContent(NetworkSettings settings)
    {
        if (!settings.EnableWiFi || string.IsNullOrEmpty(settings.SSID))
            return string.Empty;

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev");
        sb.AppendLine("update_config=1");
        sb.AppendLine($"country={settings.CountryCode}");
        sb.AppendLine();
        sb.AppendLine("network={");
        sb.AppendLine($"    ssid=\"{settings.SSID}\"");

        if (!string.IsNullOrEmpty(settings.Password))
        {
            sb.AppendLine($"    psk=\"{settings.Password}\"");
        }
        else
        {
            sb.AppendLine("    key_mgmt=NONE");
        }

        if (settings.UseStaticIP && !string.IsNullOrEmpty(settings.StaticIP))
        {
            sb.AppendLine($"    ip_address={settings.StaticIP}");
            if (!string.IsNullOrEmpty(settings.Gateway))
                sb.AppendLine($"    routers={settings.Gateway}");
            if (!string.IsNullOrEmpty(settings.DNS))
                sb.AppendLine($"    domain_name_servers={settings.DNS}");
        }

        sb.AppendLine("}");

        return sb.ToString();
    }
}
