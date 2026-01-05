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

    game.settings.register(SYSTEM_ID, "tokens.autoscale", {
        name: "PF2E.SETTINGS.Tokens.Autoscale.Name",
        hint: "PF2E.SETTINGS.Tokens.Autoscale.Hint",
        scope: "world",
        config: true,
        type: new fields.BooleanField({ initial: true }),
        onChange: (value) => {
            game.pf2e.settings.tokens.autoscale = !!value;
        },
    });

    game.settings.register(SYSTEM_ID, "identifyMagicNotMatchingTraditionModifier", {
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

    game.settings.register(SYSTEM_ID, "critRule", {
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

    game.settings.register(SYSTEM_ID, "minimumRulesUI", {
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
    game.settings.register(SYSTEM_ID, "distanceDisplay", {
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

    game.settings.register(SYSTEM_ID, "compendiumBrowserPacks", {
        name: "PF2E.SETTINGS.CompendiumBrowserPacks.Name",
        hint: "PF2E.SETTINGS.CompendiumBrowserPacks.Hint",
        default: {},
        type: Object,
        scope: "world",
        onChange: () => {
            game.pf2e.compendiumBrowser.initCompendiumList();
        },
    });

    game.settings.register(SYSTEM_ID, "compendiumBrowserSources", {
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

    game.settings.register(SYSTEM_ID, "critFumbleButtons", {
        name: game.i18n.localize("PF2E.SETTINGS.critFumbleCardButtons.name"),
        hint: game.i18n.localize("PF2E.SETTINGS.critFumbleCardButtons.hint"),
        scope: "world",
        config: true,
        type: new fields.BooleanField(),
        requiresReload: true,
    });

    game.settings.register(SYSTEM_ID, "drawCritFumble", {
        name: game.i18n.localize("PF2E.SETTINGS.critFumbleCards.name"),
        hint: game.i18n.localize("PF2E.SETTINGS.critFumbleCards.hint"),
        scope: "world",
        config: true,
        type: new fields.BooleanField(),
        onChange: (value) => {
            game.pf2e.settings.critFumble.cards = !!value;
        },
    });

    const iconChoices = {
        blackWhite: "PF2E.SETTINGS.statusEffectType.blackWhite",
        default: "PF2E.SETTINGS.statusEffectType.default",
    };
    game.settings.register(SYSTEM_ID, "statusEffectType", {
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

    game.settings.register(SYSTEM_ID, "totmToggles", {
        name: "PF2E.SETTINGS.TOTMToggles.Name",
        hint: "PF2E.SETTINGS.TOTMToggles.Hint",
        scope: "world",
        config: true,
        type: new fields.BooleanField(),
        onChange: (value) => {
            game.pf2e.settings.totm = !!value;
            resetActors();
        },
    });

    game.settings.register(SYSTEM_ID, "deathIcon", {
        name: "PF2E.SETTINGS.DeathIcon.Name",
        hint: "PF2E.SETTINGS.DeathIcon.Hint",
        scope: "world",
        config: false,
        type: new fields.FilePathField({
            required: true,
            nullable: false,
            categories: ["IMAGE", "VIDEO"],
            initial: "icons/svg/skull.svg",
        }),
        onChange: (choice) => {
            if (isImageOrVideoPath(choice)) {
                StatusEffects.reset();
            } else if (!choice) {
                game.settings.set(SYSTEM_ID, "deathIcon", "icons/svg/skull.svg");
            }
        },
    });

    // Don't tell Nath
    game.settings.register(SYSTEM_ID, "nathMode", {
        name: "PF2E.SETTINGS.NathMode.Name",
        hint: "PF2E.SETTINGS.NathMode.Hint",
        scope: "world",
        config: BUILD_MODE === "development",
        type: new fields.BooleanField(),
    });

    game.settings.register(SYSTEM_ID, "statusEffectShowCombatMessage", {
        name: "PF2E.SETTINGS.statusEffectShowCombatMessage.name",
        hint: "PF2E.SETTINGS.statusEffectShowCombatMessage.hint",
        scope: "world",
        config: true,
        type: new fields.BooleanField({ initial: true }),
    });

    AutomationSettings.register();
    game.settings.register(SYSTEM_ID, "automation.actorsDeadAtZero", {
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

    MetagameSettings.register();
    HomebrewElements.register();
    VariantRulesSettings.register();
    WorldClockSettings.register();

    game.settings.register(SYSTEM_ID, "campaignFeatSections", {
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
    game.settings.register(SYSTEM_ID, "gmVision", {
        name: "PF2E.SETTINGS.GMVision",
        scope: "client",
        config: false,
        type: new fields.BooleanField(),
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

    game.settings.register(SYSTEM_ID, "earnIncome", {
        name: "",
        scope: "user",
        config: false,
        type: new fields.SchemaField({
            level: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                max: 20,
                initial: 0,
            }),
            days: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                positive: true,
                initial: 1,
            }),
            skill: new fields.StringField({ required: true, blank: false, initial: "society" }),
        }),
    });

    registerTrackingSettings();

    if (BUILD_MODE === "production") {
        registerWorldSchemaVersion();
    }
}

/** Registers temporary settings for tracking things like first time launches or active party */
function registerTrackingSettings(): void {
    // Whether the world's first party actor has been created
    game.settings.register(SYSTEM_ID, "createdFirstParty", {
        name: "Created First Party", // Doesn't appear in any UI
        scope: "world",
        config: false,
        default: false,
        type: new fields.BooleanField(),
    });

    game.settings.register(SYSTEM_ID, "activeParty", {
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
    game.settings.register(SYSTEM_ID, "activePartyFolderState", {
        name: "Active Party Opened or closed",
        scope: "client",
        config: false,
        type: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    });

    game.settings.register(SYSTEM_ID, "worldSystemVersion", {
        name: "World System Version",
        scope: "world",
        config: false,
        default: game.system.version,
        type: String,
    });
}

function registerWorldSchemaVersion(): void {
    game.settings.register(SYSTEM_ID, "worldSchemaVersion", {
        name: "PF2E.SETTINGS.WorldSchemaVersion.Name",
        hint: "PF2E.SETTINGS.WorldSchemaVersion.Hint",
        scope: "world",
        config: true,
        default: MigrationRunner.LATEST_SCHEMA_VERSION,
        type: Number,
        requiresReload: true,
    });
}
