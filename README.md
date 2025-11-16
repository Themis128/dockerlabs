# DockerLabs - Raspberry Pi Management Suite

A comprehensive Raspberry Pi management solution featuring a .NET MAUI desktop application, web-based GUI, and automated connection scripts for SSH and Telnet.

## 🚀 Features

- **.NET MAUI Desktop App**: Cross-platform desktop application for managing Raspberry Pi devices
- **Web GUI**: Browser-based interface for monitoring and managing Pis
- **Automated Scripts**: PowerShell and Python scripts for SSH/Telnet connections
- **Comprehensive Testing**: 81 Playwright tests covering all functionality
- **Cross-Platform Support**: Windows, macOS, Linux, Android, iOS

## 📋 Project Structure

```
dockerlabs/
├── RaspberryPiManager/     # .NET MAUI desktop application
├── web-gui/                # Python web server and frontend
├── tests/                  # Playwright test suite
├── *.ps1                   # PowerShell connection scripts
├── *.py                    # Python utilities
└── *.sh                    # Shell scripts for Pi setup
```

## 🛠️ Technologies

- **.NET MAUI 9.0**: Cross-platform desktop/mobile framework
- **Playwright 1.56.1**: End-to-end testing framework
- **Python 3.14**: Web server and utilities
- **Node.js 20.19**: Test runner and tooling
- **TypeScript**: Test configuration

## 📦 Prerequisites

### Required
- **.NET SDK 9.0** or later ([Download](https://dotnet.microsoft.com/download))
- **Node.js 20.x** or later ([Download](https://nodejs.org/))
- **Python 3.7+** ([Download](https://www.python.org/downloads/))
- **Git** ([Download](https://git-scm.com/downloads))

### Optional (for cross-platform builds)
- **Android SDK** (for Android builds)
- **Xcode** (for iOS/macOS builds, macOS only)
- **Visual Studio 2022** or **Visual Studio Code**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Themis128/dockerlabs.git
cd dockerlabs
```

### 2. Install Dependencies

**Node.js dependencies:**
```bash
npm install
npx playwright install
```

**Python dependencies:**
```bash
# Python uses standard library only - no external packages needed
```

**.NET MAUI workload:**
```bash
dotnet workload install maui
```

### 3. Configure Raspberry Pis

Edit `pi-config.json` with your Raspberry Pi network information:
```json
{
  "raspberry_pis": {
    "1": {
      "name": "Pi 1",
      "ip": "192.168.0.48",
      "mac": "B8-27-EB-74-83-19",
      "connection": "Wired"
    }
  }
}
```

### 4. Run Tests
```bash
npm test
```

### 5. Start Web Server
```bash
npm run start:server
# Or directly:
python web-gui/server.py
```

Visit http://localhost:3000 in your browser.

### 6. Build Desktop App
```bash
cd RaspberryPiManager
dotnet build -f net9.0-windows10.0.19041.0
```

## 📖 Usage

### Web GUI

Start the server and access the web interface:
```bash
python web-gui/server.py
```

Features:
- Dashboard with Pi statistics
- Raspberry Pi list and management
- Connection testing (SSH, Telnet)
- SD card management
- OS installation tools

### Desktop Application

Build and run the .NET MAUI application:
```bash
cd RaspberryPiManager
dotnet run -f net9.0-windows10.0.19041.0
```

### Connection Scripts

**SSH Connection:**
```powershell
.\connect-ssh.ps1 1              # Connect to Pi 1
.\connect-ssh.ps1 2              # Connect to Pi 2
```

**Telnet Connection:**
```powershell
.\connect-telnet.ps1 1           # Connect to Pi 1 via Telnet
.\connect-telnet.ps1 2           # Connect to Pi 2 via Telnet
```

**Test Connections:**
```powershell
.\test-connections.ps1           # Test all Pi connections
.\test-ssh-auth.ps1 1            # Test SSH authentication for Pi 1
```

See [README.md](README.md) for detailed connection documentation.

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
npm run test:gui                 # GUI tests only
npm run test:ui                  # Interactive test UI
npm run test:headed              # Run with browser visible
npm run test:debug               # Debug mode
```

### Test Coverage
- **81 tests** across 4 test files
- **3 browsers**: Chromium, Firefox, WebKit
- **Test types**: Configuration, Connectivity, GUI, Scripts

## 🏗️ Building

### Windows
```bash
cd RaspberryPiManager
dotnet build -f net9.0-windows10.0.19041.0
```

### Android (requires Android SDK)
```bash
dotnet build -f net9.0-android
```

### iOS (requires macOS and Xcode)
```bash
dotnet build -f net9.0-ios
```

### Release Build
```bash
dotnet build -c Release -f net9.0-windows10.0.19041.0
```

## 📚 Documentation

- [UPGRADE_SUMMARY.md](UPGRADE_SUMMARY.md) - Framework upgrade details
- [SSH-SETUP.md](SSH-SETUP.md) - SSH configuration guide
- [QUICK-SETUP.md](QUICK-SETUP.md) - Quick setup instructions
- [FIX-AUTHENTICATION.md](FIX-AUTHENTICATION.md) - Authentication troubleshooting

## 🔧 Configuration

### Raspberry Pi Configuration
Edit `pi-config.json` to configure your Raspberry Pi devices:
- IP addresses
- MAC addresses
- Connection types (Ethernet/WiFi)
- Default usernames and ports

### Playwright Configuration
Edit `playwright.config.ts` to customize test settings:
- Browser configurations
- Timeouts
- Test directories
- Web server settings

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- .NET MAUI team for the cross-platform framework
- Playwright team for the excellent testing framework
- Raspberry Pi Foundation for the amazing hardware

## 📞 Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/Themis128/dockerlabs/issues)
- Check the documentation in the `docs/` directory
- Review troubleshooting guides in the repository

---

**Made with ❤️ for Raspberry Pi enthusiasts**
