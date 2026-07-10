# Bangla Translation System

## Overview

Medica now includes a complete Bangla (Bengali) translation system. Users can seamlessly switch between English and Bangla (বাংলা) throughout the entire application.

## Features

- **Language Switcher**: A convenient button in the navigation bar to toggle between English and Bangla
- **Persistent Preference**: Selected language is saved in browser localStorage
- **Comprehensive Translations**: All UI elements, buttons, labels, and content are translated
- **Easy to Extend**: Simple system for adding more languages or translating additional strings

## How to Use

### For Users

1. Look for the language switcher in the top navigation bar (next to the theme toggle)
2. Click **EN** for English or **বাংলা** for Bangla
3. The entire application will instantly translate to the selected language
4. Your preference is automatically saved and will persist across sessions

### For Developers

#### Adding Translation Keys

1. Open `public/js/translations.js`
2. Add your new translation key to both `en` and `bn` objects:

```javascript
const translations = {
  en: {
    my_new_key: 'English text here',
    // ... other translations
  },
  bn: {
    my_new_key: 'বাংলা টেক্সট এখানে',
    // ... other translations
  }
};
```

#### Using Translations in HTML

Add the `data-i18n` attribute to HTML elements:

```html
<!-- For regular elements -->
<h1 data-i18n="hero_title">Your Health, Our Priority</h1>
<p data-i18n="hero_subtitle">Find trusted doctors...</p>

<!-- For input placeholders -->
<input type="text" data-i18n="medicines_search_placeholder" placeholder="Search medicines...">

<!-- For button labels -->
<button data-i18n="common_submit">Submit</button>
```

#### Using Translations in JavaScript

Use the global `i18n` object:

```javascript
// Get a translated string
const message = i18n.t('hero_title');

// Set language programmatically
i18n.setLanguage('bn'); // for Bangla
i18n.setLanguage('en'); // for English

// Get current language
const lang = i18n.getLanguage();

// Listen for language changes
window.addEventListener('languageChanged', (e) => {
  console.log('Language changed to:', e.detail.language);
});
```

## File Structure

```
public/
├── js/
│   ├── translations.js        # Main translation system (700+ keys)
│   ├── language-switcher.js   # Language switcher component
│   └── app.js                 # Updated to support translations
├── TRANSLATIONS.md            # This file
└── *.html                     # Updated HTML files with data-i18n attributes
```

## Translation Coverage

### Languages
- **English (en)** - Default language
- **Bangla (bn)** - Complete Bangla translations

### Categories
The translation system covers:
- Navigation elements
- Home page content and features
- Medicines page (search, filters, details)
- Doctors page (search, profiles)
- Diseases knowledge base
- Medical guidelines
- Investigation centers
- Authentication pages (login/register)
- Shopping cart and checkout
- User dashboard
- AI health assistant
- Admin panel
- Common UI elements (buttons, alerts, etc.)

## Key Translation Groups

| Group | Keys | Description |
|-------|------|-------------|
| Navigation | `nav_*` | Nav links, buttons, menu items |
| Home Page | `hero_*`, `features_*` | Hero section and feature cards |
| Medicines | `medicines_*`, `medicine_*` | Medicine browsing and details |
| Doctors | `doctors_*`, `doctor_*` | Doctor search and profiles |
| Diseases | `diseases_*`, `disease_*` | Disease articles and details |
| Guidelines | `guidelines_*`, `guideline_*` | Medical guidelines |
| Investigations | `investigations_*`, `investigation_*` | Diagnostic centers |
| Auth | `login_*`, `register_*` | Login and registration |
| Cart | `cart_*`, `checkout_*` | Shopping and checkout |
| Dashboard | `dashboard_*` | User dashboard |
| Chatbot | `chatbot_*` | AI assistant |
| Admin | `admin_*` | Admin panel |
| Common | `common_*` | Reusable UI strings |

## Implementation Details

### How It Works

1. **Page Load**: When a page loads, `translations.js` initializes the `i18n` object
2. **Language Detection**: The system checks localStorage for saved language preference (defaults to English)
3. **DOM Updates**: All elements with `data-i18n` attributes get their text content replaced with translated strings
4. **Event System**: When language changes, a `languageChanged` custom event is dispatched for components to listen to

### Storage

Language preference is stored in browser localStorage under the key `language`:
```javascript
localStorage.getItem('language') // Returns 'en' or 'bn'
```

### Dynamic Content

For dynamically generated content (from API responses), translation should happen at render time:

```javascript
function renderMedicine(medicine) {
  const html = `
    <h3>${medicine.name}</h3>
    <p>${i18n.t('medicine_generic')}: ${medicine.generic_name}</p>
    <p>${i18n.t('medicine_price')}: ${i18n.t('common_currency')}${medicine.price}</p>
  `;
  return html;
}
```

## Adding More Languages

To add a new language (e.g., Urdu):

1. Add the language code and translations to `translations.js`:
```javascript
const translations = {
  // ... existing translations
  ur: { // Urdu
    hero_title: 'آپ کی صحت، ہماری ترجیح',
    // ... all other keys
  }
};
```

2. Update the language switcher in `language-switcher.js`:
```javascript
<button class="lang-btn" data-lang="ur">اردو</button>
```

3. Update button labels for RTL support if needed:
```javascript
document.documentElement.dir = this.currentLanguage === 'ur' ? 'rtl' : 'ltr';
```

## Browser Compatibility

The translation system uses:
- `localStorage` - Supported in all modern browsers
- `data-*` attributes - HTML5 standard
- `CustomEvent` - IE 11+ (can polyfill if needed)
- `querySelectorAll()` - IE 8+

## Troubleshooting

**Translations not showing up:**
1. Verify `data-i18n` attribute is spelled correctly
2. Check that the key exists in `translations.js`
3. Make sure both `translations.js` and `language-switcher.js` are loaded
4. Check browser console for errors

**Language not persisting:**
- Check if browser localStorage is enabled
- Verify no browser privacy mode is blocking storage

**Partially translated page:**
- Not all text may have translations yet
- Add missing keys to `translations.js`

## Future Enhancements

- [ ] Translate API response content dynamically
- [ ] Add right-to-left (RTL) language support
- [ ] Implement server-side language preferences for logged-in users
- [ ] Add more languages (Urdu, Hindi, etc.)
- [ ] Create automated translation workflow
- [ ] Add language-specific fonts for better typography

## Contributing Translations

To improve or add translations:
1. Edit `public/js/translations.js`
2. Maintain the structure with both English and Bangla keys
3. Keep translation strings accurate and contextual
4. Test the translations on all pages
5. Submit as a pull request

## License

Translations are part of the Medica project and follow the same license.
