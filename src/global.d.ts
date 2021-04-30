import { WorldClock } from '@system/world-clock';
import { EffectPanel } from '@system/effect-panel';
import { rollActionMacro, rollItemMacro } from '@scripts/macros/hotbar';
import { calculateXP } from '@scripts/macros/xp';
import { launchTravelSheet } from '@scripts/macros/travel/travel-speed-sheet';
import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { ConfigPF2e, StatusEffectIconType } from '@scripts/config';
import { CombatPF2e } from './module/combat';
import { CheckPF2e } from '@system/rolls';
import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    StatisticModifier,
    ProficiencyModifier,
} from './module/modifiers';
import { ConditionManager } from './module/conditions';
import { StatusEffects } from '@scripts/actor/status-effects';
import { DicePF2e } from '@scripts/dice';
import { ItemType } from '@item/data-definitions';
import { RuleElements } from '@module/rules/rules';
import { HomebrewSettingsKey, HomebrewTag } from '@module/settings/homebrew';
import { MacroPF2e } from '@module/macro';

type ItemTypeMap = {
    [K in ItemType]: Owned<InstanceType<ConfigPF2e['PF2E']['Item']['entityClasses'][K]>>[];
};

declare global {
    interface Game {
        pf2e: {
            actions: { [key: string]: Function };
            worldClock: WorldClock;
            effectPanel: EffectPanel;
            rollActionMacro: typeof rollActionMacro;
            rollItemMacro: typeof rollItemMacro;
            gm: {
                calculateXP: typeof calculateXP;
                launchTravelSheet: typeof launchTravelSheet;
            };
            DicePF2e: typeof DicePF2e;
            StatusEffects: typeof StatusEffects;
            ConditionManager: typeof ConditionManager;
            ModifierType: typeof MODIFIER_TYPE;
            Modifier: typeof ModifierPF2e;
            AbilityModifier: typeof AbilityModifier;
            ProficiencyModifier: typeof ProficiencyModifier;
            StatisticModifier: typeof StatisticModifier;
            CheckModifier: typeof CheckModifier;
            Check: typeof CheckPF2e;
            RuleElements: typeof RuleElements;
        };
    }

    interface Actor {
        itemTypes: ItemTypeMap;
    }

    const CONFIG: ConfigPF2e;
    const canvas: Canvas<ActorPF2e>;
    namespace globalThis {
        // eslint-disable-next-line no-var
        var game: Game<ActorPF2e, ItemPF2e, CombatPF2e, MacroPF2e>;
    }

    interface Window {
        DicePF2e: typeof DicePF2e;
        PF2eStatusEffects: typeof StatusEffects;
        PF2eConditionManager: typeof ConditionManager;
        PF2ModifierType: typeof MODIFIER_TYPE;
        PF2Modifier: typeof ModifierPF2e;
        AbilityModifier: typeof AbilityModifier;
        ProficiencyModifier: typeof ProficiencyModifier;
        PF2StatisticModifier: typeof StatisticModifier;
        PF2CheckModifier: typeof CheckModifier;
        PF2Check: typeof CheckPF2e;
    }

    interface ChatMessage extends Entity {
        getFlag(scope: 'pf2e', key: 'canReroll'): boolean | undefined;
        getFlag(scope: 'pf2e', key: 'damageRoll'): object | undefined;
    }

    interface User extends Entity {
        getFlag(
            scope: 'pf2e',
            key: 'settings',
        ): {
            uiTheme: 'blue' | 'red' | 'original' | 'ui';
            showEffectPanel: boolean;
            showRollDialogs: boolean;
        };
        getFlag(scope: 'pf2e', key: 'settings.uiTheme'): 'blue' | 'red' | 'original' | 'ui';
        getFlag(scope: 'pf2e', key: 'settings.showEffectPanel'): boolean;
        getFlag(scope: 'pf2e', key: 'settings.showRollDialogs'): boolean;
        getFlag(scope: 'pf2e', key: `compendiumFolders.${string}.expanded`): boolean | undefined;
    }

    interface ClientSettings {
        get(module: 'pf2e', setting: 'ancestryParagonVariant'): boolean;
        get(module: 'pf2e', setting: 'automation.lootableNPCs'): boolean;
        get(module: 'pf2e', setting: 'defaultTokenSettingsBar'): number;
        get(module: 'pf2e', setting: 'defaultTokenSettingsName'): string;
        get(module: 'pf2e', setting: 'enabledRulesUI'): boolean;
        get(module: 'pf2e', setting: 'freeArchetypeVariant'): boolean;
        get(module: 'pf2e', setting: 'ignoreCoinBulk'): boolean;
        get(module: 'pf2e', setting: 'ignoreContainerOverflow'): boolean;
        get(module: 'pf2e', setting: 'pfsSheetTab'): boolean;
        get(module: 'pf2e', setting: 'staminaVariant'): number;
        get(module: 'pf2e', setting: 'statusEffectType'): StatusEffectIconType;
        get(module: 'pf2e', setting: 'worldSchemaVersion'): number;
        get(module: 'pf2e', setting: 'drawCritFumble'): boolean;
        get(module: 'pf2e', setting: 'critFumbleButtons'): boolean;
        get(module: 'pf2e', setting: HomebrewSettingsKey): HomebrewTag[];
    }

    interface WorldSettingsStorage {
        get(setting: 'pf2e.worldSchemaVersion'): string | undefined;
        getItem(setting: 'pf2e.worldSchemaVersion'): string | null;
    }

    const BUILD_MODE: 'development' | 'production';
}
