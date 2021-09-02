import { LocalizePF2e } from "@system/localize";
import { registerSheets } from "../register-sheets";
import { calculateXP } from "@scripts/macros/xp";
import { launchTravelSheet } from "@scripts/macros/travel/travel-speed-sheet";
import { rollActionMacro, rollItemMacro } from "@scripts/macros/hotbar";
import { raiseAShield } from "@scripts/macros/raise-a-shield";
import { restForTheNight } from "@scripts/macros/rest-for-the-night";
import { steelYourResolve } from "@scripts/macros/steel-your-resolve";
import { encouragingWords } from "@scripts/macros/encouraging-words";
import { earnIncome } from "@scripts/macros/earn-income";
import { DicePF2e } from "@scripts/dice";
import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    ProficiencyModifier,
    StatisticModifier,
} from "@module/modifiers";
import { CheckPF2e } from "@system/rolls";
import { RuleElementPF2e, RuleElements } from "@module/rules/rules";
import { ConditionManager } from "@system/conditions";
import { StatusEffects } from "@scripts/actor/status-effects";
import { EffectsPanel } from "@system/effect-panel";
import { EffectTracker } from "@system/effect-tracker";
import { remigrate } from "@scripts/system/remigrate";
import { ActorImporter } from "@system/importer/actor-importer";
import { HomebrewElements } from "@module/settings/homebrew";

/**
 * This runs after game data has been requested and loaded from the servers, so entities exist
 */
export function listen() {
    Hooks.once("setup", () => {
        LocalizePF2e.ready = true;

        // Register actor and item sheets
        registerSheets();

        // Exposed objects for macros and modules
        Object.defineProperty(globalThis.game, "pf2e", { value: {} });
        game.pf2e.actions = {
            earnIncome,
            raiseAShield,
            restForTheNight,
            steelYourResolve,
            encouragingWords,
        };
        game.pf2e.importer = {
            actor: ActorImporter,
        };
        game.pf2e.rollItemMacro = rollItemMacro;
        game.pf2e.rollActionMacro = rollActionMacro;
        game.pf2e.gm = {
            calculateXP,
            launchTravelSheet,
        };
        game.pf2e.system = {
            remigrate,
        };
        game.pf2e.Dice = DicePF2e;
        game.pf2e.StatusEffects = StatusEffects;
        game.pf2e.ConditionManager = ConditionManager;
        game.pf2e.ModifierType = MODIFIER_TYPE;
        game.pf2e.Modifier = ModifierPF2e;
        game.pf2e.AbilityModifier = AbilityModifier;
        game.pf2e.ProficiencyModifier = ProficiencyModifier;
        game.pf2e.StatisticModifier = StatisticModifier;
        game.pf2e.CheckModifier = CheckModifier;
        game.pf2e.Check = CheckPF2e;
        game.pf2e.RuleElements = RuleElements;
        game.pf2e.RuleElement = RuleElementPF2e;

        // Start system sub-applications
        game.pf2e.effectPanel = new EffectsPanel();
        game.pf2e.effectTracker = new EffectTracker();

        // Assign the homebrew elements to their respective `CONFIG.PF2E` objects
        HomebrewElements.refreshTags();
    });
}
