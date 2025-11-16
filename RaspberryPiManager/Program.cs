using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Maui.Hosting;

#if WINDOWS
using System.Runtime.InteropServices;
#endif

namespace RaspberryPiManager;

#if WINDOWS
// Allocate console for debugging output
public static class ConsoleHelper
{
    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AllocConsole();

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetConsoleWindow();

    public static void AllocateConsole()
    {
        // Only allocate console if we don't already have one
        if (GetConsoleWindow() == IntPtr.Zero)
        {
            AllocConsole();
        }
    }
}
#endif

public class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
#if WINDOWS && DEBUG
        // Allocate console window for debugging output
        ConsoleHelper.AllocateConsole();
#endif

        Console.WriteLine("=== Raspberry Pi Manager - Starting Application ===");
        Console.WriteLine($"Arguments: {string.Join(" ", args)}");
        Console.WriteLine($"Framework: {System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription}");
        Console.WriteLine($"OS: {System.Runtime.InteropServices.RuntimeInformation.OSDescription}");
        Console.WriteLine();

        try
        {
            // Create and initialize the MAUI app
            Console.WriteLine("Creating MAUI application...");
            var mauiApp = MauiProgram.CreateMauiApp();
            Console.WriteLine("MAUI application created successfully.");

            // Get logger for startup messages
            var logger = mauiApp.Services.GetRequiredService<ILogger<Program>>();
            logger.LogInformation("=== Application Starting ===");
            logger.LogInformation("Framework: {Framework}", System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription);
            logger.LogInformation("OS: {OS}", System.Runtime.InteropServices.RuntimeInformation.OSDescription);

            // Start the Windows Application framework
            Console.WriteLine("Starting Windows Application framework...");
            logger.LogInformation("Starting Windows Application framework...");

            Microsoft.UI.Xaml.Application.Start((p) =>
            {
                logger.LogInformation("Windows Application framework started.");
                Console.WriteLine("Windows Application framework started.");
                Console.Out.Flush(); // Ensure output is written immediately

                // Initialize the MAUI application
                var app = mauiApp.Services.GetRequiredService<IApplication>() as Application;
                logger.LogInformation("MAUI Application instance created.");
                Console.WriteLine("MAUI Application instance created.");
                Console.Out.Flush();

                logger.LogInformation("=== Application Started Successfully ===");
                Console.WriteLine("=== Application Started Successfully ===");
                Console.WriteLine("Application is running. Check for the main window.");
                Console.WriteLine("Console will remain open while the application is running.");
                Console.Out.Flush();
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"FATAL ERROR: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            throw;
        }
    }
}
