import { resetActors } from "@actor/helpers.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { ItemSheetPF2e, type ItemPF2e } from "@item";
import { StatusEffects } from "@module/canvas/status-effects.ts";
import { MigrationRunner } from "@module/migration/runner/index.ts";
import { isImageOrVideoPath, tupleHasValue } from "@util";
import * as R from "remeda";
import { AutomationSettings } from "./automation.ts";
import { HomebrewElements } from "./homebrew/menu.ts";
import { MetagameSettings } from "./metagame.ts";
import { VariantRulesSettings } from "./variant-rules.ts";
import { WorldClockSettings } from "./world-clock.ts";
import fields = foundry.data.fields;

export function registerSettings(): void {
    if (BUILD_MODE === "development") {
        registerWorldSchemaVersion();
    }

    game.settings.register("pf2e", "tokens.autoscale", {
        name: "PF2E.SETTINGS.Tokens.Autoscale.Name",
        hint: "PF2E.SETTINGS.Tokens.Autoscale.Hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        onChange: (value) => {
            game.pf2e.settings.tokens.autoscale = !!value;
        },
    });

    game.settings.register("pf2e", "identifyMagicNotMatchingTraditionModifier", {
        name: "PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Name",
        hint: "PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Hint",
        choices: {
            0: "PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.0",
            2: "PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.2",
            5: "PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.5",
            10: "PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.10",
        },
        type: Number,
        default: 5,
        scope: "world",
        config: true,
    });

    game.settings.register("pf2e", "critRule", {
        name: "PF2E.SETTINGS.CritRule.Name",
        hint: "PF2E.SETTINGS.CritRule.Hint",
        scope: "world",
        config: true,
        default: "doubledamage",
        type: String,
        choices: {
            doubledamage: "PF2E.SETTINGS.CritRule.Choices.Doubledamage",
            doubledice: "PF2E.SETTINGS.CritRule.Choices.Doubledice",
        },
        onChange: () => {
            for (const sheet of Object.values(ui.windows).filter((w) => w instanceof ActorSheetPF2e)) {
                sheet.render();
            }
        },
    });

    game.settings.register("pf2e", "minimumRulesUI", {
        name: "PF2E.SETTINGS.MinimumRulesUI.Name",
        hint: "PF2E.SETTINGS.MinimumRulesUI.Hint",
        scope: "world",
        config: true,
        default: CONST.USER_ROLES.ASSISTANT,
        type: Number,
        choices: {
            1: "USER.RolePlayer",
            2: "USER.RoleTrusted",
            3: "USER.RoleAssistant",
            4: "USER.RoleGamemaster",
        },
        onChange: () => {
            const itemSheets = Object.values(ui.windows).filter(
                (w): w is ItemSheetPF2e<ItemPF2e> => w instanceof ItemSheetPF2e,
            );
            for (const sheet of itemSheets) {
                sheet.render();
            }
        },
    });

    const distanceDisplays = ["always", "encounters", "never"] as const;
    game.settings.register("pf2e", "distanceDisplay", {
        name: "PF2E.SETTINGS.DistanceDisplay.Name",
        hint: "PF2E.SETTINGS.DistanceDisplay.Hint",
        scope: "client",
        config: true,
        type: new fields.StringField({
            required: true,
            nullable: false,
            choices: R.mapToObj(distanceDisplays, (v) => [v, `PF2E.SETTINGS.DistanceDisplay.${v}`]),
            initial: "always",
        }),
        onChange: (value) => {
            if (tupleHasValue(distanceDisplays, value)) game.pf2e.settings.distanceDisplay = value;
        },
    });

    game.settings.register("pf2e", "compendiumBrowserPacks", {
        name: "PF2E.SETTINGS.CompendiumBrowserPacks.Name",
        hint: "PF2E.SETTINGS.CompendiumBrowserPacks.Hint",
        default: {},
        type: Object,
        scope: "world",
        onChange: () => {
            game.pf2e.compendiumBrowser.initCompendiumList();
        },
    });

    game.settings.register("pf2e", "compendiumBrowserSources", {
        name: "PF2E.SETTINGS.compendiumBrowserSources.Name",
        hint: "PF2E.SETTINGS.compendiumBrowserSources.Hint",
        default: {
            ignoreAsGM: true,
            showEmptySources: true,
            showUnknownSources: true,
            sources: {},
        },
        type: Object,
        scope: "world",
        onChange: () => {
            game.pf2e.compendiumBrowser.packLoader.reset();
            game.pf2e.compendiumBrowser.initCompendiumList();
        },
    });

    game.settings.register("pf2e", "critFumbleButtons", {
        name: game.i18n.localize("PF2E.SETTINGS.critFumbleCardButtons.name"),
        hint: game.i18n.localize("PF2E.SETTINGS.critFumbleCardButtons.hint"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        requiresReload: true,
    });

    game.settings.register("pf2e", "drawCritFumble", {
        name: game.i18n.localize("PF2E.SETTINGS.critFumbleCards.name"),
        hint: game.i18n.localize("PF2E.SETTINGS.critFumbleCards.hint"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: (value) => {
            game.pf2e.settings.critFumble.cards = !!value;
        },
    });

    const iconChoices = {
        blackWhite: "PF2E.SETTINGS.statusEffectType.blackWhite",
        default: "PF2E.SETTINGS.statusEffectType.default",
    };
    game.settings.register("pf2e", "statusEffectType", {
        name: "PF2E.SETTINGS.statusEffectType.name",
        hint: "PF2E.SETTINGS.statusEffectType.hint",
        scope: "world",
        config: true,
        default: "default",
        type: String,
        choices: iconChoices,
        onChange: (iconType) => {
            StatusEffects.migrateStatusEffectUrls(iconType);
        },
    });

    game.settings.register("pf2e", "totmToggles", {
        name: "PF2E.SETTINGS.TOTMToggles.Name",
        hint: "PF2E.SETTINGS.TOTMToggles.Hint",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: (value) => {
            game.pf2e.settings.totm = !!value;
            resetActors();
        },
    });

    game.settings.register("pf2e", "deathIcon", {
        name: "PF2E.SETTINGS.DeathIcon.Name",
        hint: "PF2E.SETTINGS.DeathIcon.Hint",
        scope: "world",
        config: false,
        default: "icons/svg/skull.svg",
        type: String,
        onChange: (choice) => {
            if (isImageOrVideoPath(choice)) {
                StatusEffects.reset();
            } else if (!choice) {
                game.settings.set("pf2e", "deathIcon", "icons/svg/skull.svg");
            }
        },
    });

    // Don't tell Nath
    game.settings.register("pf2e", "nathMode", {
        name: "PF2E.SETTINGS.NathMode.Name",
        hint: "PF2E.SETTINGS.NathMode.Hint",
        scope: "world",
        config: BUILD_MODE === "development",
        default: false,
        type: Boolean,
    });

    game.settings.register("pf2e", "statusEffectShowCombatMessage", {
        name: "PF2E.SETTINGS.statusEffectShowCombatMessage.name",
        hint: "PF2E.SETTINGS.statusEffectShowCombatMessage.hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.registerMenu("pf2e", "automation", {
        name: "PF2E.SETTINGS.Automation.Name",
        label: "PF2E.SETTINGS.Automation.Label",
        hint: "PF2E.SETTINGS.Automation.Hint",
        icon: "fa-solid fa-robot",
        type: AutomationSettings,
        restricted: true,
    });
    game.settings.register("pf2e", "automation.actorsDeadAtZero", {
        name: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Name",
        hint: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Hint",
        scope: "world",
        config: false,
        choices: {
            neither: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Neither",
            npcsOnly: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.NPCsOnly",
            both: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Both",
        },
        default: "both",
        type: String,
    });
    AutomationSettings.registerSettings();

    game.settings.registerMenu("pf2e", "metagame", {
        name: "PF2E.SETTINGS.Metagame.Name",
        label: "PF2E.SETTINGS.Metagame.Label",
        hint: "PF2E.SETTINGS.Metagame.Hint",
        icon: "fa-solid fa-brain",
        type: MetagameSettings,
        restricted: true,
    });
    MetagameSettings.registerSettings();

    game.settings.registerMenu("pf2e", "homebrew", {
        name: "PF2E.SETTINGS.Homebrew.Name",
        label: "PF2E.SETTINGS.Homebrew.Label",
        hint: "PF2E.SETTINGS.Homebrew.Hint",
        icon: "fa-solid fa-beer-mug-empty",
        type: HomebrewElements,
        restricted: true,
    });
    HomebrewElements.registerSettings();

    VariantRulesSettings.register();
    WorldClockSettings.register();

    // Secret for now until the user side is complete and a UI is built
    game.settings.register("pf2e", "campaignFeatSections", {
        name: "Campaign Feat Sections",
        scope: "world",
        config: false,
        default: [],
        type: Array,
        onChange: (value) => {
            game.pf2e.settings.campaign.feats.sections = Array.isArray(value)
                ? value
                : game.pf2e.settings.campaign.feats.sections;
            resetActors(game.actors.filter((a) => a.isOfType("character")));
        },
    });

    // Increase brightness of darkness color for GMs
    game.settings.register("pf2e", "gmVision", {
        name: "PF2E.SETTINGS.GMVision",
        scope: "client",
        config: false,
        default: false,
        type: Boolean,
        onChange: (value) => {
            game.pf2e.settings.gmVision = !!value;
            const color = value ? CONFIG.PF2E.Canvas.darkness.gmVision : CONFIG.PF2E.Canvas.darkness.default;
            CONFIG.Canvas.darknessColor = color;
            if (canvas.activeLayer) ui.controls.render({ reset: true });
            canvas.environment.initialize();
            for (const token of canvas.tokens.placeables) {
                token.initializeVisionSource();
            }
            canvas.perception.update({
                refreshLighting: true,
                refreshVision: true,
                refreshSounds: true,
                refreshOcclusion: true,
            });
        },
    });

    game.settings.register("pf2e", "seenLastStopMessage", {
        name: "Seen Last Stop Before Remaster Message",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
    });

    registerTrackingSettings();

    if (BUILD_MODE === "production") {
        registerWorldSchemaVersion();
    }
}

/** Registers temporary settings for tracking things like first time launches or active party */
function registerTrackingSettings(): void {
    // Whether the world's first party actor has been created
    game.settings.register("pf2e", "createdFirstParty", {
        name: "Created First Party", // Doesn't appear in any UI
        scope: "world",
        config: false,
        default: false,
        type: Boolean,
    });

    game.settings.register("pf2e", "activeParty", {
        name: "Active Party",
        scope: "world",
        config: false,
        type: String,
        default: "",
        onChange: () => {
            ui.actors.render({ parts: ["parties"] });
        },
    });

    // Tracks the last party folder state for next launch. Defaults to true so that "No Members" shows on initial creation.
    game.settings.register("pf2e", "activePartyFolderState", {
        name: "Active Party Opened or closed",
        scope: "client",
        config: false,
        type: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    });

    game.settings.register("pf2e", "worldSystemVersion", {
        name: "World System Version",
        scope: "world",
        config: false,
        default: game.system.version,
        type: String,
    });

    // Show the GM information about the remaster
    game.settings.register("pf2e", "seenRemasterJournalEntry", {
        name: "Seen Remaster journal entry?",
        scope: "world",
        config: false,
        default: false,
        type: Boolean,
    });
}

function registerWorldSchemaVersion(): void {
    game.settings.register("pf2e", "worldSchemaVersion", {
        name: "PF2E.SETTINGS.WorldSchemaVersion.Name",
        hint: "PF2E.SETTINGS.WorldSchemaVersion.Hint",
        scope: "world",
        config: true,
        default: MigrationRunner.LATEST_SCHEMA_VERSION,
        type: Number,
        requiresReload: true,
    });
}
