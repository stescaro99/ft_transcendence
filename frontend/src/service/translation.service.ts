import itTranslations from '../utils/lang/it.ts';
import enTranslations from '../utils/lang/en.ts';
import frTranslations from '../utils/lang/fr.ts';

const LANGS: Record<string, any> = {
    en: enTranslations,
    fr: frTranslations,
    it: itTranslations
};

export class TranslationService {
     private lang: string;
     private langMap: Record<string, any>;
    constructor(lang = 'en') {
        this.lang = lang;
         this.langMap = LANGS;
     }

     translateTemplate(tpl: string) {
        const map = this.langMap[this.lang] || this.langMap['en'];
         // supporta spazi interni e chiavi non alfanumeriche
         return tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
            const value = this.getNestedValue(map, key.trim());
            if (typeof value === 'string') return value;
            if (typeof value === 'number' || typeof value === 'boolean') return String(value);
            if (Array.isArray(value)) return value.join(', ');
            if (value && typeof value === 'object') return JSON.stringify(value);
            // log per debug: chiave mancante
            console.warn(`[TranslationService] Missing translation for key="${key.trim()}" lang="${this.lang}"`);
            return '';
        });
     }

     private getNestedValue(obj: any, path: string): any {
        if (!obj || !path) return undefined;
        const parts = path.replace(/\//g, '.').split('.');
        let cur = obj;
        for (const p of parts) {
            if (cur == null) return undefined;
            if (Object.prototype.hasOwnProperty.call(cur, p)) {
                cur = cur[p];
            } else if (Object.prototype.hasOwnProperty.call(cur, p.toLowerCase())) {
                cur = cur[p.toLowerCase()];
            } else {
                return undefined;
            }
        }
        return cur;
    }
}
