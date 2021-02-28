export class LocalizePF2e {
    private static _translations: typeof game.i18n._fallback;

    static get translations(): typeof game.i18n._fallback {
        if (!game.ready) {
            throw Error('PF2e System | TranslationsPF2e instantiated too early');
        }
        if (this._translations === undefined) {
            this._translations = mergeObject(game.i18n._fallback, game.i18n.translations, {
                enforceTypes: true,
            });
        }
        return this._translations;
    }
}
