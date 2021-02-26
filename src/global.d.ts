declare type TranslationsPF2e = typeof import('../static/lang/en.json');

declare interface Game {
    pf2e: {
        actions: { [key: string]: Function };
        worldClock?: import('./module/system/world-clock').WorldClock;
        effectPanel?: import('./module/system/effect-panel').EffectPanel;
        rollItemMacro?: typeof import('./scripts/init').rollItemMacro;
        rollActionMacro: typeof import('./scripts/init').rollActionMacro;
        gm: {
            calculateXP: Function;
            launchTravelSheet: Function;
        };
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

declare type ItemTypeMap = {
    [K in keyof import('./scripts/config').ConfigPF2e['PF2E']['Item']['entityClasses']]: InstanceType<
        import('./scripts/config').ConfigPF2e['PF2E']['Item']['entityClasses'][K]
    >[];
};
declare interface Actor {
    itemTypes: ItemTypeMap;
}

declare interface Window {
    PF2e: import('./module/pf2e-system').PF2eSystem;
    DicePF2e: typeof import('./scripts/dice').DicePF2e;
    PF2eStatusEffects: typeof import('./scripts/actor/status-effects').PF2eStatusEffects;
    PF2eConditionManager: typeof import('./module/conditions').PF2eConditionManager;
    PF2ModifierType: typeof import('./module/modifiers').PF2ModifierType;
    PF2Modifier: typeof import('./module/modifiers').PF2Modifier;
    AbilityModifier: typeof import('./module/modifiers').AbilityModifier;
    ProficiencyModifier: typeof import('./module/modifiers').ProficiencyModifier;
    PF2StatisticModifier: typeof import('./module/modifiers').PF2StatisticModifier;
    PF2CheckModifier: typeof import('./module/modifiers').PF2CheckModifier;
    PF2Check: typeof import('./module/system/rolls').PF2Check;
}
declare const game: Game<import('./module/actor/actor').PF2EActor, import('./module/item/item').PF2EItem>;
declare const CONFIG: import('./scripts/config').ConfigPF2e;
declare const canvas: Canvas<import('./module/actor/actor').PF2EActor>;
declare let PF2e: import('./module/pf2e-system').PF2eSystem;
declare const BUILD_MODE: 'development' | 'production';
