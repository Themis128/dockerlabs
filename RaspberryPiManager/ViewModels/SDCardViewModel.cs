using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using RaspberryPiManager.Models;
using RaspberryPiManager.Services;
using System.Collections.ObjectModel;

namespace RaspberryPiManager.ViewModels;

public partial class SDCardViewModel : ObservableObject
{
    private readonly ISDCardService _sdCardService;

    [ObservableProperty]
    private ObservableCollection<SDCardInfo> sdCards = new();

    [ObservableProperty]
    private SDCardInfo? selectedSDCard;

    [ObservableProperty]
    private bool isRefreshing;

    [ObservableProperty]
    private string statusMessage = string.Empty;

    public SDCardViewModel(ISDCardService sdCardService)
    {
        _sdCardService = sdCardService;
        LoadSDCardsCommand.Execute(null);
    }

    [RelayCommand]
    private async Task LoadSDCards()
    {
        IsRefreshing = true;
        StatusMessage = "Scanning for SD cards...";

        try
        {
            var cards = await _sdCardService.GetSDCardsAsync();
            SdCards.Clear();
            foreach (var card in cards)
            {
                SdCards.Add(card);
            }

            StatusMessage = $"Found {cards.Count} SD card(s)";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
        finally
        {
            IsRefreshing = false;
        }
    }

    [RelayCommand]
    private async Task FormatSDCard(SDCardInfo? card)
    {
        if (card == null) return;

        StatusMessage = $"Formatting {card.Label}...";

        try
        {
            var success = await _sdCardService.FormatSDCardAsync(card.DeviceId, "FAT32");
            if (success)
            {
                StatusMessage = "Format completed successfully";
                await LoadSDCards();
            }
            else
            {
                StatusMessage = "Format failed";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task EjectSDCard(SDCardInfo? card)
    {
        if (card == null) return;

        try
        {
            var success = await _sdCardService.EjectSDCardAsync(card.DeviceId);
            StatusMessage = success ? "SD card ejected" : "Failed to eject SD card";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }
}
