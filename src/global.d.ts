import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { ActiveEffectPF2e } from '@module/active-effect';
import { CompendiumDirectoryPF2e } from '@module/apps/ui/compendium-directory';
import { ChatMessagePF2e } from '@module/chat-message';
import { MacroPF2e } from '@module/macro';
import { RuleElements } from '@module/rules/rules';
import type { HomebrewSettingsKey, HomebrewTag } from '@module/settings/homebrew';
import { CombatTrackerPF2e } from '@module/system/combat-tracker';
import { StatusEffects } from '@scripts/actor/status-effects';
import { PF2ECONFIG, StatusEffectIconType } from '@scripts/config';
import { DicePF2e } from '@scripts/dice';
import { rollActionMacro, rollItemMacro } from '@scripts/macros/hotbar';
import { launchTravelSheet } from '@scripts/macros/travel/travel-speed-sheet';
import { calculateXP } from '@scripts/macros/xp';
import { EffectPanel } from '@system/effect-panel';
import { EffectTracker } from '@system/effect-tracker';
import { CheckPF2e } from '@system/rolls';
import { WorldClock } from '@system/world-clock';
import { CombatantPF2e } from '@module/combatant';
import { CombatPF2e } from './module/combat';
import { ConditionManager } from './module/conditions';
import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    ProficiencyModifier,
    StatisticModifier,
} from './module/modifiers';
import { TokenDocumentPF2e } from '@module/token-document';
import { UserPF2e } from '@module/user';
import { ScenePF2e } from '@module/scene';
import { CompendiumBrowser } from '@module/apps/compendium-browser';
import { TokenPF2e } from '@module/canvas/token';

declare global {
    interface Game {
        pf2e: {
            actions: { [key: string]: Function };
            compendiumBrowser: CompendiumBrowser;
            worldClock: WorldClock;
            effectPanel: EffectPanel;
            effectTracker: EffectTracker;
            rollActionMacro: typeof rollActionMacro;
            rollItemMacro: typeof rollItemMacro;
            gm: {
                calculateXP: typeof calculateXP;
                launchTravelSheet: typeof launchTravelSheet;
            };
            Dice: typeof DicePF2e;
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

    interface ConfigPF2e
        extends Config<
            ActiveEffectPF2e,
            ActorPF2e,
            ChatMessagePF2e,
            CombatantPF2e,
            CombatPF2e,
            ItemPF2e,
            MacroPF2e,
            TokenDocumentPF2e
        > {
        debug: Config['debug'] & {
            ruleElement: boolean;
        };

        PF2E: typeof PF2ECONFIG;
        time: {
            roundTime: number;
        };
        ui: Config<
            ActiveEffectPF2e,
            ActorPF2e,
            ChatMessagePF2e,
            CombatantPF2e,
            CombatPF2e,
            ItemPF2e,
            MacroPF2e,
            TokenDocumentPF2e
        >['ui'] & {
            combat: typeof CombatTrackerPF2e;
            compendium: typeof CompendiumDirectoryPF2e;
        };
    }

    const CONFIG: ConfigPF2e;
    const canvas: Canvas<TokenPF2e>;
    namespace globalThis {
        // eslint-disable-next-line no-var
        var game: Game<ActorPF2e, ChatMessagePF2e, CombatPF2e, ItemPF2e, MacroPF2e, ScenePF2e, UserPF2e>;
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

    interface ClientSettings {
        get(module: 'pf2e', setting: 'ancestryParagonVariant'): boolean;
        get(module: 'pf2e', setting: 'automation.lootableNPCs'): boolean;
        get(module: 'pf2e', setting: 'defaultTokenSettings'): boolean;
        get(module: 'pf2e', setting: 'defaultTokenSettingsBar'): number;
        get(module: 'pf2e', setting: 'defaultTokenSettingsName'): string;
        get(module: 'pf2e', setting: 'enabledRulesUI'): boolean;
        get(module: 'pf2e', setting: 'freeArchetypeVariant'): boolean;
        get(module: 'pf2e', setting: 'ignoreCoinBulk'): boolean;
        get(module: 'pf2e', setting: 'ignoreContainerOverflow'): boolean;
        get(module: 'pf2e', setting: 'pfsSheetTab'): boolean;
        get(module: 'pf2e', setting: 'staminaVariant'): 0 | 1;
        get(module: 'pf2e', setting: 'statusEffectType'): StatusEffectIconType;
        get(module: 'pf2e', setting: 'worldSchemaVersion'): number;
        get(module: 'pf2e', setting: 'drawCritFumble'): boolean;
        get(module: 'pf2e', setting: 'critFumbleButtons'): boolean;
        get(module: 'pf2e', setting: 'homebrew.weaponCategories'): HomebrewTag<'weaponCategories'>[];
        get(module: 'pf2e', setting: HomebrewSettingsKey): HomebrewTag[];
        get(module: 'pf2e', setting: 'identifyMagicNotMatchingTraditionModifier'): 0 | 2 | 5 | 10;
    }

    interface WorldSettingsStorage {
        get(setting: 'pf2e.worldSchemaVersion'): string | undefined;
        getItem(setting: 'pf2e.worldSchemaVersion'): string | null;
    }

    const BUILD_MODE: 'development' | 'production';
}
