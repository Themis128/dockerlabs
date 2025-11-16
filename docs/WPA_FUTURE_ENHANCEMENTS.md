# WPA Future Enhancements

## Currently Implemented ✅

- WPA3-Personal (SAE)
- WPA2/WPA3 Transition Mode
- WPA3-Enterprise (192-bit security suite)
- WPA2-Personal/Enterprise
- Hidden network support
- PSK pre-computation
- Multiple networks with priority
- Frequency band selection (2.4GHz/5GHz)
- Advanced SAE options
- Enhanced Enterprise EAP methods
- Protected Management Frames (PMF)

## Recommended Additional Features

### 1. **OWE (Opportunistic Wireless Encryption)** 🔒

**Priority: High** | **Security Impact: High**

- Encrypts open networks without requiring a password
- Provides individualized encryption per device
- Perfect for public networks that want privacy
- WPA3 standard feature

**Implementation:**

```python
# In wpa_supplicant.conf
network={
    ssid="PublicNetwork"
    key_mgmt=OWE
    ieee80211w=2
}
```

**Use Cases:**

- Public WiFi hotspots
- Guest networks
- Coffee shops, airports, hotels

---

### 2. **802.11r (Fast BSS Transition / Fast Roaming)** 🚀

**Priority: High** | **Performance Impact: High**

- Enables fast handoff between access points
- Reduces connection interruption during roaming
- Critical for mobile devices and IoT
- Reduces authentication time from ~200ms to ~50ms

**Implementation:**

```python
network={
    ssid="CorporateNetwork"
    key_mgmt=WPA-EAP
    eap=PEAP
    # Fast roaming
    mobility_domain=1234
    ft_eap_method=FT-EAP
    ft_psk=1
}
```

**Use Cases:**

- Large office buildings with multiple APs
- Campus networks
- IoT devices that move around

---

### 3. **802.11k (Radio Resource Management)** 📡

**Priority: Medium** | **Performance Impact: Medium**

- Helps devices find better access points
- Provides neighbor reports
- Optimizes roaming decisions
- Reduces connection drops

**Implementation:**

```python
# Global setting
ap_scan=1
# Network-specific
network={
    ssid="Network"
    key_mgmt=WPA-PSK SAE
    # 802.11k support
    rrm_neighbor_report=1
}
```

**Use Cases:**

- Multi-AP environments
- Networks with coverage gaps
- Performance-critical applications

---

### 4. **802.11v (Wireless Network Management)** 🔧

**Priority: Medium** | **Management Impact: High**

- Network-assisted power savings
- BSS transition management
- Channel usage optimization
- Better network management

**Implementation:**

```python
network={
    ssid="Network"
    key_mgmt=WPA-PSK SAE
    # 802.11v features
    bss_transition=1
    wnm_sleep_mode=1
}
```

**Use Cases:**

- Battery-powered devices
- IoT sensors
- Mobile devices

---

### 5. **Auto-Connect Settings** ⚙️

**Priority: High** | **UX Impact: High**

- Per-network auto-connect toggle
- Connect only when in range
- Connect only when signal is strong
- Manual connection option

**Implementation:**

```python
network={
    ssid="Network"
    key_mgmt=WPA-PSK SAE
    # Auto-connect settings
    disabled=0  # 0=auto-connect, 1=manual only
    autoconnect=1
}
```

**Use Cases:**

- Home networks (always connect)
- Work networks (connect when in range)
- Guest networks (manual only)

---

### 6. **Signal Strength Thresholds** 📶

**Priority: Medium** | **Reliability Impact: Medium**

- Minimum signal strength before connecting
- Auto-disconnect on weak signal
- Prevents connection to weak networks
- Improves battery life

**Implementation:**

```python
network={
    ssid="Network"
    key_mgmt=WPA-PSK SAE
    # Signal thresholds
    signal_threshold=-70  # dBm
    min_signal_strength=-75
}
```

**Use Cases:**

- Avoiding weak connections
- Battery optimization
- Better user experience

---

### 7. **Network Scanning & Discovery** 🔍

**Priority: High** | **UX Impact: High**

- Scan for available networks
- Show signal strength
- Show security type
- Show if network is hidden
- Auto-detect country code

**Implementation:**

```python
# Use wpa_cli or iwlist to scan
# Display results in UI
# Allow selection from discovered networks
```

**Use Cases:**

- Easier network setup
- Finding available networks
- Network troubleshooting

---

### 8. **MAC Address Filtering** 🛡️

**Priority: Low** | **Security Impact: Medium**

- Whitelist/blacklist MAC addresses
- Additional security layer
- Per-network MAC filtering
- Device management

**Implementation:**

```python
network={
    ssid="Network"
    key_mgmt=WPA-PSK SAE
    # MAC filtering (requires AP support)
    # Note: This is typically AP-side, but we can document it
}
```

**Use Cases:**

- Additional security layer
- Device access control
- Network access management

---

### 9. **Network Profiles Export/Import** 💾

**Priority: Medium** | **Convenience Impact: High**

- Export network configurations
- Import from other devices
- Backup/restore profiles
- Share configurations
- JSON/XML format support

**Implementation:**

```python
# Export to JSON
{
  "networks": [
    {
      "ssid": "Network1",
      "security": "WPA3_Personal",
      "password": "encrypted",
      ...
    }
  ]
}
```

**Use Cases:**

- Setting up multiple devices
- Backup before reset
- Sharing with team members
- Migration between devices

---

### 10. **Connection Timeout Settings** ⏱️

**Priority: Low** | **Reliability Impact: Medium**

- Connection attempt timeout
- Reconnection intervals
- Maximum retry attempts
- Connection timeout per network

**Implementation:**

```python
network={
    ssid="Network"
    key_mgmt=WPA-PSK SAE
    # Timeout settings
    connection_timeout=30  # seconds
    max_retries=3
}
```

**Use Cases:**

- Faster failure detection
- Better error handling
- Improved user experience

---

### 11. **Band Steering Preferences** 📡

**Priority: Medium** | **Performance Impact: Medium**

- Prefer 5GHz over 2.4GHz
- Auto-switch based on signal
- Band-specific priorities
- Load balancing

**Implementation:**

```python
network={
    ssid="Network"
    key_mgmt=WPA-PSK SAE
    # Band steering
    freq_list=5180 5200 5220  # Prefer 5GHz
    band_preference=5GHz
}
```

**Use Cases:**

- Better performance (5GHz)
- Reduced interference (2.4GHz)
- Optimal band selection

---

### 12. **Hotspot 2.0 / Passpoint** 🌐

**Priority: Low** | **Enterprise Impact: High**

- Seamless roaming between networks
- Automatic authentication
- Enterprise-grade roaming
- Certificate-based authentication

**Implementation:**

```python
network={
    ssid="Network"
    key_mgmt=WPA-EAP
    eap=TLS
    # Hotspot 2.0
    interworking=1
    hs20=1
    domain_name="example.com"
}
```

**Use Cases:**

- Enterprise roaming
- Carrier WiFi
- Seamless connectivity

---

### 13. **Network Connection History & Logging** 📊

**Priority: Low** | **Debugging Impact: High**

- Connection attempt logs
- Success/failure history
- Signal strength history
- Connection duration
- Error messages

**Implementation:**

```python
# Log to file or database
{
  "timestamp": "2025-01-15T10:30:00Z",
  "ssid": "Network",
  "status": "connected",
  "signal_strength": -65,
  "duration": 3600
}
```

**Use Cases:**

- Troubleshooting
- Network analysis
- Performance monitoring
- Debugging connection issues

---

### 14. **Guest Network Isolation** 🔐

**Priority: Medium** | **Security Impact: High**

- Isolate guest networks
- Prevent inter-device communication
- Separate VLAN support
- Guest network profiles

**Implementation:**

```python
network={
    ssid="GuestNetwork"
    key_mgmt=OWE
    # Guest isolation
    isolation=1
    # VLAN support (if AP supports)
    vlan_id=100
}
```

**Use Cases:**

- Guest WiFi
- Public networks
- Security isolation
- Network segmentation

---

### 15. **WPS Support (Legacy)** ⚠️

**Priority: Very Low** | **Security Impact: Negative**

- Wi-Fi Protected Setup
- **Note: WPS is deprecated and insecure**
- Only for legacy device support
- Should be disabled by default
- Document security risks

**Implementation:**

```python
# NOT RECOMMENDED - For legacy support only
network={
    ssid="Network"
    key_mgmt=WPA-PSK
    # WPS (deprecated)
    wps_disabled=1  # Always disable
}
```

**Use Cases:**

- Legacy device support only
- Should be avoided

---

## Implementation Priority

### Phase 1 (High Priority - Immediate Value)

1. ✅ **OWE (Opportunistic Wireless Encryption)** - Security for open networks
2. ✅ **Auto-Connect Settings** - Better UX
3. ✅ **Network Scanning & Discovery** - Easier setup
4. ✅ **802.11r (Fast Roaming)** - Performance critical

### Phase 2 (Medium Priority - Enhanced Features)

5. ✅ **802.11k (Radio Resource Management)** - Better roaming
6. ✅ **802.11v (Wireless Network Management)** - Power savings
7. ✅ **Signal Strength Thresholds** - Reliability
8. ✅ **Network Profiles Export/Import** - Convenience
9. ✅ **Band Steering Preferences** - Performance

### Phase 3 (Low Priority - Nice to Have)

10. ✅ **Connection Timeout Settings** - Reliability
11. ✅ **Network Connection History** - Debugging
12. ✅ **Guest Network Isolation** - Security
13. ✅ **MAC Address Filtering** - Additional security
14. ✅ **Hotspot 2.0 / Passpoint** - Enterprise

### Phase 4 (Not Recommended)

15. ❌ **WPS Support** - Deprecated and insecure

---

## Technical Considerations

### wpa_supplicant Compatibility

- Check wpa_supplicant version for feature support
- Some features require wpa_supplicant 2.9+
- Test on actual Raspberry Pi hardware
- Verify kernel driver support

### Hardware Requirements

- 802.11r/k/v require modern WiFi chipsets
- Some features are AP-dependent
- Check Raspberry Pi WiFi adapter capabilities
- May require additional drivers

### Security Implications

- OWE provides encryption without passwords
- 802.11r reduces handoff time (security vs. performance)
- MAC filtering can be bypassed (weak security)
- WPS is fundamentally insecure

---

## Recommended Next Steps

1. **Start with OWE** - High security value, easy to implement
2. **Add Auto-Connect** - High UX value, simple implementation
3. **Implement Network Scanning** - High UX value, requires wpa_cli integration
4. **Add 802.11r** - High performance value, requires testing

Would you like me to implement any of these features?
