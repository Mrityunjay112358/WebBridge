# WebBridge: AI-Powered Accessibility Assistant

WebBridge is a Chrome extension that enhances web accessibility using AI. It provides features for users with visual, motor, cognitive, hearing, and language challenges, powered by Together AI and local APIs.

---

## Features

- **Visual Impairment Support**
    - Adds AI-generated alt text to images
    - High contrast mode
    - Text-to-speech buttons
    - Enhanced focus indicators

- **Motor Difficulty Support**
    - Skip to main content link
    - Enlarged click targets
    - Keyboard accessibility improvements

- **Cognitive Support**
    - Simplify and summarize content using AI
    - Easy-to-read summaries

- **Dyslexia Support**
    - Dyslexia-friendly font
    - Increased line spacing
    - Reading guide overlay

- **Seizure Protection**
    - Detects and disables flashing/animated content
    - Reduces motion

- **Hearing Support**
    - Adds captions to media
    - Converts audio alerts to visual alerts

- **Language Support**
    - Translation buttons for text
    - Double-click for word definitions

---

## How It Works

1. **Onboarding:**  
     On first install, users are prompted to set up their accessibility profile via a popup.

2. **Profile Management:**  
     Users can toggle accessibility features in the popup and save/reset their profile.

3. **Content Script:**  
     Features are injected into web pages based on the user's profile. AI services (Together AI, local image captioning) are used for advanced features.

4. **Communication:**  
     The popup, background, and content scripts communicate using Chrome's messaging APIs.

---

## Project Structure

- `background.js`  
    Handles extension lifecycle, tab updates, and messaging between popup and content scripts.

- `popup.html`  
    The extension's popup UI for managing the accessibility profile.

- `popup.js`  
    Logic for profile management, feature toggling, and UI feedback in the popup.

- `content.js`  
    Injected into web pages to apply accessibility features and interact with AI APIs.

---

## Setup & Development

1. **Clone the repository** and open in your editor.

2. **API Keys & Endpoints:**  
     - Set your Together AI API key in `content.js` (`config.togetherApiKey`).
     - Ensure local endpoints (e.g., image captioning) are running if used.

3. **Load the extension:**
     - Go to `chrome://extensions`
     - Enable "Developer mode"
     - Click "Load unpacked" and select the project folder.

4. **Usage:**  
     - Click the WebBridge icon in Chrome.
     - Set up your accessibility profile.
     - Toggle features as needed.

---

## Customization

- **Add/Remove Features:**  
    Edit `content.js` to register new features or modify existing ones.

- **UI Styling:**  
    Update `popup.css` and in-script styles for custom appearance.

---

## Security & Privacy

- No user data is sent to third parties except for AI API calls (Together AI, local endpoints).
- All profile data is stored using Chrome's `storage.sync`.

---

## License

MIT License

---

## Credits

- [Together AI](https://together.ai/) for AI-powered text features
- [OpenDyslexic](https://opendyslexic.org/) font for dyslexia support

---

**WebBridge** – Making the web accessible for everyone.