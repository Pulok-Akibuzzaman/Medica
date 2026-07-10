// Language Switcher Component
class LanguageSwitcher {
  constructor() {
    this.createSwitcher();
  }

  createSwitcher() {
    const switcher = document.createElement('div');
    switcher.id = 'language-switcher';
    switcher.className = 'language-switcher';
    switcher.innerHTML = `
      <button class="lang-btn active" data-lang="en">EN</button>
      <button class="lang-btn" data-lang="bn">বাংলা</button>
    `;

    // Find nav-actions or create one
    let navActions = document.querySelector('.nav-actions');
    if (!navActions) {
      const navbar = document.querySelector('.navbar');
      navActions = document.createElement('div');
      navActions.className = 'nav-actions';
      navbar.querySelector('.nav-container').appendChild(navActions);
    }

    // Insert before theme toggle
    const themeToggle = navActions.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.parentElement.insertBefore(switcher, themeToggle);
    } else {
      navActions.insertBefore(switcher, navActions.firstChild);
    }

    this.setupEventListeners();
    this.updateActiveButton();
  }

  setupEventListeners() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        i18n.setLanguage(lang);
        this.updateActiveButton();
      });
    });

    // Listen for language changes from other components
    window.addEventListener('languageChanged', (e) => {
      this.updateActiveButton();
    });
  }

  updateActiveButton() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-lang') === i18n.getLanguage()) {
        btn.classList.add('active');
      }
    });
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new LanguageSwitcher();
  });
} else {
  new LanguageSwitcher();
}
