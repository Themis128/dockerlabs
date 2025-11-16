using Microsoft.Extensions.DependencyInjection;
using Microsoft.Maui.Hosting;

namespace RaspberryPiManager;

public class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
        // Create and initialize the MAUI app
        var mauiApp = MauiProgram.CreateMauiApp();

        // Start the Windows Application framework
        // MAUI will handle the rest through the App class
        Microsoft.UI.Xaml.Application.Start((p) =>
        {
            // Initialize the MAUI application
            var app = mauiApp.Services.GetRequiredService<IApplication>() as Application;
        });
    }
}
