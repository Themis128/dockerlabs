using RaspberryPiManager.ViewModels;

namespace RaspberryPiManager.Views;

public partial class OSInstallView : ContentPage
{
    public OSInstallView(OSInstallViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
