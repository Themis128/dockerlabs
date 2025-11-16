using CommunityToolkit.Maui;
using Microsoft.Extensions.Logging;
using RaspberryPiManager.Services;
using RaspberryPiManager.Utilities;
using RaspberryPiManager.ViewModels;
using RaspberryPiManager.Views;

namespace RaspberryPiManager;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .UseMauiCommunityToolkit()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

#if DEBUG
        builder.Logging.AddDebug();
#endif

        // Register Utilities first
        builder.Services.AddSingleton<Utilities.ImageValidator>();
        builder.Services.AddSingleton<Utilities.FileSystemHelper>();
        builder.Services.AddSingleton<Utilities.NetworkHelper>();
        builder.Services.AddSingleton<Utilities.ScriptGenerator>();
        builder.Services.AddSingleton<IConfigFileGenerator, ConfigFileGenerator>();
        builder.Services.AddSingleton<HttpClient>();

        // Platform-specific services
#if WINDOWS
        builder.Services.AddSingleton<Platforms.Windows.Services.WindowsDiskService>();
        builder.Services.AddSingleton<Platforms.Windows.Services.WindowsImageWriter>();
        builder.Services.AddSingleton<IDiskManagementService, DiskManagementService>();
#elif LINUX
        builder.Services.AddSingleton<Platforms.Linux.Services.LinuxDiskService>();
        builder.Services.AddSingleton<Platforms.Linux.Services.LinuxImageWriter>();
        builder.Services.AddSingleton<IDiskManagementService, DiskManagementService>();
#elif MACCATALYST || IOS
        builder.Services.AddSingleton<Platforms.macOS.Services.MacDiskService>();
        builder.Services.AddSingleton<Platforms.macOS.Services.MacImageWriter>();
        builder.Services.AddSingleton<IDiskManagementService, DiskManagementService>();
#endif

        // Register Services
        builder.Services.AddSingleton<ISDCardService, SDCardService>();
        builder.Services.AddSingleton<IImageWriterService, ImageWriterService>();
        builder.Services.AddSingleton<ISettingsService, SettingsService>();
        builder.Services.AddSingleton<IBackupService, BackupService>();
        builder.Services.AddSingleton<IRestoreService, RestoreService>();
        builder.Services.AddSingleton<IProfileService, ProfileService>();
        builder.Services.AddSingleton<IImageDownloadService, ImageDownloadService>();

        // Register ViewModels
        builder.Services.AddTransient<SDCardViewModel>();
        builder.Services.AddTransient<OSInstallViewModel>();
        builder.Services.AddTransient<SettingsViewModel>();
        builder.Services.AddTransient<BackupRestoreViewModel>();
        builder.Services.AddTransient<ProfileViewModel>();

        // Register Views
        builder.Services.AddTransient<SDCardView>();
        builder.Services.AddTransient<OSInstallView>();
        builder.Services.AddTransient<SettingsView>();
        builder.Services.AddTransient<BackupRestoreView>();
        builder.Services.AddTransient<ProfileView>();

        return builder.Build();
    }
}
