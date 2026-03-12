import AsyncStorage from '@react-native-async-storage/async-storage';

// Translation API Services
export interface TranslationService {
  translate(text: string, targetLanguage: string): Promise<string>;
  detectLanguage(text: string): Promise<string>;
  getSupportedLanguages(): Promise<string[]>;
}

// Google Translate API Implementation
class GoogleTranslateService implements TranslationService {
  private apiKey: string;
  private baseUrl = 'https://translation.googleapis.com/language/translate/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          format: 'text'
        })
      });

      const data = await response.json();
      return data.data.translations[0].translatedText;
    } catch (error) {
      console.error('Google Translate error:', error);
      throw error;
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: text })
      });

      const data = await response.json();
      return data.data.detections[0][0].language;
    } catch (error) {
      console.error('Language detection error:', error);
      throw error;
    }
  }

  async getSupportedLanguages(): Promise<string[]> {
    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?key=${this.apiKey}`);
      const data = await response.json();
      return data.data.languages.map((lang: any) => lang.language);
    } catch (error) {
      console.error('Get languages error:', error);
      throw error;
    }
  }
}

// Microsoft Translator API Implementation
class MicrosoftTranslatorService implements TranslationService {
  private apiKey: string;
  private region: string;
  private baseUrl = 'https://api.cognitive.microsofttranslator.com';

  constructor(apiKey: string, region: string = 'global') {
    this.apiKey = apiKey;
    this.region = region;
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/translate?api-version=3.0&to=${targetLanguage}`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Ocp-Apim-Subscription-Region': this.region,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ text }])
      });

      const data = await response.json();
      return data[0].translations[0].text;
    } catch (error) {
      console.error('Microsoft Translator error:', error);
      throw error;
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/detect?api-version=3.0`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Ocp-Apim-Subscription-Region': this.region,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ text }])
      });

      const data = await response.json();
      return data[0].language;
    } catch (error) {
      console.error('Language detection error:', error);
      throw error;
    }
  }

  async getSupportedLanguages(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/languages?api-version=3.0`);
      const data = await response.json();
      return Object.keys(data.translation);
    } catch (error) {
      console.error('Get languages error:', error);
      throw error;
    }
  }
}

// OpenAI GPT-based Translation (More contextual for medical terms)
class OpenAITranslationService implements TranslationService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    try {
      const prompt = `Translate the following medical/healthcare text to ${targetLanguage}. 
      Maintain medical accuracy and cultural sensitivity. 
      If it's a medical term, provide the most appropriate local equivalent.
      
      Text to translate: "${text}"
      
      Provide only the translation, no explanations.`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.3
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI Translation error:', error);
      throw error;
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const prompt = `Detect the language of this text and return only the ISO 639-1 language code (e.g., 'en', 'mr', 'hi'): "${text}"`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 10,
          temperature: 0
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim().toLowerCase();
    } catch (error) {
      console.error('Language detection error:', error);
      throw error;
    }
  }

  async getSupportedLanguages(): Promise<string[]> {
    // OpenAI supports most languages, return common ones
    return ['en', 'mr', 'hi', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'or', 'pa', 'as', 'ur'];
  }
}

// Translation Cache for Offline Support
class TranslationCache {
  private cacheKey = 'translation_cache';

  async get(text: string, targetLanguage: string): Promise<string | null> {
    try {
      const cache = await AsyncStorage.getItem(this.cacheKey);
      if (cache) {
        const parsed = JSON.parse(cache);
        const key = `${text}_${targetLanguage}`;
        return parsed[key] || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async set(text: string, targetLanguage: string, translation: string): Promise<void> {
    try {
      const cache = await AsyncStorage.getItem(this.cacheKey);
      const parsed = cache ? JSON.parse(cache) : {};
      const key = `${text}_${targetLanguage}`;
      parsed[key] = translation;
      
      // Keep only last 1000 translations to manage storage
      const entries = Object.entries(parsed);
      if (entries.length > 1000) {
        const recent = entries.slice(-1000);
        await AsyncStorage.setItem(this.cacheKey, JSON.stringify(Object.fromEntries(recent)));
      } else {
        await AsyncStorage.setItem(this.cacheKey, JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

// Main Translation Manager
export class TranslationManager {
  private service: TranslationService;
  private cache: TranslationCache;
  private fallbackTranslations: { [key: string]: { [key: string]: string } };

  constructor(service: TranslationService, fallbackTranslations: any = {}) {
    this.service = service;
    this.cache = new TranslationCache();
    this.fallbackTranslations = fallbackTranslations;
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    try {
      // Check cache first
      const cached = await this.cache.get(text, targetLanguage);
      if (cached) {
        return cached;
      }

      // Try API translation
      const translation = await this.service.translate(text, targetLanguage);
      
      // Cache the result
      await this.cache.set(text, targetLanguage, translation);
      
      return translation;
    } catch (error) {
      console.error('Translation failed, using fallback:', error);
      
      // Use fallback translations
      const fallback = this.fallbackTranslations[targetLanguage]?.[text];
      return fallback || text; // Return original text if no fallback
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      return await this.service.detectLanguage(text);
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en'; // Default to English
    }
  }

  async translateBatch(texts: string[], targetLanguage: string): Promise<string[]> {
    const translations = await Promise.allSettled(
      texts.map(text => this.translate(text, targetLanguage))
    );

    return translations.map((result, index) => 
      result.status === 'fulfilled' ? result.value : texts[index]
    );
  }
}

// Factory function to create translation service
export const createTranslationService = (provider: 'google' | 'microsoft' | 'openai', config: any): TranslationService => {
  switch (provider) {
    case 'google':
      return new GoogleTranslateService(config.apiKey);
    case 'microsoft':
      return new MicrosoftTranslatorService(config.apiKey, config.region);
    case 'openai':
      return new OpenAITranslationService(config.apiKey);
    default:
      throw new Error(`Unsupported translation provider: ${provider}`);
  }
};

// Export default instance
const GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export const translationService = OPENAI_API_KEY 
  ? createTranslationService('openai', { apiKey: OPENAI_API_KEY })
  : createTranslationService('google', { apiKey: GOOGLE_API_KEY });

export const translationManager = new TranslationManager(translationService);