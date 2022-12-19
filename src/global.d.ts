import { ActorPF2e } from "@actor/base";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression";
import { FeatCategoryOptions } from "@actor/character/feats";
import { CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@actor/modifiers";
import { ItemPF2e } from "@item/base";
import { CoinsPF2e } from "@item/physical/helpers";
import { ActiveEffectPF2e } from "@module/active-effect";
import { CompendiumBrowser, CompendiumBrowserSettings } from "@module/apps/compendium-browser";
import { EffectsPanel } from "@module/apps/effects-panel";
import { HotbarPF2e } from "@module/apps/hotbar";
import { LicenseViewer } from "@module/apps/license-viewer";
import { ActorDirectoryPF2e, ChatLogPF2e, CompendiumDirectoryPF2e, EncounterTrackerPF2e } from "@module/apps/sidebar";
import { WorldClock } from "@module/apps/world-clock";
import { CanvasPF2e, EffectsCanvasGroupPF2e } from "@module/canvas";
import { StatusEffects } from "@module/canvas/status-effects";
import { ChatMessagePF2e } from "@module/chat-message";
import { ActorsPF2e } from "@module/collection/actors";
import { MacroPF2e } from "@module/macro";
import { RuleElementPF2e, RuleElements } from "@module/rules";
import {
    AmbientLightDocumentPF2e,
    MeasuredTemplateDocumentPF2e,
    ScenePF2e,
    TileDocumentPF2e,
    TokenDocumentPF2e,
} from "@module/scene";
import { UserPF2e } from "@module/user";
import { PF2ECONFIG, StatusEffectIconTheme } from "@scripts/config";
import { DicePF2e } from "@scripts/dice";
import {
    calculateXP,
    launchTravelSheet,
    perceptionForSelected,
    rollActionMacro,
    rollItemMacro,
    stealthForSelected,
} from "@scripts/macros";
import { ModuleArt, registerModuleArt } from "@scripts/register-module-art";
import { remigrate } from "@scripts/system/remigrate";
import { CheckPF2e } from "@system/check";
import { EffectTracker } from "@system/effect-tracker";
import { HomebrewSettingsKey, HomebrewTag } from "@system/settings/homebrew";
import { TextEditorPF2e } from "@system/text-editor";
import { sluggify } from "@util";
import { CombatantPF2e, EncounterPF2e } from "./module/encounter";
import { ConditionManager } from "./module/system/conditions";

declare global {
    interface Game {
        pf2e: {
            actions: Record<string, Function>;
            compendiumBrowser: CompendiumBrowser;
            licenseViewer: LicenseViewer;
            worldClock: WorldClock;
            effectPanel: EffectsPanel;
            effectTracker: EffectTracker;
            rollActionMacro: typeof rollActionMacro;
            rollItemMacro: typeof rollItemMacro;
            gm: {
                calculateXP: typeof calculateXP;
                launchTravelSheet: typeof launchTravelSheet;
                perceptionForSelected: typeof perceptionForSelected;
                stealthForSelected: typeof stealthForSelected;
            };
            system: {
                moduleArt: {
                    map: Map<ActorUUID, ModuleArt>;
                    refresh: typeof registerModuleArt;
                };
                remigrate: typeof remigrate;
                sluggify: typeof sluggify;
            };
            variantRules: {
                AutomaticBonusProgression: typeof AutomaticBonusProgression;
            };
            Coins: typeof CoinsPF2e;
            Dice: typeof DicePF2e;
            StatusEffects: typeof StatusEffects;
            ConditionManager: typeof ConditionManager;
            ModifierType: typeof MODIFIER_TYPE;
            Modifier: typeof ModifierPF2e;
            StatisticModifier: typeof StatisticModifier;
            CheckModifier: typeof CheckModifier;
            Check: typeof CheckPF2e;
            RuleElements: typeof RuleElements;
            RuleElement: typeof RuleElementPF2e;
            TextEditor: typeof TextEditorPF2e;
        };
    }

    interface ConfigPF2e extends ConfiguredConfig {
        debug: ConfiguredConfig["debug"] & {
            ruleElement: boolean;
        };
        PF2E: typeof PF2ECONFIG;
        time: {
            roundTime: number;
        };
    }

    const CONFIG: ConfigPF2e;
    const canvas: CanvasPF2e;

    namespace globalThis {
        // eslint-disable-next-line no-var
        var game: Game<ActorPF2e, ActorsPF2e, ChatMessagePF2e, EncounterPF2e, ItemPF2e, MacroPF2e, ScenePF2e, UserPF2e>;

        // eslint-disable-next-line no-var
        var ui: FoundryUI<ActorPF2e, ActorDirectoryPF2e<ActorPF2e>, ItemPF2e, ChatLogPF2e, CompendiumDirectoryPF2e>;
    }

    interface Window {
        AutomaticBonusProgression: typeof AutomaticBonusProgression;
    }

    interface ClientSettings {
        get(module: "pf2e", setting: "automation.actorsDeadAtZero"): "neither" | "npcsOnly" | "pcsOnly" | "both";
        get(module: "pf2e", setting: "automation.effectExpiration"): boolean;
        get(module: "pf2e", setting: "automation.flankingDetection"): boolean;
        get(module: "pf2e", setting: "automation.lootableNPCs"): boolean;
        get(module: "pf2e", setting: "automation.removeExpiredEffects"): boolean;
        get(module: "pf2e", setting: "automation.rulesBasedVision"): boolean;

        get(module: "pf2e", setting: "gradualBoostsVariant"): boolean;
        get(module: "pf2e", setting: "ancestryParagonVariant"): boolean;
        get(module: "pf2e", setting: "automaticBonusVariant"): "noABP" | "ABPFundamentalPotency" | "ABPRulesAsWritten";
        get(module: "pf2e", setting: "dualClassVariant"): boolean;
        get(module: "pf2e", setting: "freeArchetypeVariant"): boolean;
        get(module: "pf2e", setting: "proficiencyVariant"): "ProficiencyWithLevel" | "ProficiencyWithoutLevel";
        get(module: "pf2e", setting: "staminaVariant"): 0 | 1;

        get(module: "pf2e", setting: "proficiencyUntrainedModifier"): number;
        get(module: "pf2e", setting: "proficiencyTrainedModifier"): number;
        get(module: "pf2e", setting: "proficiencyExpertModifier"): number;
        get(module: "pf2e", setting: "proficiencyMasterModifier"): number;
        get(module: "pf2e", setting: "proficiencyLegendaryModifier"): number;

        get(module: "pf2e", setting: "metagame_partyVision"): boolean;
        get(module: "pf2e", setting: "metagame_secretCondition"): boolean;
        get(module: "pf2e", setting: "metagame_secretDamage"): boolean;
        get(module: "pf2e", setting: "metagame_showDC"): boolean;
        get(module: "pf2e", setting: "metagame_showResults"): boolean;
        get(module: "pf2e", setting: "metagame_tokenSetsNameVisibility"): boolean;

        get(module: "pf2e", setting: "tokens.autoscale"): boolean;

        get(module: "pf2e", setting: "worldClock.dateTheme"): "AR" | "IC" | "AD" | "CE";
        get(module: "pf2e", setting: "worldClock.playersCanView"): boolean;
        get(module: "pf2e", setting: "worldClock.showClockButton"): boolean;
        get(module: "pf2e", setting: "worldClock.syncDarkness"): boolean;
        get(module: "pf2e", setting: "worldClock.timeConvention"): 24 | 12;
        get(module: "pf2e", setting: "worldClock.worldCreatedOn"): string;

        get(module: "pf2e", setting: "campaignFeats"): boolean;
        get(module: "pf2e", setting: "campaignFeatSections"): FeatCategoryOptions[];

        get(module: "pf2e", setting: "homebrew.weaponCategories"): HomebrewTag<"weaponCategories">[];
        get(module: "pf2e", setting: HomebrewSettingsKey): HomebrewTag[];

        get(module: "pf2e", setting: "compendiumBrowserPacks"): CompendiumBrowserSettings;
        get(module: "pf2e", setting: "critFumbleButtons"): boolean;
        get(module: "pf2e", setting: "deathIcon"): ImagePath;
        get(module: "pf2e", setting: "drawCritFumble"): boolean;
        get(module: "pf2e", setting: "enabledRulesUI"): boolean;
        get(module: "pf2e", setting: "gmVision"): boolean;
        get(module: "pf2e", setting: "identifyMagicNotMatchingTraditionModifier"): 0 | 2 | 5 | 10;
        get(module: "pf2e", setting: "nathMode"): boolean;
        get(module: "pf2e", setting: "statusEffectType"): StatusEffectIconTheme;
        get(module: "pf2e", setting: "totmToggles"): boolean;
        get(module: "pf2e", setting: "worldSchemaVersion"): number;
        get(module: "pf2e", setting: "worldSystemVersion"): string;
    }

    interface ClientSettingsMap {
        get(key: "pf2e.worldClock.worldCreatedOn"): SettingConfig & { default: string };
    }

    interface RollMathProxy {
        eq: (a: number, b: number) => boolean;
        gt: (a: number, b: number) => boolean;
        gte: (a: number, b: number) => boolean;
        lt: (a: number, b: number) => boolean;
        lte: (a: number, b: number) => boolean;
        ne: (a: number, b: number) => boolean;
        ternary: (condition: boolean | number, ifTrue: number, ifFalse: number) => number;
    }

    const BUILD_MODE: "development" | "production";
    const ROLL_GRAMMAR: string;
}

type ConfiguredConfig = Config<
    AmbientLightDocumentPF2e,
    ActiveEffectPF2e,
    ActorPF2e,
    ActorDirectoryPF2e<ActorPF2e>,
    ChatLogPF2e,
    ChatMessagePF2e,
    EncounterPF2e,
    CombatantPF2e,
    EncounterTrackerPF2e<EncounterPF2e | null>,
    CompendiumDirectoryPF2e,
    HotbarPF2e,
    ItemPF2e,
    MacroPF2e,
    MeasuredTemplateDocumentPF2e,
    TileDocumentPF2e,
    TokenDocumentPF2e,
    ScenePF2e,
    UserPF2e,
    EffectsCanvasGroupPF2e
>;
