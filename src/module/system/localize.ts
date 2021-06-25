import { ErrorPF2e } from '@module/utils';
import * as translationsPF2e from 'static/lang/en.json';

type TranslationsPF2e = Record<string, TranslationDictionaryValue> & typeof translationsPF2e;

export class LocalizePF2e {
    static ready = false;

    private static _translations: TranslationsPF2e;

    static get translations(): TranslationsPF2e {
        if (!this.ready) {
            throw ErrorPF2e('LocalizePF2e instantiated too early');
        }
        if (this._translations === undefined) {
            this._translations = mergeObject(game.i18n._fallback, game.i18n.translations, {
                enforceTypes: true,
            }) as TranslationsPF2e;
        }
        return this._translations;
    }
}
