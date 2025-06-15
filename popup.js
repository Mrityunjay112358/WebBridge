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
    const resetProfileButton = document.getElementById('resetProfileButton');
    const saveChangesButton = document.getElementById('saveChangesButton');
    
    
    if (resetProfileButton) {
      resetProfileButton.addEventListener('click', () => this.resetProfile());
    }
    
    if (saveChangesButton) {
      saveChangesButton.addEventListener('click', () => this.saveProfileChanges());
    }

  }

  async loadExistingProfile() {
    try {
      console.log('Loading existing profile...');
      const result = await chrome.storage.sync.get(['accessibilityProfile']);
      this.profile = result.accessibilityProfile || null;
      this.showProfileSection();
    } catch (error) {
      console.error('Error loading profile:', error);
      this.showMessage('Error loading your profile. Please try again.', 'error');
    }
  }

  async saveProfile() {
    try {
      await chrome.storage.sync.set({ accessibilityProfile: this.profile });
      
      // Notify content script about profile update
      chrome.runtime.sendMessage({
        action: 'updateProfile',
        profile: this.profile
      });
      // Reload the page to reflect changes
      window.location.reload();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }

  showProfileSection() {
    document.getElementById('profileSection').classList.remove('hidden');
    
    this.renderFeatureToggles();
  }

  renderFeatureToggles() {
    const container = document.getElementById('featureToggles');
    container.innerHTML = '';
    if (!this.profile) {
      this.profile = {
        visual_impairment: false,
        motor_difficulty: false,
        cognitive_difficulty: false,
        dyslexia: false,
        seizure_sensitivity: false,
        hearing_impairment: false,
        language_barrier: false
      };
    }
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

  showOnboardingSection() {
    // Hide profile section and show onboarding (if exists)
    const profileSection = document.getElementById('profileSection');
    if (profileSection) profileSection.classList.add('hidden');
    // If you have an onboarding section, show it here
    // Example: document.getElementById('onboardingSection').classList.remove('hidden');
  }

  showMessage(message, type = 'info') {
    const messageArea = document.getElementById('messageArea');
    this.clearMessages();
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      opacity: 0; transition: opacity 0.5s; margin: 10px 0; border-radius: 8px; font-weight: 500;
      padding: 12px 18px; font-size: 15px; text-align: center;
      ${type === 'success' ? 'background:linear-gradient(90deg,#43e97b 0%,#38f9d7 100%);color:#222;' : ''}
      ${type === 'error' ? 'background:linear-gradient(90deg,#ee9ca7 0%,#ffdde1 100%);color:#b71c1c;' : ''}
      ${type === 'info' ? 'background:linear-gradient(90deg,#2193b0 0%,#6dd5ed 100%);color:#222;' : ''}
    `;
    messageArea.appendChild(messageDiv);
    setTimeout(() => { messageDiv.style.opacity = 1; }, 10);
    setTimeout(() => {
      if (messageDiv.parentElement) {
        messageDiv.style.opacity = 0;
        setTimeout(() => messageDiv.remove(), 500);
      }
    }, 4000);
  }

  clearMessages() {
    const messageArea = document.getElementById('messageArea');
    if (messageArea) messageArea.innerHTML = '';
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WebBridgePopup();
});