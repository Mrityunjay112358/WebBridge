// WebBridge Popup Script
class WebBridgePopup {
  constructor() {
    this.profile = null;
    this.featureNames = {
      visual_impairment: 'Visual Impairment Support',
      motor_difficulty: 'Motor Difficulty Support',
      cognitive_difficulty: 'Cognitive Support',
      dyslexia: 'Dyslexia Support',
      seizure_sensitivity: 'Seizure Protection',
      hearing_impairment: 'Hearing Support',
      language_barrier: 'Language Support'
    };
    
    this.config = {
      llamaEndpoint: 'http://localhost:8080/api/chat'
    };
    
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadExistingProfile();
  }

  bindEvents() {
    const submitButton = document.getElementById('submitButton');
    const resetProfileButton = document.getElementById('resetProfileButton');
    const saveChangesButton = document.getElementById('saveChangesButton');
    
    if (submitButton) {
      submitButton.addEventListener('click', () => this.analyzeUserInput());
    }
    
    if (resetProfileButton) {
      resetProfileButton.addEventListener('click', () => this.resetProfile());
    }
    
    if (saveChangesButton) {
      saveChangesButton.addEventListener('click', () => this.saveProfileChanges());
    }
    
    // Allow Enter key in textarea
    const userInput = document.getElementById('userInput');
    if (userInput) {
      userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          this.analyzeUserInput();
        }
      });
    }
  }

  async loadExistingProfile() {
    try {
      const result = await chrome.storage.sync.get(['accessibilityProfile']);
      
      if (result.accessibilityProfile) {
        this.profile = result.accessibilityProfile;
        this.showProfileSection();
      } else {
        this.showOnboardingSection();
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      this.showMessage('Error loading your profile. Please try again.', 'error');
      this.showOnboardingSection();
    }
  }

  async analyzeUserInput() {
    const userInput = document.getElementById('userInput');
    const inputText = userInput.value.trim();
    
    if (!inputText) {
      this.showMessage('Please describe your accessibility needs.', 'error');
      return;
    }
    
    this.showLoadingSection();
    
    try {
      const profile = await this.callLlamaForProfiling(inputText);
      
      if (profile) {
        this.profile = profile;
        await this.saveProfile();
        this.showProfileSection();
        this.showMessage('Your accessibility profile has been created!', 'success');
      } else {
        throw new Error('Failed to analyze input');
      }
    } catch (error) {
      console.error('Error analyzing user input:', error);
      this.showMessage('Unable to analyze your needs. Please try again or check if the AI service is running.', 'error');
      this.showOnboardingSection();
    }
  }

  async callLlamaForProfiling(userInput) {
    const prompt = `Analyze this accessibility description and return ONLY a valid JSON object with boolean values for these exact keys: visual_impairment, motor_difficulty, cognitive_difficulty, dyslexia, seizure_sensitivity, hearing_impairment, language_barrier.

User description: "${userInput}"

Return only the JSON object, no other text:`;

    try {
      const response = await fetch(this.config.llamaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          max_tokens: 200,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.response || data.message || data.text || '';
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[^}]*\}/);
      if (jsonMatch) {
        const profileData = JSON.parse(jsonMatch[0]);
        
        // Validate the profile has all required keys
        const requiredKeys = ['visual_impairment', 'motor_difficulty', 'cognitive_difficulty', 'dyslexia', 'seizure_sensitivity', 'hearing_impairment', 'language_barrier'];
        const hasAllKeys = requiredKeys.every(key => typeof profileData[key] === 'boolean');
        
        if (hasAllKeys) {
          return profileData;
        }
      }
      
      // Fallback: create default profile based on common keywords
      return this.createFallbackProfile(userInput);
      
    } catch (error) {
      console.error('LLaMA API error:', error);
      return this.createFallbackProfile(userInput);
    }
  }

  createFallbackProfile(userInput) {
    const input = userInput.toLowerCase();
    
    return {
      visual_impairment: /blind|vision|sight|see|visual|eye/i.test(input),
      motor_difficulty: /motor|hand|arm|movement|click|mouse|mobility|physical/i.test(input),
      cognitive_difficulty: /cognitive|memory|focus|concentration|thinking|processing/i.test(input),
      dyslexia: /dyslexia|reading|text|words|letters/i.test(input),
      seizure_sensitivity: /seizure|epilep|flash|strobe|sensitive/i.test(input),
      hearing_impairment: /deaf|hearing|audio|sound|ear/i.test(input),
      language_barrier: /language|english|translate|understand|speak/i.test(input)
    };
  }

  async saveProfile() {
    try {
      await chrome.storage.sync.set({ accessibilityProfile: this.profile });
      
      // Notify content script about profile update
      chrome.runtime.sendMessage({
        action: 'updateProfile',
        profile: this.profile
      });
      
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }

  showOnboardingSection() {
    document.getElementById('onboardingSection').classList.remove('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('profileSection').classList.add('hidden');
  }

  showLoadingSection() {
    document.getElementById('onboardingSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.remove('hidden');
    document.getElementById('profileSection').classList.add('hidden');
  }

  showProfileSection() {
    document.getElementById('onboardingSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('profileSection').classList.remove('hidden');
    
    this.renderFeatureToggles();
  }

  renderFeatureToggles() {
    const container = document.getElementById('featureToggles');
    container.innerHTML = '';

    Object.entries(this.profile).forEach(([key, enabled]) => {
      const toggle = document.createElement('div');
      toggle.className = 'feature-toggle';
      
      toggle.innerHTML = `
        <span class="feature-name">${this.featureNames[key] || key}</span>
        <div class="toggle-switch ${enabled ? 'active' : ''}" data-feature="${key}">
          <div class="toggle-slider"></div>
        </div>
      `;
      
      const toggleSwitch = toggle.querySelector('.toggle-switch');
      toggleSwitch.addEventListener('click', () => this.toggleFeature(key, toggleSwitch));
      
      container.appendChild(toggle);
    });
  }

  toggleFeature(featureKey, toggleElement) {
    const isCurrentlyActive = toggleElement.classList.contains('active');
    const newState = !isCurrentlyActive;
    
    // Update UI
    toggleElement.classList.toggle('active', newState);
    
    // Update profile
    this.profile[featureKey] = newState;
    
    // Notify content script immediately
    chrome.runtime.sendMessage({
      action: 'toggleFeature',
      feature: featureKey,
      enabled: newState
    });
  }

  async saveProfileChanges() {
    try {
      await this.saveProfile();
      this.showMessage('Changes saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving changes:', error);
      this.showMessage('Error saving changes. Please try again.', 'error');
    }
  }

  async resetProfile() {
    if (confirm('Are you sure you want to reset your accessibility profile? This will delete all your settings.')) {
      try {
        await chrome.storage.sync.remove(['accessibilityProfile']);
        this.profile = null;
        this.showOnboardingSection();
        this.clearMessages();
        
        // Clear the input field
        const userInput = document.getElementById('userInput');
        if (userInput) {
          userInput.value = '';
        }
        
        this.showMessage('Profile reset successfully. Please describe your needs again.', 'success');
      } catch (error) {
        console.error('Error resetting profile:', error);
        this.showMessage('Error resetting profile. Please try again.', 'error');
      }
    }
  }

  showMessage(message, type = 'info') {
    const messageArea = document.getElementById('messageArea');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    
    messageArea.appendChild(messageDiv);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentElement) {
        messageDiv.remove();
      }
    }, 5000);
  }

  clearMessages() {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = '';
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WebBridgePopup();
});