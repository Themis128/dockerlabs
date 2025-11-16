using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Maui.Hosting;

#if WINDOWS
using System.Runtime.InteropServices;
using System.IO;
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

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(uint dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
    private static extern bool FreeConsole();

    private const uint ATTACH_PARENT_PROCESS = 0xFFFFFFFF;

    public static void AllocateConsole()
    {
        // Try to attach to parent console first (if running from command line)
        if (!AttachConsole(ATTACH_PARENT_PROCESS))
        {
            // If that fails, allocate a new console
            if (GetConsoleWindow() == IntPtr.Zero)
            {
                if (!AllocConsole())
                {
                    // If allocation fails, log to debug output
                    System.Diagnostics.Debug.WriteLine($"Failed to allocate console. Error: {Marshal.GetLastWin32Error()}");
                }
                else
                {
                    // Redirect stdout and stderr to the console
                    System.Console.SetOut(new System.IO.StreamWriter(System.Console.OpenStandardOutput()) { AutoFlush = true });
                    System.Console.SetError(new System.IO.StreamWriter(System.Console.OpenStandardError()) { AutoFlush = true });
                }
            }
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
            // Start the Windows Application framework FIRST
            // MAUI needs the XAML application context to be initialized before creating the app
            Console.WriteLine("Starting Windows Application framework...");

            Microsoft.UI.Xaml.Application.Start((p) =>
            {
                Console.WriteLine("Windows Application framework started.");
                Console.Out.Flush();

                try
                {
                    // NOW create and initialize the MAUI app (after XAML app is running)
                    Console.WriteLine("Creating MAUI application...");
                    var mauiApp = MauiProgram.CreateMauiApp();
                    Console.WriteLine("MAUI application created successfully.");
                    Console.Out.Flush();

                    // Get logger for startup messages
                    var logger = mauiApp.Services.GetRequiredService<ILogger<Program>>();
                    logger.LogInformation("=== Application Starting ===");
                    logger.LogInformation("Framework: {Framework}", System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription);
                    logger.LogInformation("OS: {OS}", System.Runtime.InteropServices.RuntimeInformation.OSDescription);

                    // Initialize the MAUI application
                    var app = mauiApp.Services.GetRequiredService<IApplication>() as Application;
                    logger.LogInformation("MAUI Application instance created.");
                    Console.WriteLine("MAUI Application instance created.");
                    Console.WriteLine("Creating main window...");
                    Console.Out.Flush();

                    // The window should be created automatically by MAUI
                    // Give it a moment to initialize
                    System.Threading.Thread.Sleep(500);
                    Console.WriteLine("Window creation should be complete.");
                    Console.Out.Flush();

                    logger.LogInformation("=== Application Started Successfully ===");
                    Console.WriteLine("=== Application Started Successfully ===");
                    Console.WriteLine("Application is running. Check for the main window.");
                    Console.WriteLine("Console will remain open while the application is running.");
                    Console.Out.Flush();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"ERROR creating MAUI app: {ex.Message}");
                    Console.WriteLine($"Stack Trace: {ex.StackTrace}");
                    if (ex.InnerException != null)
                    {
                        Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                    }
                    Console.Out.Flush();
                    throw;
                }
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
