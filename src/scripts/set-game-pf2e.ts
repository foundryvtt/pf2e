import { Action } from "@actor/actions/index.ts";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression.ts";
import { CheckModifier, ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { CompendiumBrowser } from "@module/apps/compendium-browser/index.ts";
import { EffectsPanel } from "@module/apps/effects-panel.ts";
import { LicenseViewer } from "@module/apps/license-viewer/app.ts";
import { WorldClock } from "@module/apps/world-clock/index.ts";
import { StatusEffects } from "@module/canvas/status-effects.ts";
import { RuleElementPF2e, RuleElements } from "@module/rules/index.ts";
import { DicePF2e } from "@scripts/dice.ts";
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
} from "@scripts/macros/index.ts";
import { remigrate } from "@scripts/system/remigrate.ts";
import { ActionMacros, SystemActions } from "@system/action-macros/index.ts";
import { CheckPF2e } from "@system/check/check.ts";
import { ConditionManager } from "@system/conditions/index.ts";
import { EffectTracker } from "@system/effect-tracker.ts";
import { ModuleArt } from "@system/module-art.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { sluggify } from "@util";
import { xpFromEncounter } from "./macros/xp/dialog.ts";

/** Expose public game.pf2e interface */
export const SetGamePF2e = {
    onInit: (): void => {
        type ActionCollection = Record<string, Function> & Map<string, Action>;
        const actions = new Map<string, Action>(
            SystemActions.map((action) => [action.slug, action])
        ) as ActionCollection;
        // keep the old action functions around until everything has been converted
        for (const [name, action] of Object.entries({
            encouragingWords,
            raiseAShield,
            restForTheNight,
            earnIncome: showEarnIncomePopup,
            steelYourResolve,
            treatWounds,
            ...ActionMacros,
        })) {
            actions[name] = action;
        }

        const MODIFIER_TYPE = {
            ABILITY: "ability",
            PROFICIENCY: "proficiency",
            CIRCUMSTANCE: "circumstance",
            ITEM: "item",
            POTENCY: "potency",
            STATUS: "status",
            UNTYPED: "untyped",
        } as const;

        const initSafe: Partial<(typeof game)["pf2e"]> = {
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
            gm: {
                calculateXP,
                editPersistent,
                launchTravelSheet,
                perceptionForSelected,
                stealthForSelected,
                xpFromEncounter,
            },
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
