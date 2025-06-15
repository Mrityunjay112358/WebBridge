// WebBridge Content Script - AI-Powered Accessibility Assistant with Together AI

if (!window.WebBridgeAccessibility) {
  class WebBridgeAccessibility {
    constructor() {
      this.profile = null;
      this.features = new Map();
      this.config = {
        togetherApiKey: 'c6215cbd694b71580c76d2a632091323c941cc5bb966bf0cf5a9d45b0456180f', // Set this in your extension settings
        imageCaptionEndpoint: 'http://localhost:8081/api/caption',
        contrastThreshold: 4.5,
        minClickTargetSize: 48,
        analyzerEndpoint: 'http://localhost:5000/analyze'
      };
      
      this.initializeFeatures();
      this.loadProfile();
      
      // Kick off our analyzer
      this.runAnalyzer();
      // Add missing placeholders to input fields
      this.addInputPlaceholders();
      // Observe DOM for dynamically added inputs
      this.observeInputPlaceholders();
    }

    /** Sends the entire page HTML to the Flask analyzer, then highlights issues */
    async runAnalyzer() {
      try {
        const html = document.documentElement.outerHTML;
        const res = await fetch(this.config.analyzerEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html })
        });
        const report = await res.json();

        // Now draw boxes or badges around each bad element
        this.highlightIssues(report);
      } catch (e) {
        console.error('WebBridge Analyzer fetch failed:', e);
      }
    }

    highlightIssues(report) {
      Object.entries(report).forEach(([check, selectors]) => {
        selectors.forEach(selector => {
          const node = document.querySelector(selector);
          if (!node) {
            // Only log once per selector per session
            if (!window.webbridgeMissingSelectors) window.webbridgeMissingSelectors = new Set();
            if (!window.webbridgeMissingSelectors.has(selector)) {
              window.webbridgeMissingSelectors.add(selector);
            }
            return;
          }

          // Add visual indicator
          node.style.outline = '2px dashed red';
          node.setAttribute('data-webbridge-issue', check);
          
          // Add a tooltip with the issue description
          const tooltip = document.createElement('div');
          tooltip.className = 'webbridge-tooltip';
          tooltip.textContent = check;
          tooltip.style.position = 'absolute';
          tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          tooltip.style.color = 'white';
          tooltip.style.padding = '5px';
          tooltip.style.borderRadius = '3px';
          tooltip.style.fontSize = '12px';
          tooltip.style.zIndex = '10000';
          tooltip.style.display = 'none';
          
          // Position tooltip relative to the node
          node.style.position = 'relative';
          node.appendChild(tooltip);
          
          // Show tooltip on hover
          node.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
            // Position tooltip above the element
            const rect = node.getBoundingClientRect();
            tooltip.style.top = `${-tooltip.offsetHeight - 5}px`;
            tooltip.style.left = '0';
          });
          
          node.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
          });
        });
      });
    }

    // Feature registration system
    initializeFeatures() {
      this.features.set('visual_impairment', {
        init: () => this.initVisualImpairmentFeatures(),
        toggle: (enabled) => this.toggleVisualFeatures(enabled)
      });
      
      this.features.set('motor_difficulty', {
        init: () => this.initMotorDifficultyFeatures(),
        toggle: (enabled) => this.toggleMotorFeatures(enabled)
      });
      
      this.features.set('cognitive_difficulty', {
        init: () => this.initCognitiveFeatures(),
        toggle: (enabled) => this.toggleCognitiveFeatures(enabled)
      });
      
      this.features.set('dyslexia', {
        init: () => this.initDyslexiaFeatures(),
        toggle: (enabled) => this.toggleDyslexiaFeatures(enabled)
      });
      
      this.features.set('seizure_sensitivity', {
        init: () => this.initSeizureProtection(),
        toggle: (enabled) => this.toggleSeizureProtection(enabled)
      });
      
      this.features.set('hearing_impairment', {
        init: () => this.initHearingFeatures(),
        toggle: (enabled) => this.toggleHearingFeatures(enabled)
      });
      
      this.features.set('language_barrier', {
        init: () => this.initLanguageFeatures(),
        toggle: (enabled) => this.toggleLanguageFeatures(enabled)
      });
    }

    async loadProfile() {
      try {
        const result = await chrome.storage.sync.get(['accessibilityProfile']);
        if (result.accessibilityProfile) {
          this.profile = result.accessibilityProfile;
          this.activateFeatures();
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    }

    activateFeatures() {
      if (!this.profile) return;
      
      Object.entries(this.profile).forEach(([key, enabled]) => {
        if (enabled && this.features.has(key)) {
          this.features.get(key).init();
        }
      });
    }

    // Together AI API Integration
    async callTogetherAI(prompt, systemPrompt = null) {
      try {
        const messages = [];
        
        if (systemPrompt) {
          messages.push({
            role: "system",
            content: systemPrompt
          });
        }
        
        messages.push({
          role: "user",
          content: prompt
        });

        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.togetherApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "meta-llama/Llama-Vision-Free",
            messages: messages,
            max_tokens: 500,
            temperature: 0.1
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.choices[0].message.content;
        } else {
          console.error('Together AI API error:', response.status, response.statusText);
          return null;
        }
      } catch (error) {
        console.error('Together AI API error:', error);
        return null;
      }
    }


    // Visual Impairment Features
    async initVisualImpairmentFeatures() {
      await this.addAltTextToImages();
      this.enableHighContrastMode();
      this.addTextToSpeechButtons();
      this.enhanceFocusIndicators();
    }

    async addAltTextToImages() {
      const images = document.querySelectorAll('img:not([alt]), img[alt=""]');
      
      for (const img of images) {
        try {
          if (img.src) {
            const description = await this.getImageDescription(img.src);
            img.setAttribute('alt', description);
            img.setAttribute('data-webbridge-alt', 'true');
          }
        } catch (error) {
          console.error('Error getting image description:', error);
          img.setAttribute('alt', 'Image description unavailable');
        }
      }
    }

    async getImageDescription(imageSrc) {
      try {
        const response = await fetch(this.config.imageCaptionEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imageSrc })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.description || 'Image';
        }
      } catch (error) {
        console.error('Image captioning API error:', error);
      }
      return 'Image';
    }

    enableHighContrastMode() {
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        if (Array.from(el.classList).some(className => className.includes('webbridge-') && className.includes('-button') || className.includes('webbridge-reading-guide'))) {
          return;
        }
        
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const color = styles.color;
        
        if (this.getContrastRatio(color, bgColor) < this.config.contrastThreshold) {
          el.classList.add('webbridge-high-contrast');
        }
      });
    }

    getContrastRatio(color1, color2) {
      // Simplified contrast ratio calculation
      const rgb1 = this.getRGBValues(color1);
      const rgb2 = this.getRGBValues(color2);
      
      if (!rgb1 || !rgb2) return 5; // Default to pass if calculation fails
      
      const l1 = this.getLuminance(rgb1);
      const l2 = this.getLuminance(rgb2);
      
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      
      return (lighter + 0.05) / (darker + 0.05);
    }

    getRGBValues(color) {
      const div = document.createElement('div');
      div.style.color = color;
      document.body.appendChild(div);
      const computed = window.getComputedStyle(div).color;
      document.body.removeChild(div);
      
      const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
    }

    getLuminance([r, g, b]) {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    addTextToSpeechButtons() {
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, section');
      
      textElements.forEach(el => {
        if (el.textContent.trim().length > 20) {
          // Store original text content before adding button
          const originalText = el.textContent.trim();
          el.setAttribute('data-original-text', originalText);
          
          const button = document.createElement('button');
          button.innerHTML = '🔊 Read This';
          button.className = 'webbridge-tts-button';
          button.setAttribute('aria-label', 'Read this text aloud');
          
          button.addEventListener('click', () => this.speakText(el.getAttribute('data-original-text')));
          
          el.style.position = 'relative';
          el.appendChild(button);
        }
      });
    }

    speakText(text) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any current speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    }

    enhanceFocusIndicators() {
      const focusableElements = document.querySelectorAll(
        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      
      focusableElements.forEach(el => {
        el.classList.add('webbridge-focus-enhanced');
      });
    }

    // Motor Difficulty Features
    initMotorDifficultyFeatures() {
      this.addSkipLink();
      this.ensureKeyboardAccessibility();
      this.enlargeSmallClickTargets();
      this.fixFocusTraps();
    }

    addSkipLink() {
      if (document.querySelector('.webbridge-skip-link')) return;
      
      const skipLink = document.createElement('a');
      skipLink.href = '#main';
      skipLink.textContent = 'Skip to main content';
      skipLink.className = 'webbridge-skip-link';
      skipLink.setAttribute('tabindex', '0');
      
      // Try to find main content
      let mainContent = document.querySelector('main, #main, .main, [role="main"]');
      if (!mainContent) {
        mainContent = document.querySelector('article, .content, #content');
      }
      
      if (mainContent) {
        mainContent.id = mainContent.id || 'main';
        skipLink.addEventListener('click', (e) => {
          e.preventDefault();
          mainContent.focus();
          mainContent.scrollIntoView();
        });
      }
      
      document.body.insertBefore(skipLink, document.body.firstChild);
    }

    ensureKeyboardAccessibility() {
      const clickableElements = document.querySelectorAll(
        '[onclick], [data-click], .clickable, .btn'
      );
      
      clickableElements.forEach(el => {
        if (!el.hasAttribute('tabindex')) {
          el.setAttribute('tabindex', '0');
        }
        
        if (!el.hasAttribute('role')) {
          el.setAttribute('role', 'button');
        }
        
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
          }
        });
      });
    }

    enlargeSmallClickTargets() {
      const clickableElements = document.querySelectorAll('a, button, input, [onclick]');
      
      clickableElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width < this.config.minClickTargetSize || rect.height < this.config.minClickTargetSize) {
          el.classList.add('webbridge-enlarged-target');
        }
      });
    }

    fixFocusTraps() {
      // Simple focus trap detection and fixing
      const modals = document.querySelectorAll('[role="dialog"], .modal, .popup');
      
      modals.forEach(modal => {
        const focusableElements = modal.querySelectorAll(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
              if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
              } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
              }
            }
          });
        }
      });
    }

    // Cognitive Difficulty Features
    initCognitiveFeatures() {
      this.addSimplificationButtons();
      this.addSummaryButtons();
    }

    addSimplificationButtons() {
      const textElements = document.querySelectorAll('p, article, section');
      
      textElements.forEach(el => {
        if (el.textContent.trim().length > 100) {
          const button = document.createElement('button');
          button.innerHTML = '📝 Simplify';
          button.className = 'webbridge-simplify-button';
          button.setAttribute('aria-label', 'Simplify this text');
          
          button.addEventListener('click', () => this.simplifyText(el));
          
          el.style.position = 'relative';
          el.appendChild(button);
        }
      });
    }

    addSummaryButtons() {
      const longContent = document.querySelectorAll('article, .post, .content');
      
      longContent.forEach(el => {
        if (el.textContent.trim().length > 500) {
          const button = document.createElement('button');
          button.innerHTML = '📄 Summarize';
          button.className = 'webbridge-summary-button';
          button.setAttribute('aria-label', 'Summarize this content');
          
          button.addEventListener('click', () => this.summarizeContent(el));
          
          el.style.position = 'relative';
          el.appendChild(button);
        }
      });
    }

    async simplifyText(element) {
      const originalText = element.textContent;
      const originalHTML = element.innerHTML;
      
      try {
        const systemPrompt = "You are a text simplification assistant. Rewrite the given text using simpler words, shorter sentences, and clearer structure. Maintain the original meaning but make it easier to read and understand. Return only the simplified text without any additional comments or formatting.";
        
        const prompt = `Simplify this text: ${originalText}`;
        const simplifiedText = await this.callTogetherAI(prompt, systemPrompt);
        
        if (simplifiedText) {
          element.setAttribute('data-original-html', originalHTML);
          element.innerHTML = `<div class="webbridge-simplified">${simplifiedText}</div>
            <button class="webbridge-restore-button" onclick="this.parentElement.innerHTML = this.parentElement.getAttribute('data-original-html')">
              Restore Original
            </button>`;
        }
      } catch (error) {
        console.error('Error simplifying text:', error);
      }
    }

    async summarizeContent(element) {
      const originalText = element.textContent;
      
      // Together AI call with specific system prompt
      const systemPrompt = "Create a concise summary of the given content in 2-3 clear sentences. Focus on the main points and key information.";
      
      const summary = await this.callTogetherAI(
        `Summarize this content: ${originalText}`, 
        systemPrompt
      );
      
      // Display summary at top of content
      const summaryDiv = document.createElement('div');
      summaryDiv.className = 'webbridge-summary';
      summaryDiv.innerHTML = `
        <h4>Summary:</h4>
        <p>${summary}</p>
        <button onclick="this.parentElement.style.display='none'">Hide Summary</button>
      `;
      
      element.insertBefore(summaryDiv, element.firstChild);
    }

    // Dyslexia Features
    initDyslexiaFeatures() {
      this.addDyslexiaFont();
      this.addLineSpacing();
      this.addReadingGuide();
    }

    addDyslexiaFont() {
      document.body.classList.add('webbridge-dyslexia-font');
    }

    addLineSpacing() {
      document.body.classList.add('webbridge-increased-spacing');
    }

    addReadingGuide() {
      const guide = document.createElement('div');
      guide.className = 'webbridge-reading-guide';
      guide.style.display = 'none';
      document.body.appendChild(guide);
      
      document.addEventListener('mousemove', (e) => {
        guide.style.top = (e.clientY - 2) + 'px';
        guide.style.display = 'block';
      });
    }

    // Seizure Protection Features
    initSeizureProtection() {
      this.detectAndDisableFlashing();
      this.addReduceMotionToggle();
    }

    detectAndDisableFlashing() {
      // Detect potentially seizure-inducing elements
      const animatedElements = document.querySelectorAll('*');
      
      animatedElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.animationDuration !== '0s' || styles.transitionDuration !== '0s') {
          el.classList.add('webbridge-motion-reduced');
        }
      });
      
      // Disable autoplay videos
      const videos = document.querySelectorAll('video[autoplay]');
      videos.forEach(video => {
        video.removeAttribute('autoplay');
        video.pause();
      });
    }

    addReduceMotionToggle() {
      document.body.classList.add('webbridge-reduce-motion');
    }

    // Hearing Impairment Features
    initHearingFeatures() {
      this.addCaptionsToMedia();
      this.convertAudioAlerts();
    }

    addCaptionsToMedia() {
      const videos = document.querySelectorAll('video');
      const audios = document.querySelectorAll('audio');
      
      [...videos, ...audios].forEach(media => {
        if (!media.querySelector('track[kind="captions"]')) {
          // Add placeholder for caption track
          const track = document.createElement('track');
          track.kind = 'captions';
          track.label = 'Generated Captions';
          track.src = 'data:text/vtt,WEBVTT\n\n00:00.000 --> 00:10.000\nCaptions unavailable';
          media.appendChild(track);
        }
      });
    }

    convertAudioAlerts() {
      // Override alert function to show visual alerts
      const originalAlert = window.alert;
      window.alert = function(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'webbridge-visual-alert';
        alertDiv.textContent = message;
        alertDiv.innerHTML += '<button onclick="this.parentElement.remove()">✕</button>';
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
          if (alertDiv.parentElement) {
            alertDiv.remove();
          }
        }, 5000);
      };
    }

    // Language Barrier Features
    initLanguageFeatures() {
      this.addTranslationButtons();
      this.addDefinitionPopups();
    }

    addTranslationButtons() {
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
      
      textElements.forEach(el => {
        if (el.textContent.trim().length > 50) {
          const button = document.createElement('button');
          button.innerHTML = '🌐 Translate';
          button.className = 'webbridge-translate-button';
          button.setAttribute('aria-label', 'Translate this text');
          
          button.addEventListener('click', () => this.translateText(el));
          
          el.style.position = 'relative';
          el.appendChild(button);
        }
      });
    }

    async translateText(element) {
      const originalText = element.textContent;
      const originalHTML = element.innerHTML;
      
      try {
        const systemPrompt = "You are a translation assistant. Translate the given text to simple, easy-to-understand English. If the text is already in English, rephrase it using simpler words and shorter sentences. Return only the translated/simplified text without any additional comments.";
        
        const prompt = `Translate or simplify this text: ${originalText}`;
        const translatedText = await this.callTogetherAI(prompt, systemPrompt);
        
        if (translatedText) {
          element.setAttribute('data-original-html', originalHTML);
          element.innerHTML = `<div class="webbridge-translated">${translatedText}</div>
            <button class="webbridge-restore-button" onclick="this.parentElement.innerHTML = this.parentElement.getAttribute('data-original-html')">
              Show Original
            </button>`;
        }
      } catch (error) {
        console.error('Error translating text:', error);
        // Fallback to placeholder translation
        const fallbackText = `[Translated] ${originalText}`;
        element.setAttribute('data-original-html', originalHTML);
        element.innerHTML = `<div class="webbridge-translated">${fallbackText}</div>
          <button class="webbridge-restore-button" onclick="this.parentElement.innerHTML = this.parentElement.getAttribute('data-original-html')">
            Show Original
          </button>`;
      }
    }

    addDefinitionPopups() {
      // Add double-click to define functionality
      document.addEventListener('dblclick', (e) => {
        const selection = window.getSelection().toString().trim();
        if (selection && selection.split(' ').length === 1) {
          this.showDefinition(selection, e.pageX, e.pageY);
        }
      });
    }

    async showDefinition(word, x, y) {
      const popup = document.createElement('div');
      popup.className = 'webbridge-definition-popup';
      popup.style.left = x + 'px';
      popup.style.top = y + 'px';
      popup.innerHTML = `
        <div>
          <strong>${word}</strong>
          <p>Loading definition...</p>
          <button onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
      `;
      
      document.body.appendChild(popup);
      
      try {
        const systemPrompt = "You are a dictionary assistant. Provide a simple, clear definition of the given word. Use easy-to-understand language and keep the definition concise (1-2 sentences). Return only the definition without any additional formatting or comments.";
        
        const prompt = `Define the word: ${word}`;
        const definition = await this.callTogetherAI(prompt, systemPrompt);
        
        if (definition) {
          const definitionP = popup.querySelector('p');
          definitionP.textContent = `Definition: ${definition}`;
        }
      } catch (error) {
        console.error('Error getting definition:', error);
        const definitionP = popup.querySelector('p');
        definitionP.textContent = 'Definition unavailable';
      }
      
      setTimeout(() => {
        if (popup.parentElement) {
          popup.remove();
        }
      }, 5000);
    }

    // Feature toggle methods
    toggleVisualFeatures(enabled) {
      const elements = document.querySelectorAll('[data-webbridge-issue]');
      elements.forEach(el => {
        el.style.display = enabled ? '' : 'none';
      });
    }

    toggleMotorFeatures(enabled) {
      const elements = document.querySelectorAll('[data-webbridge-issue]');
      elements.forEach(el => {
      el.style.display = enabled ? '' : 'none';
      });
    }

    toggleCognitiveFeatures(enabled) {
      const elements = document.querySelectorAll('[data-webbridge-issue]');
      elements.forEach(el => {
        el.style.display = enabled ? '' : 'none';
      });
    }

    toggleDyslexiaFeatures(enabled) {
      const elements = document.querySelectorAll('[data-webbridge-issue]');
      elements.forEach(el => {
        el.style.display = enabled ? '' : 'none';
      });
    }

    toggleSeizureProtection(enabled) {
      const elements = document.querySelectorAll('[data-webbridge-issue]');
      elements.forEach(el => {
        el.style.display = enabled ? '' : 'none';
      });
    }

    toggleHearingFeatures(enabled) {
      const elements = document.querySelectorAll('[data-webbridge-issue]');
      elements.forEach(el => {
        el.style.display = enabled ? '' : 'none';
      });
    }

    toggleLanguageFeatures(enabled) {
      const elements = document.querySelectorAll('[data-webbridge-issue]');
      elements.forEach(el => {
        el.style.display = enabled ? '' : 'none';
      });
    }

    /**
     * Adds placeholder text to input fields if missing, based on type or class.
     */
    addInputPlaceholders() {
      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => {
        if (!input.hasAttribute('placeholder') || input.getAttribute('placeholder').trim() === '') {
          // Use type or class to determine placeholder
          let placeholder = '';
          const type = input.getAttribute('type') || 'text';
          const classList = input.className.toLowerCase();
          if (type === 'email' || classList.includes('email')) {
            placeholder = 'Your Email';
          } else if (type === 'text' || classList.includes('name')) {
            placeholder = 'Your Name';
          } else if (type === 'password' || classList.includes('password')) {
            placeholder = 'Password';
          } else if (type === 'search' || classList.includes('search')) {
            placeholder = 'Search';
          } else if (type === 'tel' || classList.includes('phone')) {
            placeholder = 'Phone Number';
          } else if (type === 'number') {
            placeholder = 'Enter a number';
          } else {
            placeholder = 'Enter value';
          }
          input.setAttribute('placeholder', placeholder);
        }
      });
    }

    /**
     * Observes the DOM for new input elements and adds placeholders if missing.
     */
    observeInputPlaceholders() {
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // ELEMENT_NODE
              if (node.tagName === 'INPUT') {
                this.addInputPlaceholders();
              } else if (node.querySelectorAll) {
                if (node.querySelectorAll('input').length > 0) {
                  this.addInputPlaceholders();
                }
              }
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
  window.WebBridgeAccessibility = WebBridgeAccessibility;
}

// Message listener for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleFeature') {
    if (window.webBridge && window.webBridge.features.has(request.feature)) {
      window.webBridge.features.get(request.feature).toggle(request.enabled);
    }
  } else if (request.action === 'generateProfile') {
    if (window.webBridge) {
      window.webBridge.generateAccessibilityProfile(request.description)
        .then(profile => {
          sendResponse({ success: true, profile: profile });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep message channel open for async response
    }
  }
});

// Initialize WebBridge when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.webBridge) {
      window.webBridge = new window.WebBridgeAccessibility();
    }
  });
} else {
  if (!window.webBridge) {
    window.webBridge = new window.WebBridgeAccessibility();
  }
}
