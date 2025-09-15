import { Action } from "@actor/actions/index.ts";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression.ts";
import { ElementalBlast } from "@actor/character/elemental-blast.ts";
import { CheckModifier, ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { CoinsPF2e, generateItemName } from "@item/physical/helpers.ts";
import { CompendiumBrowser } from "@module/apps/compendium-browser/browser.ts";
import { EffectsPanel } from "@module/apps/effects-panel.ts";
import { WorldClock } from "@module/apps/world-clock/index.ts";
import { StatusEffects } from "@module/canvas/status-effects.ts";
import { RuleElementPF2e } from "@module/rules/index.ts";
import { DicePF2e } from "@scripts/dice.ts";
import {
    calculateXP,
    checkPrompt,
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
    takeABreather,
    treatWounds,
    xpFromEncounter,
} from "@scripts/macros/index.ts";
import { remigrate } from "@scripts/system/remigrate.ts";
import { ActionMacros, SystemActions } from "@system/action-macros/index.ts";
import { CheckPF2e } from "@system/check/check.ts";
import { ConditionManager } from "@system/conditions/index.ts";
import { EffectTracker } from "@system/effect-tracker.ts";
import { ModuleArt } from "@system/module-art.ts";
import { Predicate } from "@system/predication.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { sluggify } from "@util";

/** Expose public game.pf2e interface */
export const SetGamePF2e = {
    onInit: (): void => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        type ActionCollection = Record<string, Function> & Collection<string, Action>;
        const actions = new Collection<string, Action>(
            SystemActions.map((action) => [action.slug, action]),
        ) as ActionCollection;
        // keep the old action functions around until everything has been converted
        for (const [name, action] of Object.entries({
            encouragingWords,
            raiseAShield,
            restForTheNight,
            earnIncome: showEarnIncomePopup,
            steelYourResolve,
            takeABreather,
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
            CheckModifier,
            Coins: CoinsPF2e,
            ConditionManager,
            Dice: DicePF2e,
            ElementalBlast,
            Modifier: ModifierPF2e,
            ModifierType: MODIFIER_TYPE,
            Predicate: Predicate,
            StatisticModifier: StatisticModifier,
            StatusEffects: StatusEffects,
            TextEditor: TextEditorPF2e,
            actions,
            effectPanel: new EffectsPanel(),
            effectTracker: new EffectTracker(),
            gm: {
                calculateXP,
                checkPrompt,
                editPersistent,
                launchTravelSheet,
                perceptionForSelected,
                stealthForSelected,
                xpFromEncounter,
            },
            rollActionMacro,
            rollItemMacro,
            system: { generateItemName, moduleArt: new ModuleArt(), remigrate, sluggify },
            variantRules: { AutomaticBonusProgression },
        };
        game.pf2e = Object.assign(game.pf2e ?? {}, initSafe);
        Object.defineProperties(game.pf2e, {
            RuleElement: { get: () => RuleElementPF2e },
            RuleElements: { get: () => CONFIG.PF2E.RuleElements },
        });

        const campaignType = game.settings.get("pf2e", "campaignType");
        game.pf2e.settings = {
            automation: {
                flanking: game.settings.get("pf2e", "automation.flankingDetection"),
                reachEnforcement: game.settings.get("pf2e", "automation.reachEnforcement"),
                removeEffects: game.settings.get("pf2e", "automation.removeExpiredEffects"),
            },
            campaign: {
                feats: {
                    enabled: game.settings.get("pf2e", "campaignFeats"),
                    sections: game.settings.get("pf2e", "campaignFeatSections"),
                },
                languages: game.settings.get("pf2e", "homebrew.languageRarities"),
                mythic: game.settings.get("pf2e", "mythic"),
                type: campaignType === "none" ? null : campaignType,
            },
            critFumble: {
                buttons: game.settings.get("pf2e", "critFumbleButtons"),
                cards: game.settings.get("pf2e", "drawCritFumble"),
            },
            encumbrance: game.settings.get("pf2e", "automation.encumbrance"),
            gmVision: game.settings.get("pf2e", "gmVision"),
            iwr: game.settings.get("pf2e", "automation.iwr"),
            metagame: {
                breakdowns: game.settings.get("pf2e", "metagame_showBreakdowns"),
                dcs: game.settings.get("pf2e", "metagame_showDC"),
                secretChecks: game.settings.get("pf2e", "metagame_secretChecks"),
                partyStats: game.settings.get("pf2e", "metagame_showPartyStats"),
                partyVision: game.settings.get("pf2e", "metagame_partyVision"),
                results: game.settings.get("pf2e", "metagame_showResults"),
            },
            rbv: game.settings.get("pf2e", "automation.rulesBasedVision"),
            tokens: {
                autoscale: game.settings.get("pf2e", "tokens.autoscale"),
                nameVisibility: game.settings.get("pf2e", "metagame_tokenSetsNameVisibility"),
                nathMode: game.settings.get("pf2e", "nathMode"),
            },
            totm: game.settings.get("pf2e", "totmToggles"),
            variants: {
                abp: game.settings.get("pf2e", "automaticBonusVariant"),
                fa: game.settings.get("pf2e", "freeArchetypeVariant"),
                gab: game.settings.get("pf2e", "gradualBoostsVariant"),
                pwol: {
                    enabled: game.settings.get("pf2e", "proficiencyVariant"),
                    modifiers: [
                        game.settings.get("pf2e", "proficiencyUntrainedModifier"),
                        game.settings.get("pf2e", "proficiencyTrainedModifier"),
                        game.settings.get("pf2e", "proficiencyExpertModifier"),
                        game.settings.get("pf2e", "proficiencyMasterModifier"),
                        game.settings.get("pf2e", "proficiencyLegendaryModifier"),
                    ],
                },
                stamina: game.settings.get("pf2e", "staminaVariant"),
            },
            worldClock: game.settings.get("pf2e", "worldClock"),
        };
    },

    onSetup: (): void => {},

    onReady: (): void => {
        game.pf2e.compendiumBrowser = new CompendiumBrowser();
        game.pf2e.worldClock = new WorldClock();
    },
};
