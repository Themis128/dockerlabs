#!/usr/bin/env python3
"""
Generate wpa_supplicant.conf with WPA3 2025 standards support
"""
import sys
import json
import argparse


def generate_wpa_supplicant(network_settings):
    """
    Generate wpa_supplicant.conf with WPA3 2025 standards

    Supports:
    - WPA3-Personal (SAE) - Recommended
    - WPA2/WPA3 Transition Mode - Best compatibility
    - WPA3-Enterprise (192-bit security suite)
    - WPA2-Personal (legacy)
    - Protected Management Frames (PMF)
    """
    if not network_settings.get("enable_wifi") or not network_settings.get("wifi_ssid"):
        return ""

    lines = []
    lines.append("ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev")
    lines.append("update_config=1")
    lines.append(f"country={network_settings.get('wifi_country', 'US')}")
    lines.append("")
    lines.append("network={")
    lines.append(f'    ssid="{network_settings.get("wifi_ssid")}"')

    security_type = network_settings.get("wifi_security_type", "WPA3_Personal")
    transition_mode = network_settings.get("wifi_transition_mode", True)
    enable_pmf = network_settings.get("enable_pmf", True)
    password = network_settings.get("wifi_password", "")

    if security_type == "WPA3_Personal":
        if transition_mode:
            # WPA2/WPA3 Transition Mode - Best compatibility (2025 recommended)
            lines.append("    key_mgmt=WPA-PSK SAE")
            lines.append(f'    psk="{password}"')
            lines.append("    proto=RSN")
            lines.append("    pairwise=CCMP")
            lines.append("    group=CCMP")
        else:
            # Pure WPA3-Personal (SAE only) - Maximum security
            lines.append("    key_mgmt=SAE")
            lines.append(f'    psk="{password}"')
            lines.append("    proto=RSN")
            lines.append("    pairwise=CCMP")
            lines.append("    group=CCMP")

        # Protected Management Frames (PMF) - Required for WPA3
        if enable_pmf:
            lines.append("    ieee80211w=2")  # PMF required

    elif security_type == "WPA2_Personal":
        # WPA2-PSK (legacy support)
        lines.append("    key_mgmt=WPA-PSK")
        lines.append(f'    psk="{password}"')
        lines.append("    proto=RSN")
        lines.append("    pairwise=CCMP")
        lines.append("    group=CCMP")
        if enable_pmf:
            lines.append("    ieee80211w=1")  # PMF optional for WPA2

    elif security_type == "WPA3_Enterprise":
        # WPA3-Enterprise (192-bit security suite)
        lines.append("    key_mgmt=WPA-EAP-SUITE-B-192")
        lines.append("    proto=RSN")
        lines.append("    pairwise=GCMP-256")
        lines.append("    group=GCMP-256")
        lines.append("    ieee80211w=2")  # PMF required

        eap_method = network_settings.get("wifi_eap_method", "TLS")
        if eap_method:
            lines.append(f"    eap={eap_method}")

        ca_cert = network_settings.get("wifi_ca_cert")
        if ca_cert:
            lines.append(f'    ca_cert="{ca_cert}"')

        client_cert = network_settings.get("wifi_client_cert")
        if client_cert:
            lines.append(f'    client_cert="{client_cert}"')

    elif security_type == "WPA2_Enterprise":
        # WPA2-Enterprise (legacy)
        lines.append("    key_mgmt=WPA-EAP")
        lines.append("    proto=RSN")
        lines.append("    pairwise=CCMP")
        lines.append("    group=CCMP")

        eap_method = network_settings.get("wifi_eap_method", "PEAP")
        if eap_method:
            lines.append(f"    eap={eap_method}")

    elif security_type == "Open":
        # Open network (no security - not recommended)
        lines.append("    key_mgmt=NONE")

    # Static IP configuration
    if network_settings.get("use_static_ip") and network_settings.get("static_ip"):
        lines.append("    static_ip_address=")
        lines.append(f'    static_ip={network_settings.get("static_ip")}')

        gateway = network_settings.get("gateway")
        if gateway:
            lines.append(f'    static_routers={gateway}')

        dns = network_settings.get("dns")
        if dns:
            lines.append(f'    static_domain_name_servers={dns}')

    lines.append("}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate wpa_supplicant.conf with WPA3 support")
    parser.add_argument("--settings", type=str, help="JSON string with network settings")
    parser.add_argument("--file", type=str, help="Path to JSON file with network settings")

    args = parser.parse_args()

    if args.file:
        with open(args.file, 'r') as f:
            settings = json.load(f)
    elif args.settings:
        settings = json.loads(args.settings)
    else:
        # Read from stdin
        settings = json.load(sys.stdin)

    network_settings = settings.get("network", settings)
    wpa_config = generate_wpa_supplicant(network_settings)

    print(wpa_config)


if __name__ == "__main__":
    main()
