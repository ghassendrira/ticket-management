import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GeminiTranslationResponse {
  translatedText: string;
  detectedSourceLanguage: string;
}

@Injectable({ providedIn: 'root' })
export class GeminiTranslationService {
  private http = inject(HttpClient);
  
  private apiKey = environment.geminiApiKey;
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  // Cache mémoire pour éviter d'appeler Gemini 2x sur le même texte
  private translationCache = new Map<string, string>();

  translateText(text: string, targetLang: string): Observable<string> {
    if (!text || text.trim().length < 2) {
      return of(text);
    }

    const cacheKey = `${text}_${targetLang}`;
    if (this.translationCache.has(cacheKey)) {
      return of(this.translationCache.get(cacheKey)!);
    }

    const prompt = `Translate the following text to ${this.getLangName(targetLang)}. 
Only return the translation, no explanations, no quotes around the text.

Text: "${text}"`;

    const body = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    return this.http.post<any>(
      `${this.apiUrl}?key=${this.apiKey}`,
      body
    ).pipe(
      map(response => {
        const translated = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
        this.translationCache.set(cacheKey, translated);
        return translated;
      }),
      catchError(err => {
        console.error('Gemini translation error:', err);
        return of(text); // Fallback: texte original
      })
    );
  }

  private getLangName(code: string): string {
    const map: Record<string, string> = {
      fr: 'French',
      en: 'English',
      ar: 'Arabic',
      es: 'Spanish',
      de: 'German'
    };
    return map[code] || code;
  }
}