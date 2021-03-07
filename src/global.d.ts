import { WorldClock } from '@system/world-clock';
import { EffectPanel } from '@system/effect-panel';
import { rollActionMacro, rollItemMacro } from '@scripts/init';
import { calculateXP } from '@scripts/macros/xp';
import { launchTravelSheet } from '@scripts/macros/travel/travel-speed-sheet';
import { PF2EActor } from '@actor/actor';
import { PF2EItem } from '@item/item';
import { ConfigPF2e } from '@scripts/config';
import { PF2eSystem } from './module/pf2e-system';
import { PF2ECombat } from './module/combat';
import { PF2Check } from '@system/rolls';
import {
    AbilityModifier,
    PF2CheckModifier,
    PF2Modifier,
    PF2ModifierType,
    PF2StatisticModifier,
    ProficiencyModifier,
} from './module/modifiers';
import { PF2eConditionManager } from './module/conditions';
import { PF2eStatusEffects } from '@scripts/actor/status-effects';
import { DicePF2e } from '@scripts/dice';

type ItemTypeMap = {
    [K in keyof ConfigPF2e['PF2E']['Item']['entityClasses']]: InstanceType<
        ConfigPF2e['PF2E']['Item']['entityClasses'][K]
    >[];
};

declare global {
    interface Game {
        pf2e: {
            actions: { [key: string]: Function };
            worldClock?: WorldClock;
            effectPanel?: EffectPanel;
            rollActionMacro: typeof rollActionMacro;
            rollItemMacro: typeof rollItemMacro;
            gm: {
                calculateXP: typeof calculateXP;
                launchTravelSheet: typeof launchTravelSheet;
            };
        };
    }

    interface Actor {
        itemTypes: ItemTypeMap;
    }

    interface Window {
        PF2e: PF2eSystem;
        DicePF2e: typeof DicePF2e;
        PF2eStatusEffects: typeof PF2eStatusEffects;
        PF2eConditionManager: typeof PF2eConditionManager;
        PF2ModifierType: typeof PF2ModifierType;
        PF2Modifier: typeof PF2Modifier;
        AbilityModifier: typeof AbilityModifier;
        ProficiencyModifier: typeof ProficiencyModifier;
        PF2StatisticModifier: typeof PF2StatisticModifier;
        PF2CheckModifier: typeof PF2CheckModifier;
        PF2Check: typeof PF2Check;
    }
    const game: Game<PF2EActor, PF2EItem, PF2ECombat>;
    const CONFIG: ConfigPF2e;
    const canvas: Canvas<PF2EActor>;
    let PF2e: PF2eSystem;

    interface ClientSettings {
        get(module: 'pf2e', setting: 'worldSchemaVersion'): number;
    }

    interface WorldSettingsStorage {
        get(setting: 'pf2e.worldSchemaVersion'): string | undefined;
        getItem(setting: 'pf2e.worldSchemaVersion'): string | null;
    }

    const BUILD_MODE: 'development' | 'production';
}
