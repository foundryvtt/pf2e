/// <reference types="vite/client" />

import type { ActorPF2e } from "@actor";
import type { Action } from "@actor/actions/index.ts";
import type { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import type { ElementalBlast } from "@actor/character/elemental-blast.ts";
import type { FeatGroupData } from "@actor/character/feats/index.ts";
import type { CheckModifier, Modifier, ModifierType, StatisticModifier } from "@actor/modifiers.ts";
import type { SettingConfig } from "@client/_types.d.mts";
import type Hotbar from "@client/applications/ui/hotbar.d.mts";
import type Config from "@client/config.d.mts";
import type WallDocument from "@client/documents/wall.d.mts";
import type { FoundryUI } from "@client/ui.d.mts";
import type { CompendiumUUID } from "@client/utils/_module.d.mts";
import type { ImageFilePath, RollMode, UserRole } from "@common/constants.d.mts";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import type { ConditionSource } from "@item/condition/data.ts";
import type { Coins } from "@item/physical/helpers.ts";
import type { ActiveEffectPF2e } from "@module/active-effect.ts";
import type {
    CompendiumBrowser,
    CompendiumBrowserSettings,
    CompendiumBrowserSources,
} from "@module/apps/compendium-browser/browser.ts";
import type { EffectsPanel } from "@module/apps/effects-panel.ts";
import type {
    ActorDirectoryPF2e,
    ChatLogPF2e,
    CompendiumDirectoryPF2e,
    EncounterTracker,
    ItemDirectoryPF2e,
} from "@module/apps/sidebar/index.ts";
import type { WorldClock } from "@module/apps/world-clock/app.ts";
import type { CanvasPF2e, EffectsCanvasGroupPF2e } from "@module/canvas/index.ts";
import type { StatusEffects } from "@module/canvas/status-effects.ts";
import type { ChatMessagePF2e } from "@module/chat-message/index.ts";
import type { ActorsPF2e } from "@module/collection/actors.ts";
import type { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import type { MacroPF2e } from "@module/macro.ts";
import type { RuleElement, RuleElements } from "@module/rules/index.ts";
import type { UserPF2e } from "@module/user/index.ts";
import type {
    AmbientLightDocumentPF2e,
    MeasuredTemplateDocumentPF2e,
    RegionBehaviorPF2e,
    RegionDocumentPF2e,
    ScenePF2e,
    TileDocumentPF2e,
    TokenDocumentPF2e,
} from "@scene";
import type { PF2ECONFIG, StatusEffectIconTheme } from "@scripts/config/index.ts";
import type { DicePF2e } from "@scripts/dice.ts";
import type {
    calculateXP,
    checkPrompt,
    editPersistent,
    launchTravelSheet,
    perceptionForSelected,
    rollActionMacro,
    rollItemMacro,
    stealthForSelected,
    xpFromEncounter,
} from "@scripts/macros/index.ts";
import type { remigrate } from "@scripts/system/remigrate.ts";
import type { Check } from "@system/check/index.ts";
import type { ConditionManager } from "@system/conditions/manager.ts";
import type { EffectTracker } from "@system/effect-tracker.ts";
import type { ModuleArt } from "@system/module-art.ts";
import type { Predicate } from "@system/predication.ts";
import type {
    CustomDamageData,
    HomebrewTag,
    HomebrewTraitSettingsKey,
    LanguageSettings,
} from "@system/settings/homebrew/index.ts";
import type { WorldClockSettingData } from "@system/settings/world-clock.ts";
import type { TextEditorPF2e } from "@system/text-editor.ts";
import type { sluggify } from "@util";
import type EnJSON from "../static/lang/en.json";
import Game = foundry.Game;

interface ClientSettingsPF2e extends fh.ClientSettings {
    get(scope: string, setting: string, options: { document: true }): Setting;
    get(scope: "core", key: "compendiumConfiguration"): Record<string, { private: boolean; locked: boolean }>;
    get(scope: "core", key: "fontSize"): number;
    get(scope: "core", key: "noCanvas"): boolean;
    get(scope: "core", key: "rollMode"): RollMode;
    get(scope: "core", key: "uiConfig"): { colorScheme: { applications: string; interface: string }; uiScale: number };
    get(scope: SystemId, setting: "automation.actorsDeadAtZero"): "neither" | "npcsOnly" | "pcsOnly" | "both";
    get(scope: SystemId, setting: "automation.encumbrance"): boolean;
    get(scope: SystemId, setting: "automation.flankingDetection"): boolean;
    get(scope: SystemId, setting: "automation.iwr"): boolean;
    get(scope: SystemId, setting: "automation.lootableNPCs"): boolean;
    get(scope: SystemId, setting: "automation.reachEnforcement"): Set<"doors" | "corpses" | "loot" | "merchants">;
    get(scope: SystemId, setting: "automation.removeExpiredEffects"): boolean;
    get(scope: SystemId, setting: "automation.rulesBasedVision"): boolean;

    get(scope: SystemId, setting: "gradualBoostsVariant"): boolean;
    get(scope: SystemId, setting: "automaticBonusVariant"): "noABP" | "ABPFundamentalPotency" | "ABPRulesAsWritten";
    get(scope: SystemId, setting: "freeArchetypeVariant"): boolean;
    get(scope: SystemId, setting: "proficiencyVariant"): boolean;
    get(scope: SystemId, setting: "staminaVariant"): boolean;

    get(scope: SystemId, setting: "proficiencyUntrainedModifier"): number;
    get(scope: SystemId, setting: "proficiencyTrainedModifier"): number;
    get(scope: SystemId, setting: "proficiencyExpertModifier"): number;
    get(scope: SystemId, setting: "proficiencyMasterModifier"): number;
    get(scope: SystemId, setting: "proficiencyLegendaryModifier"): number;

    get(scope: SystemId, setting: "metagame_partyVision"): boolean;
    get(scope: SystemId, setting: "metagame_secretCondition"): boolean;
    get(scope: SystemId, setting: "metagame_secretDamage"): boolean;
    get(scope: SystemId, setting: "metagame_showBreakdowns"): boolean;
    get(scope: SystemId, setting: "metagame_showDC"): boolean;
    get(scope: SystemId, setting: "metagame_showPartyStats"): boolean;
    get(scope: SystemId, setting: "metagame_showResults"): boolean;
    get(scope: SystemId, setting: "metagame_tokenSetsNameVisibility"): boolean;
    get(scope: SystemId, setting: "metagame_secretChecks"): boolean;

    get(scope: SystemId, setting: "tokens.autoscale"): boolean;

    get(scope: SystemId, setting: "worldClock"): WorldClockSettingData;

    get(scope: SystemId, setting: "campaignFeats"): boolean;
    get(scope: SystemId, setting: "campaignFeatSections"): FeatGroupData[];
    get(scope: SystemId, setting: "campaignType"): string;
    get(scope: SystemId, setting: "mythic"): "disabled" | "enabled" | "variant-tiers";

    get(scope: SystemId, setting: "activeParty"): string;
    get(scope: SystemId, setting: "activePartyFolderState"): boolean;
    get(scope: SystemId, setting: "createdFirstParty"): boolean;

    get(scope: SystemId, setting: "homebrew.languages"): HomebrewTag<"languages">[];
    get(scope: SystemId, setting: "homebrew.weaponCategories"): HomebrewTag<"weaponCategories">[];
    get(scope: SystemId, setting: HomebrewTraitSettingsKey): HomebrewTag[];
    get(scope: SystemId, setting: "homebrew.damageTypes"): CustomDamageData[];
    get(scope: SystemId, setting: "homebrew.languageRarities"): LanguageSettings;

    get(scope: SystemId, setting: "compendiumBrowserPacks"): CompendiumBrowserSettings;
    get(scope: SystemId, setting: "compendiumBrowserSources"): CompendiumBrowserSources;
    get(scope: SystemId, setting: "critFumbleButtons"): boolean;
    get(scope: SystemId, setting: "critRule"): "doubledamage" | "doubledice";
    get(scope: SystemId, setting: "deathIcon"): ImageFilePath;
    get(scope: SystemId, setting: "distanceDisplay"): "always" | "encounters" | "never";
    get(scope: SystemId, setting: "drawCritFumble"): boolean;
    get(scope: SystemId, setting: "gmVision"): boolean;
    get(scope: SystemId, setting: "identifyMagicNotMatchingTraditionModifier"): 0 | 2 | 5 | 10;
    get(scope: SystemId, setting: "minimumRulesUI"): Exclude<UserRole, 0>;
    get(scope: SystemId, setting: "nathMode"): boolean;
    get(scope: SystemId, setting: "statusEffectType"): StatusEffectIconTheme;
    get(scope: SystemId, setting: "totmToggles"): boolean;
    get(scope: SystemId, setting: "worldSchemaVersion"): number;
    get(scope: SystemId, setting: "worldSystemVersion"): string;
    get(scope: SystemId, setting: "earnIncome"): { level: number; days: number; skill: string };

    get(scope: string, key: string, options?: { document?: boolean }): unknown;
}

interface GamePF2e
    extends Game<
        ActorPF2e<null>,
        ActorsPF2e<ActorPF2e<null>>,
        ChatMessagePF2e,
        EncounterPF2e,
        ItemPF2e<null>,
        MacroPF2e,
        ScenePF2e,
        UserPF2e
    > {
    pf2e: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        actions: Record<string, Function> & Collection<string, Action>;
        compendiumBrowser: CompendiumBrowser;
        worldClock: WorldClock;
        effectPanel: EffectsPanel;
        effectTracker: EffectTracker;
        rollActionMacro: typeof rollActionMacro;
        rollItemMacro: typeof rollItemMacro;
        gm: {
            calculateXP: typeof calculateXP;
            checkPrompt: typeof checkPrompt;
            editPersistent: typeof editPersistent;
            launchTravelSheet: typeof launchTravelSheet;
            perceptionForSelected: typeof perceptionForSelected;
            stealthForSelected: typeof stealthForSelected;
            xpFromEncounter: typeof xpFromEncounter;
        };
        system: {
            moduleArt: ModuleArt;
            remigrate: typeof remigrate;
            sluggify: typeof sluggify;
            generateItemName: (item: PhysicalItemPF2e) => string;
        };
        variantRules: {
            AutomaticBonusProgression: typeof AutomaticBonusProgression;
        };
        Check: typeof Check;
        CheckModifier: typeof CheckModifier;
        Coins: typeof Coins;
        ConditionManager: typeof ConditionManager;
        Dice: typeof DicePF2e;
        ElementalBlast: typeof ElementalBlast;
        Modifier: typeof Modifier;
        ModifierType: { [K in Uppercase<ModifierType>]: Lowercase<K> };
        Predicate: typeof Predicate;
        RuleElement: typeof RuleElement;
        RuleElements: typeof RuleElements;
        StatisticModifier: typeof StatisticModifier;
        StatusEffects: typeof StatusEffects;
        TextEditor: typeof TextEditorPF2e;
        /** Cached values of frequently-checked settings */
        settings: {
            automation: {
                /** Flanking detection */
                flanking: boolean;
                reachEnforcement: Set<"doors" | "corpses" | "loot" | "merchants">;
                removeEffects: boolean;
            };
            /** Campaign feat slots */
            campaign: {
                feats: {
                    enabled: boolean;
                    sections: FeatGroupData[];
                };
                languages: LanguageSettings;
                mythic: "disabled" | "enabled" | "variant-tiers";
                type: string | null;
            };
            critFumble: {
                buttons: boolean;
                cards: boolean;
            };
            distanceDisplay: "always" | "encounters" | "never";
            /** Encumbrance automation */
            encumbrance: boolean;
            gmVision: boolean;
            /** Immunities, weaknesses, and resistances */
            iwr: boolean;
            metagame: {
                breakdowns: boolean;
                dcs: boolean;
                secretChecks: boolean;
                partyStats: boolean;
                partyVision: boolean;
                results: boolean;
            };
            /** Rules-based vision */
            rbv: boolean;
            tokens: {
                /** Automatic scaling of tokens belong to small actor */
                autoscale: boolean;
                /** Token nameplate visibility sets name visibility in encounter tracker */
                nameVisibility: boolean;
                /** Nath Mode */
                nathMode: boolean;
            };
            /** Theater-of-the-mind toggles */
            totm: boolean;
            /** Variant urles */
            variants: {
                /** Automatic Bonus Progression */
                abp: "noABP" | "ABPFundamentalPotency" | "ABPRulesAsWritten";
                /** Free Archetype */
                fa: boolean;
                /** Gradual Ability Boosts */
                gab: boolean;
                /** Proficiency without Level */
                pwol: {
                    enabled: boolean;
                    /** Modifiers for each proficiency rank */
                    modifiers: [number, number, number, number, number];
                };
                /** Stamina */
                stamina: boolean;
            };
            worldClock: WorldClockSettingData;
        };
    };
    settings: ClientSettingsPF2e;
}

type ConfiguredConfig = Config<
    AmbientLightDocumentPF2e<ScenePF2e | null>,
    ActiveEffectPF2e<ActorPF2e | ItemPF2e | null>,
    ActorPF2e,
    ActorDelta<TokenDocumentPF2e>,
    ChatLogPF2e,
    ChatMessagePF2e,
    EncounterPF2e,
    CombatantPF2e<EncounterPF2e | null, TokenDocumentPF2e>,
    EncounterTracker<EncounterPF2e | null>,
    CompendiumDirectoryPF2e,
    Hotbar<MacroPF2e>,
    ItemPF2e,
    MacroPF2e,
    MeasuredTemplateDocumentPF2e,
    RegionDocumentPF2e,
    RegionBehaviorPF2e,
    TileDocumentPF2e,
    TokenDocumentPF2e,
    WallDocument<ScenePF2e | null>,
    ScenePF2e,
    UserPF2e,
    EffectsCanvasGroupPF2e
>;

declare global {
    type SystemId = "pf2e" | "sf2e";
    const BUILD_MODE: "development" | "production";
    const CONDITION_SOURCES: ConditionSource[];
    const EN_JSON: typeof EnJSON;
    const ROLL_PARSER: string;
    const UUID_REDIRECTS: Record<CompendiumUUID, CompendiumUUID>;

    interface ConfigPF2e extends ConfiguredConfig {
        debug: ConfiguredConfig["debug"] & {
            ruleElement: boolean;
        };
        PF2E: typeof PF2ECONFIG;
        time: {
            roundTime: number;
            turnTime: number;
        };
    }

    const CONFIG: ConfigPF2e;
    const canvas: CanvasPF2e;

    namespace globalThis {
        const game: GamePF2e;
        const SYSTEM_ID: SystemId;
        export import fa = foundry.applications;
        export import fav1 = foundry.appv1;
        export import fc = foundry.canvas;
        export import fd = foundry.documents;
        export import fh = foundry.helpers;
        export import fu = foundry.utils;

        const ui: FoundryUI<
            ActorDirectoryPF2e,
            ItemDirectoryPF2e,
            ChatLogPF2e,
            CompendiumDirectoryPF2e,
            EncounterTracker<EncounterPF2e | null>,
            Hotbar<MacroPF2e>
        >;

        // eslint-disable-next-line no-var
        var AutomaticBonusProgression: typeof ABP;

        // Add functions to the `Math` namespace for use in `Roll` formulas
        interface Math {
            btwn: (v: number, lte: number, gte: number) => boolean;
            eq: (a: number, b: number) => boolean;
            gt: (a: number, b: number) => boolean;
            gte: (a: number, b: number) => boolean;
            lt: (a: number, b: number) => boolean;
            lte: (a: number, b: number) => boolean;
            ne: (a: number, b: number) => boolean;
            ternary: (condition: boolean | number, ifTrue: number, ifFalse: number) => number;
            match: (...args: (string | number | null)[]) => string | number;
            when: (condition: boolean, then: string | number) => string | number | null;
        }
    }

    namespace foundry {
        interface ClientSettingsMap {
            get(key: "pf2e.worldClock"): SettingConfig & { default: WorldClockSettingData };
        }
    }
}
