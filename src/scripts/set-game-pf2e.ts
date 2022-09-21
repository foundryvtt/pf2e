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
import { showEarnIncomePopup } from "@scripts/macros/earn-income";
import { encouragingWords } from "@scripts/macros/encouraging-words";
import { rollActionMacro, rollItemMacro } from "@scripts/macros/hotbar";
import { raiseAShield } from "@scripts/macros/raise-a-shield";
import { restForTheNight } from "@scripts/macros/rest-for-the-night";
import { steelYourResolve } from "@scripts/macros/steel-your-resolve";
import { launchTravelSheet } from "@scripts/macros/travel/travel-speed-sheet";
import { treatWounds } from "@scripts/macros/treat-wounds";
import { calculateXP } from "@scripts/macros/xp";
import { remigrate } from "@scripts/system/remigrate";
import { ActionMacros } from "@system/action-macros";
import { ConditionManager } from "@system/conditions";
import { EffectTracker } from "@system/effect-tracker";
import { ActorImporter } from "@system/importer/actor-importer";
import { CheckPF2e } from "@system/rolls";
import { TextEditorPF2e } from "@system/text-editor";
import { sluggify } from "@util";
import { registerModuleArt } from "./register-module-art";

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
            gm: { calculateXP, launchTravelSheet },
            importer: { actor: ActorImporter },
            licenseViewer: new LicenseViewer(),
            rollActionMacro,
            rollItemMacro,
            system: { moduleArt: { map: new Map(), refresh: registerModuleArt }, remigrate, sluggify },
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
