using RaspberryPiManager.ViewModels;

namespace RaspberryPiManager.Views;

public partial class SDCardView : ContentPage
{
    public SDCardView(SDCardViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
