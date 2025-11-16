# Server Response Debugging

## Features Added

When you click on any element that makes an API call, you will now see:

1. **Console Logging**: All server responses are logged to the browser console with detailed information
2. **Visual Debug Panel**: A floating debug panel shows the last server response

## How to Use

### View Debug Panel

1. **Toggle Panel**: Press `Ctrl + Shift + D` (or `Cmd + Shift + D` on Mac)
2. **Panel Location**: Bottom-right corner of the screen
3. **Panel Features**:
   - Shows last server response
   - Displays request data, response status, and response data
   - Color-coded by status (green for success, red for errors)
   - Clear button to reset the log
   - Close button to hide the panel

### Console Logging

Open the browser console (F12) to see:
- Grouped logs for each API call
- Request data
- Response status and headers
- Response data
- Any errors

### What Gets Logged

Every API call logs:
- **URL**: The endpoint being called
- **Method**: GET, POST, etc.
- **Request Data**: The data sent to the server (if any)
- **Response Status**: HTTP status code (200, 404, 500, etc.)
- **Response Headers**: All response headers
- **Response Data**: The JSON or text response from the server
- **Errors**: Any errors that occurred

## Example

When you click "Refresh SD Cards":
1. Console shows: `🔵 GET /api/sdcards`
2. Debug panel updates with the response
3. You can see the exact JSON returned by the server

## Disable Debug Mode

To disable debug logging, edit `web-gui/public/app.js` and change:
```javascript
const DEBUG_MODE = true;
```
to:
```javascript
const DEBUG_MODE = false;
```

## Troubleshooting

### Panel Not Showing
- Press `Ctrl + Shift + D` to toggle it
- Check browser console for errors
- Make sure JavaScript is enabled

### No Responses Logged
- Check that the server is running
- Verify the API endpoints are accessible
- Check browser console for network errors

### Malformed JSON
- Check the debug panel for the exact response
- Look at the "Response" section to see what the server returned
- Check server logs for errors
