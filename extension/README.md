# Forge Studio Browser Extension

A browser extension for Chrome and Edge that sends chat completions directly to your Forge Studio instance.

## Features

- **Direct API Access**: Send chat completions from any webpage
- **Task Type Selection**: Choose between chat, coding, vision, fast, and long_context modes
- **Secure Configuration**: Store API keys securely in browser storage
- **Real-time Responses**: Get instant responses from your Forge Studio backend
- **Multi-team Support**: Configure team IDs for multi-tenant access

## Installation

### Chrome

1. Open `chrome://extensions/` in your browser
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Navigate to the `extension` directory and select it
5. The extension will appear in your extensions list

### Edge

1. Open `edge://extensions/` in your browser
2. Enable "Developer mode" (toggle in bottom left)
3. Click "Load unpacked"
4. Navigate to the `extension` directory and select it
5. The extension will appear in your extensions list

## Configuration

1. Click the Forge Studio extension icon in your browser toolbar
2. Click the ⚙️ settings button
3. Enter your configuration:
   - **API Key**: Your X-API-Key for authentication
   - **API Endpoint**: The base URL of your Forge Studio instance (e.g., `http://localhost:5051`)
   - **Team ID**: Your team identifier (default: `default`)
4. Click "Save Settings"

## Usage

1. Click the extension icon to open the popup
2. Select a task type from the dropdown
3. Type your message in the text area
4. Press `Ctrl+Enter` or click the "Send" button
5. Wait for the response from the LLM router

## API Endpoint

The extension communicates with Forge Studio via:

```
POST {apiEndpoint}/api/trpc/chat.complete
```

With headers:
```
X-API-Key: {your-api-key}
Content-Type: application/json
```

## Troubleshooting

### "Invalid API key" error
- Verify your API key is correct in settings
- Ensure the API key matches the `X-API-Key` header expected by your backend

### "API endpoint not reachable"
- Check that your API endpoint URL is correct
- Ensure CORS is properly configured on your backend
- Verify the backend is running and accessible

### "Monthly budget exceeded"
- Your team has exceeded its monthly spending limit
- Contact your administrator to increase the budget limit

## Development

### Project Structure

```
extension/
├── manifest.json          # Extension configuration
├── src/
│   ├── popup.html        # Popup UI
│   ├── popup.css         # Popup styling
│   ├── popup.js          # Popup logic
│   ├── background.js     # Service worker
│   └── content.js        # Content script
├── public/
│   └── icons/            # Extension icons
└── README.md
```

### Building Icons

Create extension icons in the following sizes:
- 16x16 pixels (icon-16.png)
- 48x48 pixels (icon-48.png)
- 128x128 pixels (icon-128.png)

Save them in `public/icons/` directory.

## Security

- API keys are stored in browser's local storage (encrypted by browser)
- All communication uses HTTPS (when configured)
- No data is sent to third-party services
- Extension runs only when you interact with it

## License

MIT License - See LICENSE file for details
