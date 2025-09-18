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
    get(module: "core", key: "compendiumConfiguration"): Record<string, { private: boolean; locked: boolean }>;
    get(module: "core", key: "fontSize"): number;
    get(module: "core", key: "noCanvas"): boolean;
    get(module: "core", key: "rollMode"): RollMode;
    get(module: "core", key: "uiConfig"): { colorScheme: { applications: string; interface: string } };
    get(module: "pf2e", setting: "automation.actorsDeadAtZero"): "neither" | "npcsOnly" | "pcsOnly" | "both";
    get(module: "pf2e", setting: "automation.encumbrance"): boolean;
    get(module: "pf2e", setting: "automation.flankingDetection"): boolean;
    get(module: "pf2e", setting: "automation.iwr"): boolean;
    get(module: "pf2e", setting: "automation.lootableNPCs"): boolean;
    get(module: "pf2e", setting: "automation.reachEnforcement"): Set<"doors" | "corpses" | "loot" | "merchants">;
    get(module: "pf2e", setting: "automation.removeExpiredEffects"): boolean;
    get(module: "pf2e", setting: "automation.rulesBasedVision"): boolean;

    get(module: "pf2e", setting: "gradualBoostsVariant"): boolean;
    get(module: "pf2e", setting: "automaticBonusVariant"): "noABP" | "ABPFundamentalPotency" | "ABPRulesAsWritten";
    get(module: "pf2e", setting: "freeArchetypeVariant"): boolean;
    get(module: "pf2e", setting: "proficiencyVariant"): boolean;
    get(module: "pf2e", setting: "staminaVariant"): boolean;

    get(module: "pf2e", setting: "proficiencyUntrainedModifier"): number;
    get(module: "pf2e", setting: "proficiencyTrainedModifier"): number;
    get(module: "pf2e", setting: "proficiencyExpertModifier"): number;
    get(module: "pf2e", setting: "proficiencyMasterModifier"): number;
    get(module: "pf2e", setting: "proficiencyLegendaryModifier"): number;

    get(module: "pf2e", setting: "metagame_partyVision"): boolean;
    get(module: "pf2e", setting: "metagame_secretCondition"): boolean;
    get(module: "pf2e", setting: "metagame_secretDamage"): boolean;
    get(module: "pf2e", setting: "metagame_showBreakdowns"): boolean;
    get(module: "pf2e", setting: "metagame_showDC"): boolean;
    get(module: "pf2e", setting: "metagame_showPartyStats"): boolean;
    get(module: "pf2e", setting: "metagame_showResults"): boolean;
    get(module: "pf2e", setting: "metagame_tokenSetsNameVisibility"): boolean;
    get(module: "pf2e", setting: "metagame_secretChecks"): boolean;

    get(module: "pf2e", setting: "tokens.autoscale"): boolean;

    get(module: "pf2e", setting: "worldClock"): WorldClockSettingData;

    get(module: "pf2e", setting: "campaignFeats"): boolean;
    get(module: "pf2e", setting: "campaignFeatSections"): FeatGroupData[];
    get(module: "pf2e", setting: "campaignType"): string;
    get(module: "pf2e", setting: "mythic"): "disabled" | "enabled" | "variant-tiers";

    get(module: "pf2e", setting: "activeParty"): string;
    get(module: "pf2e", setting: "activePartyFolderState"): boolean;
    get(module: "pf2e", setting: "createdFirstParty"): boolean;

    get(module: "pf2e", setting: "homebrew.languages"): HomebrewTag<"languages">[];
    get(module: "pf2e", setting: "homebrew.weaponCategories"): HomebrewTag<"weaponCategories">[];
    get(module: "pf2e", setting: HomebrewTraitSettingsKey): HomebrewTag[];
    get(module: "pf2e", setting: "homebrew.damageTypes"): CustomDamageData[];
    get(module: "pf2e", setting: "homebrew.languageRarities"): LanguageSettings;

    get(module: "pf2e", setting: "compendiumBrowserPacks"): CompendiumBrowserSettings;
    get(module: "pf2e", setting: "compendiumBrowserSources"): CompendiumBrowserSources;
    get(module: "pf2e", setting: "critFumbleButtons"): boolean;
    get(module: "pf2e", setting: "critRule"): "doubledamage" | "doubledice";
    get(module: "pf2e", setting: "deathIcon"): ImageFilePath;
    get(module: "pf2e", setting: "dragMeasurement"): "always" | "encounters" | "never";
    get(module: "pf2e", setting: "drawCritFumble"): boolean;
    get(module: "pf2e", setting: "gmVision"): boolean;
    get(module: "pf2e", setting: "identifyMagicNotMatchingTraditionModifier"): 0 | 2 | 5 | 10;
    get(module: "pf2e", setting: "minimumRulesUI"): Exclude<UserRole, 0>;
    get(module: "pf2e", setting: "nathMode"): boolean;
    get(module: "pf2e", setting: "seenRemasterJournalEntry"): boolean;
    get(module: "pf2e", setting: "statusEffectType"): StatusEffectIconTheme;
    get(module: "pf2e", setting: "totmToggles"): boolean;
    get(module: "pf2e", setting: "worldSchemaVersion"): number;
    get(module: "pf2e", setting: "worldSystemVersion"): string;

    get(module: string, key: string): unknown;
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
            eq: (a: number, b: number) => boolean;
            gt: (a: number, b: number) => boolean;
            gte: (a: number, b: number) => boolean;
            lt: (a: number, b: number) => boolean;
            lte: (a: number, b: number) => boolean;
            ne: (a: number, b: number) => boolean;
            ternary: (condition: boolean | number, ifTrue: number, ifFalse: number) => number;
        }
    }

    namespace foundry {
        interface ClientSettingsMap {
            get(key: "pf2e.worldClock"): SettingConfig & { default: WorldClockSettingData };
        }
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
    const CONDITION_SOURCES: ConditionSource[];
    const EN_JSON: typeof EnJSON;
    const ROLL_PARSER: string;
    const UUID_REDIRECTS: Record<CompendiumUUID, CompendiumUUID>;
}
