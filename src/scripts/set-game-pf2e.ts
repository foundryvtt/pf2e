import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression";
import { CompendiumBrowser } from "@module/apps/compendium-browser";
import { EffectsPanel } from "@module/apps/effects-panel";
import { LicenseViewer } from "@module/apps/license-viewer";
import { WorldClock } from "@module/apps/world-clock";
import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    ProficiencyModifier,
    StatisticModifier,
} from "@actor/modifiers";
import { RuleElementPF2e, RuleElements } from "@module/rules";
import { StatusEffects } from "@scripts/actor/status-effects";
import { DicePF2e } from "@scripts/dice";
import { earnIncome } from "@scripts/macros/earn-income";
import { encouragingWords } from "@scripts/macros/encouraging-words";
import { rollActionMacro, rollItemMacro } from "@scripts/macros/hotbar";
import { raiseAShield } from "@scripts/macros/raise-a-shield";
import { restForTheNight } from "@scripts/macros/rest-for-the-night";
import { steelYourResolve } from "@scripts/macros/steel-your-resolve";
import { launchTravelSheet } from "@scripts/macros/travel/travel-speed-sheet";
import { calculateXP } from "@scripts/macros/xp";
import { remigrate } from "@scripts/system/remigrate";
import { ActionMacros } from "@system/action-macros";
import { ConditionManager } from "@system/conditions";
import { EffectTracker } from "@system/effect-tracker";
import { ActorImporter } from "@system/importer/actor-importer";
import { CheckPF2e } from "@system/rolls";
import { TextEditorPF2e } from "@system/text-editor";
import { sluggify } from "@util";
import { CoinsPF2e } from "@item/physical/helpers";

/** Expose public game.pf2e interface */
export const SetGamePF2e = {
    onInit: (): void => {
        Object.defineProperty(globalThis.game, "pf2e", { value: {} });

        const actions: Record<string, Function> = {
            earnIncome,
            encouragingWords,
            raiseAShield,
            restForTheNight,
            steelYourResolve,
            ...ActionMacros,
        };

        const initSafe: Partial<typeof game["pf2e"]> = {
            actions,
            AbilityModifier: AbilityModifier,
            Check: CheckPF2e,
            CheckModifier: CheckModifier,
            ConditionManager: ConditionManager,
            Coins: CoinsPF2e,
            Dice: DicePF2e,
            effectPanel: new EffectsPanel(),
            effectTracker: new EffectTracker(),
            gm: { calculateXP, launchTravelSheet },
            importer: { actor: ActorImporter },
            licenseViewer: new LicenseViewer(),
            Modifier: ModifierPF2e,
            ModifierType: MODIFIER_TYPE,
            ProficiencyModifier: ProficiencyModifier,
            rollActionMacro,
            rollItemMacro,
            RuleElement: RuleElementPF2e,
            RuleElements: RuleElements,
            StatisticModifier: StatisticModifier,
            StatusEffects: StatusEffects,
            system: { moduleArt: new Map(), remigrate, sluggify },
            TextEditor: TextEditorPF2e,
            variantRules: { AutomaticBonusProgression },
        };

        mergeObject(game.pf2e, initSafe);
    },

    onSetup: (): void => {},

    onReady: (): void => {
        game.pf2e.compendiumBrowser = new CompendiumBrowser();
        game.pf2e.worldClock = new WorldClock();
    },
};
