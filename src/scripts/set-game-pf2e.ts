import { Action } from "@actor/actions/index.ts";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression.ts";
import { ElementalBlast } from "@actor/character/elemental-blast.ts";
import { CheckModifier, Modifier, StatisticModifier } from "@actor/modifiers.ts";
import { Coins, generateItemName } from "@item/physical/helpers.ts";
import { CompendiumBrowser } from "@module/apps/compendium-browser/browser.ts";
import { EffectsPanel } from "@module/apps/effects-panel.ts";
import { WorldClock } from "@module/apps/world-clock/index.ts";
import { StatusEffects } from "@module/canvas/status-effects.ts";
import { RuleElement, RuleElements } from "@module/rules/index.ts";
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
    stealthForSelected,
    steelYourResolve,
    takeABreather,
    treatWounds,
    xpFromEncounter,
} from "@scripts/macros/index.ts";
import { remigrate } from "@scripts/system/remigrate.ts";
import { ActionMacros, SF2eOnlySystemActions, SystemActions } from "@system/action-macros/index.ts";
import { Check } from "@system/check/check.ts";
import { ConditionManager } from "@system/conditions/index.ts";
import { EffectTracker } from "@system/effect-tracker.ts";
import { ModuleArt } from "@system/module-art.ts";
import { Predicate } from "@system/predication.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { sluggify } from "@util";
import { EarnIncomeDialog } from "./macros/earn-income.ts";

/** Expose public game.pf2e interface */
export const SetGamePF2e = {
    onInit: (): void => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        type ActionCollection = Record<string, Function> & Collection<string, Action>;
        const actions = new Collection<string, Action>(
            SystemActions.map((action) => [action.slug, action]),
        ) as ActionCollection;
        if (SYSTEM_ID === "sf2e" || game.modules.get("sf2e-anachronism")?.active) {
            for (const sf2eAction of SF2eOnlySystemActions) {
                actions.set(sf2eAction.slug, sf2eAction);
            }
        }
        // keep the old action functions around until everything has been converted
        for (const [name, action] of Object.entries({
            encouragingWords,
            raiseAShield,
            restForTheNight,
            earnIncome: EarnIncomeDialog.create,
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
            Check: Check,
            CheckModifier,
            Coins: Coins,
            ConditionManager,
            Dice: DicePF2e,
            ElementalBlast,
            Modifier: Modifier,
            ModifierType: MODIFIER_TYPE,
            Predicate: Predicate,
            RuleElement: RuleElement,
            RuleElements: RuleElements,
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
        game.pf2e = fu.mergeObject(game.pf2e ?? {}, initSafe);

        const campaignType = game.settings.get(SYSTEM_ID, "campaignType");
        game.pf2e.settings = {
            automation: {
                flanking: game.settings.get(SYSTEM_ID, "automation.flankingDetection"),
                reachEnforcement: game.settings.get(SYSTEM_ID, "automation.reachEnforcement"),
                removeEffects: game.settings.get(SYSTEM_ID, "automation.removeExpiredEffects"),
            },
            campaign: {
                feats: {
                    enabled: game.settings.get(SYSTEM_ID, "campaignFeats"),
                    sections: game.settings.get(SYSTEM_ID, "campaignFeatSections"),
                },
                languages: game.settings.get(SYSTEM_ID, "homebrew.languageRarities"),
                mythic: game.settings.get(SYSTEM_ID, "mythic"),
                type: campaignType === "none" ? null : campaignType,
            },
            critFumble: {
                buttons: game.settings.get(SYSTEM_ID, "critFumbleButtons"),
                cards: game.settings.get(SYSTEM_ID, "drawCritFumble"),
            },
            distanceDisplay: game.settings.get(SYSTEM_ID, "distanceDisplay"),
            encumbrance: game.settings.get(SYSTEM_ID, "automation.encumbrance"),
            gmVision: game.settings.get(SYSTEM_ID, "gmVision"),
            iwr: game.settings.get(SYSTEM_ID, "automation.iwr"),
            metagame: {
                breakdowns: game.settings.get(SYSTEM_ID, "metagame_showBreakdowns"),
                dcs: game.settings.get(SYSTEM_ID, "metagame_showDC"),
                secretChecks: game.settings.get(SYSTEM_ID, "metagame_secretChecks"),
                partyStats: game.settings.get(SYSTEM_ID, "metagame_showPartyStats"),
                partyVision: game.settings.get(SYSTEM_ID, "metagame_partyVision"),
                results: game.settings.get(SYSTEM_ID, "metagame_showResults"),
            },
            rbv: game.settings.get(SYSTEM_ID, "automation.rulesBasedVision"),
            tokens: {
                autoscale: game.settings.get(SYSTEM_ID, "tokens.autoscale"),
                nameVisibility: game.settings.get(SYSTEM_ID, "metagame_tokenSetsNameVisibility"),
                nathMode: game.settings.get(SYSTEM_ID, "nathMode"),
            },
            totm: game.settings.get(SYSTEM_ID, "totmToggles"),
            variants: {
                abp: game.settings.get(SYSTEM_ID, "automaticBonusVariant"),
                fa: game.settings.get(SYSTEM_ID, "freeArchetypeVariant"),
                gab: game.settings.get(SYSTEM_ID, "gradualBoostsVariant"),
                pwol: {
                    enabled: game.settings.get(SYSTEM_ID, "proficiencyVariant"),
                    modifiers: [
                        game.settings.get(SYSTEM_ID, "proficiencyUntrainedModifier"),
                        game.settings.get(SYSTEM_ID, "proficiencyTrainedModifier"),
                        game.settings.get(SYSTEM_ID, "proficiencyExpertModifier"),
                        game.settings.get(SYSTEM_ID, "proficiencyMasterModifier"),
                        game.settings.get(SYSTEM_ID, "proficiencyLegendaryModifier"),
                    ],
                },
                stamina: game.settings.get(SYSTEM_ID, "staminaVariant"),
            },
            worldClock: game.settings.get(SYSTEM_ID, "worldClock"),
        };
    },

    onSetup: (): void => {},

    onReady: (): void => {
        game.pf2e.compendiumBrowser = new CompendiumBrowser();
        game.pf2e.worldClock = new WorldClock();
    },
};
