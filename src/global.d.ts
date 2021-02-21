declare type TranslationsPF2e = typeof import('../static/lang/en.json');

declare interface Game {
    pf2e: {
        actions: { [key: string]: Function };
        worldClock?: import('./module/system/world-clock').WorldClock;
        effectPanel?: import('./module/system/effect-panel').EffectPanel;
        rollItemMacro?: typeof import('./scripts/init').rollItemMacro;
        rollActionMacro: typeof import('./scripts/init').rollActionMacro;
    };

    socket: SocketIO.Socket & {
        emit(message: Pick<import('./scripts/socket').SocketEventCallback, 0>): void;
        on(event: string, ...message: import('./scripts/socket').SocketEventCallback): void;
    };

    i18n: Localization & {
        readonly translations: Localization['translations'] & DeepPartial<TranslationsPF2e>;
        _fallback: Localization['translations'] & TranslationsPF2e;
    };
}
declare const game: Game<import('./module/actor/actor').PF2EActor, import('./module/item/item').PF2EItem>;
declare const CONFIG: import('./scripts/config').ConfigPF2e;
declare const canvas: Canvas<import('./module/actor/actor').PF2EActor>;
declare let PF2e: import('./module/pf2e-system').PF2eSystem;
declare const BUILD_MODE: 'development' | 'production';
