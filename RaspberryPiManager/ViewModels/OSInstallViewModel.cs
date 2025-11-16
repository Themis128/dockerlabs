using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using RaspberryPiManager.Models;
using RaspberryPiManager.Services;

namespace RaspberryPiManager.ViewModels;

public partial class OSInstallViewModel : ObservableObject
{
    private readonly IImageWriterService _imageWriter;
    private readonly IImageDownloadService _imageDownload;
    private readonly Utilities.IImageValidator _imageValidator;
    private readonly ISettingsService _settingsService;
    private readonly ISDCardService _sdCardService;

    [ObservableProperty]
    private List<OSImage> availableImages = new();

    [ObservableProperty]
    private OSImage? selectedImage;

    [ObservableProperty]
    private SDCardInfo? selectedSDCard;

    [ObservableProperty]
    private string? customImagePath;

    [ObservableProperty]
    private double installProgress;

    [ObservableProperty]
    private bool isInstalling;

    [ObservableProperty]
    private string statusMessage = string.Empty;

    [ObservableProperty]
    private PiSettings? settingsToApply;

    public bool CanInstall => !IsInstalling && SelectedSDCard != null && (SelectedImage != null || !string.IsNullOrEmpty(CustomImagePath));

    public OSInstallViewModel(
        IImageWriterService imageWriter,
        IImageDownloadService imageDownload,
        Utilities.IImageValidator imageValidator,
        ISettingsService settingsService,
        ISDCardService sdCardService)
    {
        _imageWriter = imageWriter;
        _imageDownload = imageDownload;
        _imageValidator = imageValidator;
        _settingsService = settingsService;
        _sdCardService = sdCardService;
        LoadAvailableImagesCommand.Execute(null);
    }

    [RelayCommand]
    private async Task LoadAvailableImages()
    {
        try
        {
            AvailableImages = await _imageDownload.GetAvailableImagesAsync();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error loading images: {ex.Message}";
        }
    }

    [RelayCommand]
    private Task SelectCustomImage()
    {
        // File picker would be implemented here
        StatusMessage = "File picker not implemented yet";
        return Task.CompletedTask;
    }

    [RelayCommand]
    private async Task InstallOS()
    {
        if (SelectedSDCard == null)
        {
            StatusMessage = "Please select an SD card";
            return;
        }

        string? imagePath = null;

        if (SelectedImage != null)
        {
            // Download or use existing image
            imagePath = SelectedImage.FilePath;
            if (string.IsNullOrEmpty(imagePath) || !File.Exists(imagePath))
            {
                StatusMessage = "Image file not found. Please download or select a custom image.";
                return;
            }
        }
        else if (!string.IsNullOrEmpty(CustomImagePath) && File.Exists(CustomImagePath))
        {
            imagePath = CustomImagePath;
        }
        else
        {
            StatusMessage = "Please select an OS image or provide a custom image path";
            return;
        }

        // Validate image
        var isValid = await _imageValidator.ValidateImageAsync(imagePath);
        if (!isValid)
        {
            StatusMessage = "Invalid image file";
            return;
        }

        IsInstalling = true;
        InstallProgress = 0;
        StatusMessage = "Installing OS...";

        try
        {
            var progress = new Progress<double>(p => InstallProgress = p);
            var success = await _imageWriter.WriteImageAsync(imagePath, SelectedSDCard.DeviceId, progress);

            if (success)
            {
                StatusMessage = "OS installation completed";

                // Apply settings if provided
                if (SettingsToApply != null)
                {
                    StatusMessage = "Applying settings...";
                    await _settingsService.ApplySettingsToSDCardAsync(SelectedSDCard.DeviceId, SettingsToApply);
                    StatusMessage = "OS installation and settings applied successfully";
                }
            }
            else
            {
                StatusMessage = "OS installation failed";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
        finally
        {
            IsInstalling = false;
        }
    }
}
