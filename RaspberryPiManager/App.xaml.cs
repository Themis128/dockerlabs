#if WINDOWS
using System.Runtime.InteropServices;
using WinRT.Interop;
#endif

namespace RaspberryPiManager;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var window = new Window(new AppShell())
        {
            Title = "Raspberry Pi Manager"
        };

        // Ensure window is visible and activated
        window.Activated += (s, e) =>
        {
#if WINDOWS
            System.Diagnostics.Debug.WriteLine("Window activated - bringing to front");
            // Bring window to front when activated
            BringWindowToFront(window);
#endif
        };

        // Ensure window is shown when created
        window.Created += (s, e) =>
        {
#if WINDOWS
            System.Diagnostics.Debug.WriteLine("Window created - will bring to front");
            Console.WriteLine("Window created! Bringing to front...");
            Console.Out.Flush();
            // Force window to be visible and brought to front
            // Use a small delay to ensure handler is ready
            Task.Delay(200).ContinueWith(_ =>
            {
                System.Diagnostics.Debug.WriteLine("Bringing window to front after creation");
                Console.WriteLine("Bringing window to front...");
                Console.Out.Flush();
                BringWindowToFront(window);
                Console.WriteLine("Window should now be visible!");
                Console.Out.Flush();
            }, TaskScheduler.FromCurrentSynchronizationContext());
#endif
        };

        // Log window destruction for debugging
        window.Destroying += (s, e) =>
        {
            System.Diagnostics.Debug.WriteLine("Window is being destroyed");
        };

        return window;
    }

#if WINDOWS
    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern bool BringWindowToTop(IntPtr hWnd);

    private const int SW_RESTORE = 9;
    private const int SW_SHOW = 5;

    private void BringWindowToFront(Window window)
    {
        try
        {
            // Get the native window handle
            var windowHandle = WindowNative.GetWindowHandle(window);

            System.Diagnostics.Debug.WriteLine($"Window handle: {windowHandle}");

            // Use Win32 API to bring window to front
            if (windowHandle != IntPtr.Zero)
            {
                // Show window if minimized
                var restoreResult = ShowWindow(windowHandle, SW_RESTORE);
                var showResult = ShowWindow(windowHandle, SW_SHOW);
                System.Diagnostics.Debug.WriteLine($"ShowWindow results - Restore: {restoreResult}, Show: {showResult}");

                // Bring window to top
                var bringToTopResult = BringWindowToTop(windowHandle);
                System.Diagnostics.Debug.WriteLine($"BringWindowToTop result: {bringToTopResult}");

                // Set as foreground window
                var setForegroundResult = SetForegroundWindow(windowHandle);
                System.Diagnostics.Debug.WriteLine($"SetForegroundWindow result: {setForegroundResult}");
            }
            else
            {
                System.Diagnostics.Debug.WriteLine("Warning: Window handle is zero");
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error bringing window to front: {ex.Message}");
            // Fallback: try to activate using platform view
            try
            {
                if (window.Handler?.PlatformView is Microsoft.UI.Xaml.Window platformWindow)
                {
                    platformWindow.Activate();
                    System.Diagnostics.Debug.WriteLine("Activated window using platform view fallback");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("Warning: Platform view is not available");
                }
            }
            catch (Exception fallbackEx)
            {
                // If all else fails, at least log that we tried
                System.Diagnostics.Debug.WriteLine($"Failed to bring window to front (fallback also failed): {fallbackEx.Message}");
            }
        }
    }
#endif
}
