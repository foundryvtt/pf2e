import { resetActors } from "@actor/helpers";
import { ActorSheetPF2e } from "@actor/sheet/base";
import { ItemPF2e, ItemSheetPF2e } from "@item";
import { StatusEffects } from "@module/canvas/status-effects";
import { MigrationRunner } from "@module/migration/runner";
import { isImageOrVideoPath } from "@util";
import { AutomationSettings } from "./automation";
import { HomebrewElements } from "./homebrew";
import { MetagameSettings } from "./metagame";
import { VariantRulesSettings } from "./variant-rules";
import { WorldClockSettings } from "./world-clock";

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

    game.settings.register("pf2e", "enabledRulesUI", {
        name: "PF2E.SETTINGS.EnabledRulesUI.Name",
        hint: "PF2E.SETTINGS.EnabledRulesUI.Hint",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: () => {
            const itemSheets = Object.values(ui.windows).filter(
                (w): w is ItemSheetPF2e<ItemPF2e> => w instanceof ItemSheetPF2e
            );
            for (const sheet of itemSheets) {
                sheet.render();
            }
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
        requiresReload: true,
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
        onChange: () => {
            resetActors();
        },
    });

    game.settings.register("pf2e", "deathIcon", {
        name: "PF2E.Settings.DeathIcon.Name",
        hint: "PF2E.Settings.DeathIcon.Hint",
        scope: "world",
        config: false,
        default: "icons/svg/skull.svg",
        type: String,
        onChange: (choice?: string) => {
            if (isImageOrVideoPath(choice)) CONFIG.controlIcons.defeated = choice;
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

    game.settings.register("pf2e", "worldSystemVersion", {
        name: "World System Version",
        scope: "world",
        config: false,
        default: game.system.version,
        type: String,
    });

    game.settings.registerMenu("pf2e", "automation", {
        name: "PF2E.SETTINGS.Automation.Name",
        label: "PF2E.SETTINGS.Automation.Label",
        hint: "PF2E.SETTINGS.Automation.Hint",
        icon: "fas fa-robot",
        type: AutomationSettings,
        restricted: true,
    });
    game.settings.register("pf2e", "automation.actorsDeadAtZero", {
        name: CONFIG.PF2E.SETTINGS.automation.actorsDeadAtZero.name,
        scope: "world",
        config: false,
        default: "npcsOnly",
        type: String,
    });
    AutomationSettings.registerSettings();

    game.settings.registerMenu("pf2e", "metagame", {
        name: "PF2E.SETTINGS.Metagame.Name",
        label: "PF2E.SETTINGS.Metagame.Label",
        hint: "PF2E.SETTINGS.Metagame.Hint",
        icon: "fas fa-brain",
        type: MetagameSettings,
        restricted: true,
    });
    MetagameSettings.registerSettings();

    game.settings.registerMenu("pf2e", "variantRules", {
        name: "PF2E.SETTINGS.Variant.Name",
        label: "PF2E.SETTINGS.Variant.Label",
        hint: "PF2E.SETTINGS.Variant.Hint",
        icon: "fas fa-book",
        type: VariantRulesSettings,
        restricted: true,
    });
    VariantRulesSettings.registerSettings();

    game.settings.registerMenu("pf2e", "homebrew", {
        name: "PF2E.SETTINGS.Homebrew.Name",
        label: "PF2E.SETTINGS.Homebrew.Label",
        hint: "PF2E.SETTINGS.Homebrew.Hint",
        icon: "fas fa-beer",
        type: HomebrewElements,
        restricted: true,
    });
    HomebrewElements.registerSettings();

    game.settings.registerMenu("pf2e", "worldClock", {
        name: game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.name),
        label: game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.label),
        hint: game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.hint),
        icon: "far fa-clock",
        type: WorldClockSettings,
        restricted: true,
    });
    WorldClockSettings.registerSettings();

    game.settings.register("pf2e", "campaignFeats", {
        name: CONFIG.PF2E.SETTINGS.CampaignFeats.name,
        hint: CONFIG.PF2E.SETTINGS.CampaignFeats.hint,
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });

    // Secret for now until the user side is complete and a UI is built
    game.settings.register("pf2e", "campaignFeatSections", {
        name: "Campaign Feat Sections",
        scope: "world",
        config: false,
        default: [],
        type: Array,
    });

    // This only exists to not break existing macros (yet). We'll keep it for a few versions
    game.settings.register("pf2e", "RAI.TreatWoundsAltSkills", {
        name: "Treat Wounds Macro Compat",
        scope: "world",
        config: false,
        default: true,
        type: Boolean,
    });

    // Increase brightness of darkness color for GMs
    game.settings.register("pf2e", "gmVision", {
        name: "PF2E.SETTINGS.GMVision",
        scope: "client",
        config: false,
        default: false,
        type: Boolean,
        onChange: (value) => {
            const color = value ? CONFIG.PF2E.Canvas.darkness.gmVision : CONFIG.PF2E.Canvas.darkness.default;
            CONFIG.Canvas.darknessColor = color;
            canvas.colorManager.initialize();
        },
    });

    if (BUILD_MODE === "production") {
        registerWorldSchemaVersion();
    }
}

function registerWorldSchemaVersion(): void {
    game.settings.register("pf2e", "worldSchemaVersion", {
        name: "PF2E.SETTINGS.WorldSchemaVersion.Name",
        hint: "PF2E.SETTINGS.WorldSchemaVersion.Hint",
        scope: "world",
        config: true,
        default: MigrationRunner.LATEST_SCHEMA_VERSION,
        type: Number,
    });
}
