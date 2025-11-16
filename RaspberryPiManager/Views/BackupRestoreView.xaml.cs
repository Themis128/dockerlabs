using RaspberryPiManager.ViewModels;

namespace RaspberryPiManager.Views;

public partial class BackupRestoreView : ContentPage
{
    public BackupRestoreView(BackupRestoreViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
