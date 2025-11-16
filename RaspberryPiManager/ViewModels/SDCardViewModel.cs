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
    private async Task LoadSDCards(CancellationToken cancellationToken = default)
    {
        IsRefreshing = true;
        StatusMessage = "Scanning for SD cards...";

        try
        {
            SdCards.Clear();
            var count = 0;

            // Use IAsyncEnumerable for streaming results (2025 best practice)
            await foreach (var card in _sdCardService.GetSDCardsAsync(cancellationToken).ConfigureAwait(true))
            {
                SdCards.Add(card);
                count++;
            }

            StatusMessage = $"Found {count} SD card(s)";
        }
        catch (OperationCanceledException)
        {
            StatusMessage = "Scan cancelled";
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
    private async Task FormatSDCard(SDCardInfo? card, CancellationToken cancellationToken = default)
    {
        if (card == null) return;

        StatusMessage = $"Formatting {card.Label}...";

        try
        {
            var success = await _sdCardService.FormatSDCardAsync(card.DeviceId, "FAT32", cancellationToken).ConfigureAwait(true);
            if (success)
            {
                StatusMessage = "Format completed successfully";
                await LoadSDCards(cancellationToken);
            }
            else
            {
                StatusMessage = "Format failed";
            }
        }
        catch (OperationCanceledException)
        {
            StatusMessage = "Format cancelled";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task EjectSDCard(SDCardInfo? card, CancellationToken cancellationToken = default)
    {
        if (card == null) return;

        try
        {
            var success = await _sdCardService.EjectSDCardAsync(card.DeviceId, cancellationToken).ConfigureAwait(true);
            StatusMessage = success ? "SD card ejected" : "Failed to eject SD card";
        }
        catch (OperationCanceledException)
        {
            StatusMessage = "Eject cancelled";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
        }
    }
}
