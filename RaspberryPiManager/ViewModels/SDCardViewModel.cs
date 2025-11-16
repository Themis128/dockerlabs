using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using RaspberryPiManager.Models;
using RaspberryPiManager.Services;
using System.Collections.ObjectModel;

namespace RaspberryPiManager.ViewModels;

public partial class SDCardViewModel : ObservableObject
{
    private readonly ISDCardService _sdCardService;

    private ObservableCollection<SDCardInfo> _sdCards = new();
    public ObservableCollection<SDCardInfo> SdCards
    {
        get => _sdCards;
        set => SetProperty(ref _sdCards, value);
    }

    private SDCardInfo? _selectedSDCard;
    public SDCardInfo? SelectedSDCard
    {
        get => _selectedSDCard;
        set => SetProperty(ref _selectedSDCard, value);
    }

    private bool _isRefreshing;
    public bool IsRefreshing
    {
        get => _isRefreshing;
        set => SetProperty(ref _isRefreshing, value);
    }

    private string _statusMessage = string.Empty;
    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

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
