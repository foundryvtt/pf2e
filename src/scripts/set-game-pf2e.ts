import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression";
import { CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@actor/modifiers";
import { CoinsPF2e } from "@item/physical/helpers";
import { CompendiumBrowser } from "@module/apps/compendium-browser";
import { EffectsPanel } from "@module/apps/effects-panel";
import { LicenseViewer } from "@module/apps/license-viewer";
import { WorldClock } from "@module/apps/world-clock";
import { StatusEffects } from "@module/canvas/status-effects";
import { RuleElementPF2e, RuleElements } from "@module/rules";
import { DicePF2e } from "@scripts/dice";
import {
    calculateXP,
    editPersistent,
    encouragingWords,
    launchTravelSheet,
    perceptionForSelected,
    raiseAShield,
    restForTheNight,
    rollActionMacro,
    rollItemMacro,
    showEarnIncomePopup,
    stealthForSelected,
    steelYourResolve,
    treatWounds,
} from "@scripts/macros";
import { remigrate } from "@scripts/system/remigrate";
import { ActionMacros } from "@system/action-macros";
import { CheckPF2e } from "@system/check";
import { ConditionManager } from "@system/conditions";
import { EffectTracker } from "@system/effect-tracker";
import { ModuleArt } from "@system/module-art";
import { TextEditorPF2e } from "@system/text-editor";
import { sluggify } from "@util";

/** Expose public game.pf2e interface */
export const SetGamePF2e = {
    onInit: (): void => {
        const actions: Record<string, Function> = {
            encouragingWords,
            raiseAShield,
            restForTheNight,
            earnIncome: showEarnIncomePopup,
            steelYourResolve,
            treatWounds,
            ...ActionMacros,
        };

        const initSafe: Partial<typeof game["pf2e"]> = {
            Check: CheckPF2e,
            CheckModifier: CheckModifier,
            Coins: CoinsPF2e,
            ConditionManager: ConditionManager,
            Dice: DicePF2e,
            Modifier: ModifierPF2e,
            ModifierType: MODIFIER_TYPE,
            RuleElement: RuleElementPF2e,
            RuleElements: RuleElements,
            StatisticModifier: StatisticModifier,
            StatusEffects: StatusEffects,
            TextEditor: TextEditorPF2e,
            actions,
            effectPanel: new EffectsPanel(),
            effectTracker: new EffectTracker(),
            gm: { calculateXP, launchTravelSheet, perceptionForSelected, stealthForSelected, editPersistent },
            licenseViewer: new LicenseViewer(),
            rollActionMacro,
            rollItemMacro,
            system: { moduleArt: new ModuleArt(), remigrate, sluggify },
            variantRules: { AutomaticBonusProgression },
        };

        game.pf2e = mergeObject(game.pf2e ?? {}, initSafe);
    },

    onSetup: (): void => {},

    onReady: (): void => {
        game.pf2e.compendiumBrowser = new CompendiumBrowser();
        game.pf2e.worldClock = new WorldClock();
    },
};
