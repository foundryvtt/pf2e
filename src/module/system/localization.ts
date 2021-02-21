export class LocalizationPF2e {
    private static translations: typeof game.i18n._fallback;

    constructor() {
        if (!game.ready) {
            throw Error('PF2e System | TranslationsPF2e instantiated too early');
        }
        if (LocalizationPF2e.translations === undefined) {
            LocalizationPF2e.translations = mergeObject(game.i18n._fallback, game.i18n.translations, {
                enforceTypes: true,
            });
        }
    }

    get translations(): typeof game.i18n._fallback {
        return LocalizationPF2e.translations;
    }
}
