import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class I18n {
  constructor() {
    this.translations = {};
    this.defaultLanguage = 'en';
    this.loadTranslations();
  }

  loadTranslations() {
    const langDir = path.join(__dirname, '../locales');
    
    // Read all language files
    fs.readdirSync(langDir).forEach(file => {
      if (file.endsWith('.json')) {
        const language = file.replace('.json', '');
        const content = fs.readFileSync(
          path.join(langDir, file),
          'utf8'
        );
        this.translations[language] = JSON.parse(content);
      }
    });
  }

  translate(key, language = this.defaultLanguage, params = {}) {
    // Get translation object for language, fallback to default
    const translations = this.translations[language] || this.translations[this.defaultLanguage];
    
    // Get nested key value
    const value = key.split('.').reduce((obj, k) => obj?.[k], translations);
    
    if (!value) return key; // Return key if translation not found

    // Replace parameters in string
    return value.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  // Middleware to handle translations in responses
  middleware() {
    return (req, res, next) => {
      // Get language from header or user preferences
      const language = 
        req.headers['accept-language']?.split(',')[0] ||
        req.user?.language ||
        this.defaultLanguage;

      // Store language in request
      req.language = language;

      // Add translation helper to response
      res.__ = (key, params) => this.translate(key, language, params);

      // Wrap res.json to automatically translate known keys
      const originalJson = res.json;
      res.json = function(obj) {
        const translated = this.translateObject(obj, language);
        return originalJson.call(this, translated);
      };

      next();
    };
  }

  // Helper to translate entire objects
  translateObject(obj, language) {
    if (!obj) return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.translateObject(item, language));
    }

    if (typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key.endsWith('_i18n') && typeof value === 'string') {
          // Remove _i18n suffix and translate value
          result[key.replace('_i18n', '')] = this.translate(value, language);
        } else {
          result[key] = this.translateObject(value, language);
        }
      }
      return result;
    }

    return obj;
  }
}

export const i18n = new I18n();
