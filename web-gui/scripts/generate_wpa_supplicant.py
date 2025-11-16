#!/usr/bin/env python3
"""
Generate wpa_supplicant.conf with WPA3 2025 standards support
Enhanced with hidden networks, PSK pre-computation, multiple networks, and advanced features
"""
import sys
import json
import argparse
import hashlib


def compute_psk(ssid, password):
    """
    Compute PSK (Pre-Shared Key) from SSID and password using PBKDF2
    This matches wpa_passphrase output for better security
    """
    try:
        # Use PBKDF2 with SHA1, 4096 iterations, 32 bytes output
        psk = hashlib.pbkdf2_hmac('sha1', password.encode('utf-8'), ssid.encode('utf-8'), 4096, 32)
        return psk.hex()
    except Exception:
        return None


def generate_wpa_supplicant(network_settings):
    """
    Generate wpa_supplicant.conf with WPA3 2025 standards

    Enhanced Features:
    - WPA3-Personal (SAE) - Recommended
    - WPA2/WPA3 Transition Mode - Best compatibility
    - WPA3-Enterprise (192-bit security suite)
    - WPA2-Personal (legacy)
    - Protected Management Frames (PMF)
    - Hidden network support (scan_ssid)
    - PSK pre-computation for better security
    - Multiple network support with priority
    - Advanced SAE options
    - Enhanced Enterprise EAP methods
    """
    if not network_settings.get("enable_wifi"):
        return ""

    lines = []
    lines.append("ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev")
    lines.append("update_config=1")
    lines.append(f"country={network_settings.get('wifi_country', 'US')}")

    # Optional: Configure frequency band preference
    if network_settings.get("wifi_band"):
        band = network_settings.get("wifi_band")
        if band == "5GHz":
            lines.append("freq_list=5180 5200 5220 5240 5260 5280 5300 5320 5500 5520 5540 5560 5580 5600 5620 5640 5660 5680 5700 5720 5745 5765 5785 5805 5825")
        elif band == "2.4GHz":
            lines.append("freq_list=2412 2417 2422 2427 2432 2437 2442 2447 2452 2457 2462 2467 2472 2484")

    lines.append("")

    # Support multiple networks
    networks = network_settings.get("wifi_networks", [])
    if not networks:
        # Single network mode (backward compatibility)
        networks = [network_settings] if network_settings.get("wifi_ssid") else []

    # Sort networks by priority (higher priority first)
    networks = sorted(networks, key=lambda n: n.get("priority", 0), reverse=True)

    for idx, net in enumerate(networks):
        if not net.get("wifi_ssid"):
            continue

        lines.append("network={")
        lines.append(f'    ssid="{net.get("wifi_ssid")}"')

        # Hidden network support
        if net.get("wifi_hidden", False):
            lines.append("    scan_ssid=1")

        # Network priority
        priority = net.get("priority", 0)
        if priority > 0:
            lines.append(f"    priority={priority}")

        security_type = net.get("wifi_security_type", "WPA3_Personal")
        transition_mode = net.get("wifi_transition_mode", True)
        enable_pmf = net.get("enable_pmf", True)
        password = net.get("wifi_password", "")
        use_precomputed_psk = net.get("use_precomputed_psk", False)

        if security_type == "WPA3_Personal":
            if transition_mode:
                # WPA2/WPA3 Transition Mode - Best compatibility (2025 recommended)
                lines.append("    key_mgmt=WPA-PSK SAE")
                lines.append("    proto=RSN")
                lines.append("    pairwise=CCMP")
                lines.append("    group=CCMP")
            else:
                # Pure WPA3-Personal (SAE only) - Maximum security
                lines.append("    key_mgmt=SAE")
                lines.append("    proto=RSN")
                lines.append("    pairwise=CCMP")
                lines.append("    group=CCMP")

            # PSK handling - use precomputed PSK if requested
            if use_precomputed_psk and password:
                psk_hex = compute_psk(net.get("wifi_ssid"), password)
                if psk_hex:
                    lines.append(f"    psk={psk_hex}")
                else:
                    # Fallback to plain password if PSK computation fails
                    lines.append(f'    psk="{password}"')
            else:
                lines.append(f'    psk="{password}"')

            # Protected Management Frames (PMF) - Required for WPA3
            if enable_pmf:
                lines.append("    ieee80211w=2")  # PMF required

            # Advanced SAE options
            sae_password_id = net.get("sae_password_id")
            if sae_password_id:
                lines.append(f'    sae_password_id="{sae_password_id}"')

            sae_anti_clogging_threshold = net.get("sae_anti_clogging_threshold")
            if sae_anti_clogging_threshold:
                lines.append(f"    sae_anti_clogging_threshold={sae_anti_clogging_threshold}")

            sae_sync = net.get("sae_sync")
            if sae_sync is not None:
                lines.append(f"    sae_sync={1 if sae_sync else 0}")

        elif security_type == "WPA2_Personal":
            # WPA2-PSK (legacy support)
            lines.append("    key_mgmt=WPA-PSK")
            lines.append("    proto=RSN")
            lines.append("    pairwise=CCMP")
            lines.append("    group=CCMP")

            # PSK handling
            if use_precomputed_psk and password:
                psk_hex = compute_psk(net.get("wifi_ssid"), password)
                if psk_hex:
                    lines.append(f"    psk={psk_hex}")
                else:
                    lines.append(f'    psk="{password}"')
            else:
                lines.append(f'    psk="{password}"')

            if enable_pmf:
                lines.append("    ieee80211w=1")  # PMF optional for WPA2

        elif security_type == "WPA3_Enterprise":
            # WPA3-Enterprise (192-bit security suite)
            lines.append("    key_mgmt=WPA-EAP-SUITE-B-192")
            lines.append("    proto=RSN")
            lines.append("    pairwise=GCMP-256")
            lines.append("    group=GCMP-256")
            lines.append("    ieee80211w=2")  # PMF required

            eap_method = net.get("wifi_eap_method", "TLS")
            if eap_method:
                lines.append(f"    eap={eap_method}")

            # Identity and anonymous identity
            identity = net.get("wifi_identity")
            if identity:
                lines.append(f'    identity="{identity}"')

            anonymous_identity = net.get("wifi_anonymous_identity")
            if anonymous_identity:
                lines.append(f'    anonymous_identity="{anonymous_identity}"')

            # Certificates
            ca_cert = net.get("wifi_ca_cert")
            if ca_cert:
                lines.append(f'    ca_cert="{ca_cert}"')

            client_cert = net.get("wifi_client_cert")
            if client_cert:
                lines.append(f'    client_cert="{client_cert}"')

            private_key = net.get("wifi_private_key")
            if private_key:
                lines.append(f'    private_key="{private_key}"')

            private_key_passphrase = net.get("wifi_private_key_passphrase")
            if private_key_passphrase:
                lines.append(f'    private_key_passwd="{private_key_passphrase}"')

            # Phase 2 authentication
            phase2 = net.get("wifi_phase2")
            if phase2:
                lines.append(f'    phase2="{phase2}"')

            # Password for EAP methods that need it (PEAP, TTLS, etc.)
            eap_password = net.get("wifi_eap_password")
            if eap_password:
                lines.append(f'    password="{eap_password}"')

        elif security_type == "WPA2_Enterprise":
            # WPA2-Enterprise (legacy)
            lines.append("    key_mgmt=WPA-EAP")
            lines.append("    proto=RSN")
            lines.append("    pairwise=CCMP")
            lines.append("    group=CCMP")

            eap_method = net.get("wifi_eap_method", "PEAP")
            if eap_method:
                lines.append(f"    eap={eap_method}")

            # Identity and anonymous identity
            identity = net.get("wifi_identity")
            if identity:
                lines.append(f'    identity="{identity}"')

            anonymous_identity = net.get("wifi_anonymous_identity")
            if anonymous_identity:
                lines.append(f'    anonymous_identity="{anonymous_identity}"')

            # Certificates (for TLS-based methods)
            if eap_method in ["TLS", "TTLS"]:
                ca_cert = net.get("wifi_ca_cert")
                if ca_cert:
                    lines.append(f'    ca_cert="{ca_cert}"')

                client_cert = net.get("wifi_client_cert")
                if client_cert:
                    lines.append(f'    client_cert="{client_cert}"')

                private_key = net.get("wifi_private_key")
                if private_key:
                    lines.append(f'    private_key="{private_key}"')

                private_key_passphrase = net.get("wifi_private_key_passphrase")
                if private_key_passphrase:
                    lines.append(f'    private_key_passwd="{private_key_passphrase}"')

            # Phase 2 authentication
            phase2 = net.get("wifi_phase2")
            if phase2:
                lines.append(f'    phase2="{phase2}"')

            # Password for EAP methods that need it
            eap_password = net.get("wifi_eap_password")
            if eap_password:
                lines.append(f'    password="{eap_password}"')

        elif security_type == "Open":
            # Open network (no security - not recommended)
            lines.append("    key_mgmt=NONE")

        # Frequency band preference (per network)
        freq_list = net.get("wifi_freq_list")
        if freq_list:
            lines.append(f"    freq_list={freq_list}")

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
