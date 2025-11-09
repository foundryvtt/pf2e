import { DataSchema, Document, TypeDataModel } from "@common/abstract/_module.mjs";
import { AudioFilePath, ImageFilePath, RollMode } from "@common/constants.mjs";
import { DocumentConstructionContext } from "../common/_types.mjs";
import { ActiveEffectSource } from "../common/documents/active-effect.mjs";
import { applications, dice, documents, TokenMovementActionConfig } from "./_module.mjs";
import DocumentSheetV2 from "./applications/api/document-sheet.mjs";
import CameraViews from "./applications/apps/av/cameras.mjs";
import HTMLEnrichedContentElement from "./applications/elements/enriched-content.mjs";
import { PrototypeTokenConfig } from "./applications/sheets/_module.mjs";
import * as sidebar from "./applications/sidebar/_module.mjs";
import { CompendiumDirectory } from "./applications/sidebar/tabs/_module.mjs";
import { MainMenu, Notifications, SceneNavigation } from "./applications/ui/_module.mjs";
import Hotbar from "./applications/ui/hotbar.mjs";
import { EnrichmentOptions } from "./applications/ux/text-editor.mjs";
import ActorSheet from "./appv1/sheets/actor-sheet.mjs";
import ItemSheet from "./appv1/sheets/item-sheet.mjs";
import JournalSheet from "./appv1/sheets/journal-sheet.mjs";
import { CanvasAnimationAttribute } from "./canvas/animation/_types.mjs";
import ChatBubbles from "./canvas/animation/chat-bubbles.mjs";
import { DoorControl, ParticleEffect } from "./canvas/containers/_module.mjs";
import ClockwiseSweepPolygon from "./canvas/geometry/clockwise-sweep.mjs";
import {
    EffectsCanvasGroup,
    EnvironmentCanvasGroup,
    HiddenCanvasGroup,
    InterfaceCanvasGroup,
    PrimaryCanvasGroup,
} from "./canvas/groups/_module.mjs";
import { AlertPing, ArrowPing, ChevronPing, PulsePing, Ruler } from "./canvas/interaction/_module.mjs";
import * as layers from "./canvas/layers/_module.mjs";
import * as perception from "./canvas/perception/_module.mjs";
import * as placeables from "./canvas/placeables/_module.mjs";
import TokenRingConfig from "./canvas/placeables/tokens/ring-config.mjs";
import {
    AbstractWeatherShader,
    AdaptiveBackgroundShader,
    AdaptiveColorationShader,
    AdaptiveIlluminationShader,
    WeatherShaderEffect,
} from "./canvas/rendering/shaders/_module.mjs";
import type {
    GlobalLightSource,
    PointDarknessSource,
    PointLightSource,
    PointSoundSource,
    PointVisionSource,
} from "./canvas/sources/_module.mjs";
import ClientDatabaseBackend from "./data/client-backend.mjs";
import { TokenMovementCostAggregator } from "./documents/_types.mjs";
import WorldCollection from "./documents/abstract/world-collection.mjs";
import * as collections from "./documents/collections/_module.mjs";

export type TextEditorEnricher = (match: RegExpMatchArray, options?: EnrichmentOptions) => Promise<HTMLElement | null>;

export interface TextEditorEnricherConfig {
    /** A unique ID to assign to the enricher type. Required if you want to use the onRender callback. */
    id?: string;

    /** The string pattern to match. Must be flagged as global. */
    pattern: RegExp;

    /**
     * The function that will be called on each match. It is expected that this returns an HTML element to be inserted
     * into the final enriched content.
     */
    enricher: TextEditorEnricher;

    /**
     * Hoist the replacement element out of its containing element if it replaces the entire contents of the element.
     */
    replaceParent?: boolean;

    /**
     * An optional callback that is invoked when the
     * enriched content is added to the DOM.
     */
    onRender?: (arg0: HTMLEnrichedContentElement) => unknown;
}

/**
 * A light source animation configuration object.
 */
export interface LightSourceAnimationConfig {
    label: string;
    animation: Function;
    backgroundShader?: typeof AdaptiveBackgroundShader;
    illuminationShader?: typeof AdaptiveIlluminationShader;
    colorationShader: typeof AdaptiveColorationShader;
}

/**
 * Available Weather Effects implementations
 */
interface WeatherAmbienceConfiguration {
    id: string;
    label: string;
    filter?: {
        enabled: boolean;
        blendMode?: PIXI.BLEND_MODES;
    };
    effects: WeatherEffectConfiguration[];
}

interface WeatherEffectConfiguration {
    id: string;
    effectClass: typeof ParticleEffect | typeof WeatherShaderEffect;
    shaderClass?: typeof AbstractWeatherShader;
    blendMode?: PIXI.BLEND_MODES;
    config?: object;
    performanceLevel?: number;
}

interface WallDoorSound {
    /** A localization string label */
    label: string;
    /** A sound path when the door is closed */
    close: string;
    /** A sound path when the door becomes locked */
    lock: string;
    /** A sound path when opening the door */
    open: string;
    /** A sound path when attempting to open a locked door */
    test: string;
    /** A sound path when the door becomes unlocked */
    unlock: string;
}

type WallDoorAnimationFunction = (open: boolean) => CanvasAnimationAttribute[];
type WallDoorAnimationHook = (open: boolean) => Promise<void> | void;

interface WallDoorAnimationConfig {
    label: string;
    midpoint?: boolean;
    easing?: string | Function;
    initialize?: WallDoorAnimationHook;
    preAnimate?: WallDoorAnimationHook;
    animate: WallDoorAnimationFunction;
    postAnimate?: WallDoorAnimationHook;
    duration: number;
}

export interface PartialTokenMovementActionConfig
    extends Pick<TokenMovementActionConfig, "label" | "icon" | "order">,
        Partial<Omit<TokenMovementActionConfig, "label" | "icon" | "order">> {}

export interface RollFunction {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]): boolean | number | string | null | Promise<boolean | number | string | null>;
}

export default interface Config<
    TAmbientLightDocument extends documents.AmbientLightDocument<TScene | null>,
    TActiveEffect extends documents.ActiveEffect<TActor | TItem | null>,
    TActor extends documents.Actor<TTokenDocument | null>,
    TActorDelta extends documents.ActorDelta<TTokenDocument | null>,
    TChatLog extends sidebar.tabs.ChatLog,
    TChatMessage extends documents.ChatMessage,
    TCombat extends documents.Combat,
    TCombatant extends documents.Combatant<TCombat | null, TTokenDocument | null>,
    TCombatTracker extends sidebar.tabs.CombatTracker<TCombat | null>,
    TCompendiumDirectory extends CompendiumDirectory,
    THotbar extends Hotbar<TMacro>,
    TItem extends documents.Item<TActor | null>,
    TMacro extends documents.Macro,
    TMeasuredTemplateDocument extends documents.MeasuredTemplateDocument<TScene | null>,
    TRegionDocument extends documents.RegionDocument<TScene | null>,
    TRegionBehavior extends documents.RegionBehavior<TRegionDocument | null>,
    TTileDocument extends documents.TileDocument<TScene | null>,
    TTokenDocument extends documents.TokenDocument<TScene | null>,
    TWallDocument extends documents.WallDocument<TScene | null>,
    TScene extends documents.Scene,
    TUser extends documents.User,
    TEffectsCanvasGroup extends EffectsCanvasGroup,
> {
    /** Configure debugging flags to display additional information */
    debug: {
        dice: boolean;
        documents: boolean;
        fog: boolean;
        hooks: boolean;
        sight: boolean;
        sightRays: boolean;
        av: boolean;
        avclient: boolean;
        mouseInteraction: boolean;
        time: boolean;
    };

    time: {
        roundTime: number;
        turnTime: number;
    };

    compendium: {
        /**
         * Configure a table of compendium UUID redirects. Must be configured before the game *ready* hook is fired.
         *
         * @example Re-map individual UUIDs
         * ```js
         * CONFIG.compendium.uuidRedirects["Compendium.system.heroes.Actor.Tf0JDPzHOrIxz6BH"] = "Compendium.system.villains.Actor.DKYLeIliXXzlAZ2G";
         * ```
         *
         * @example Redirect UUIDs from one compendium to another.
         * ```js
         * CONFIG.compendium.uuidRedirects["Compendium.system.heroes"] = "Compendium.system.villains";
         * ```
         */
        uuidRedirects: Record<string, string>;
    };

    /** Configure the DatabaseBackend used to perform Document operations */
    DatabaseBackend: ClientDatabaseBackend;

    /** Configuration for the Actor document */
    Actor: {
        documentClass: {
            new (data: PreCreate<TActor["_source"]>, context?: DocumentConstructionContext<TActor["parent"]>): TActor;
        };
        collection: ConstructorOf<collections.Actors<documents.Actor<null>>>;
        compendiumIndexFields: string[];
        compendiumBanner: ImageFilePath;
        defaultType?: string;
        sidebarIcon: string;
        dataModels: Record<string, ConstructorOf<TypeDataModel<documents.Actor, DataSchema>>>;
        typeLabels: Record<string, string | undefined>;
        typeIcons: Record<string, string>;
        trackableAttributes: object;
        sheetClasses: Record<
            string,
            Record<
                string,
                {
                    id: string;
                    cls: typeof ActorSheet | typeof DocumentSheetV2;
                    default: boolean;
                    label: string;
                    canConfigure: boolean;
                    canBeDefault: boolean;
                }
            >
        >;
    };

    /** Configuration for the Cards primary Document type */
    Cards: {
        collection: WorldCollection<documents.Cards>;
        documentClass: ConstructorOf<documents.Cards>;
        sidebarIcon: string;
        presets: Record<string, { type: string; label: string; source: string }>;
    };

    /** Configuration for the FogExploration document */
    FogExploration: {
        documentClass: typeof documents.FogExploration;
        collection: typeof WorldCollection;
    };

    /** Configuration for the Folder document */
    Folder: {
        documentClass: typeof documents.Folder;
        collection: typeof collections.Folders;
    };

    /** Configuration for the ChatMessage document */
    ChatMessage: {
        batchSize: number;
        collection: typeof collections.Messages;
        documentClass: {
            new (data: PreCreate<TChatMessage["_source"]>, context?: DocumentConstructionContext<null>): TChatMessage;
        };
        sidebarIcon: string;
        template: string;
    };

    /** Configuration for Item document */
    Item: {
        dataModels: Record<string, ConstructorOf<TypeDataModel<documents.Item, DataSchema>>>;
        defaultType?: string;
        collection: typeof collections.Items;
        documentClass: {
            new (data: PreCreate<TItem["_source"]>, context?: DocumentConstructionContext<TItem["parent"]>): TItem;
        };
        typeIcons: Record<string, string>;
        typeLabels: Record<string, string | undefined>;
        sheetClasses: Record<
            string,
            Record<
                string,
                {
                    id: string;
                    cls: typeof ItemSheet | typeof DocumentSheetV2;
                    default: boolean;
                    label: string;
                    canConfigure: boolean;
                    canBeDefault: boolean;
                }
            >
        >;
    };

    /** Configuration for the Combat document */
    Combat: {
        documentClass: {
            new (data: PreCreate<TCombat["_source"]>, context?: DocumentConstructionContext<null>): TCombat;
        };
        collection: typeof collections.CombatEncounters;
        defeatedStatusId: string;
        sidebarIcon: string;
        initiative: {
            formula: ((combatant: TCombat["turns"][number]) => string) | null;
            decimals: number;
        };
    };

    /** Configuration for the JournalEntry entity */
    JournalEntry: {
        documentClass: typeof documents.JournalEntry;
        noteIcons: {
            Anchor: string;
            [key: string]: string;
        };
        sheetClasses: Record<
            string,
            Record<
                string,
                {
                    id: string;
                    cls: typeof JournalSheet;
                    default: boolean;
                    label: string;
                    canConfigure: boolean;
                    canBeDefault: boolean;
                }
            >
        >;
        sidebarIcon: string;
    };

    /** Configuration for the Macro document */
    Macro: {
        documentClass: ConstructorOf<TMacro>;
        collection: typeof collections.Macros;
        sidebarIcon: string;
    };

    /** Configuration for Scene document */
    Scene: {
        documentClass: ConstructorOf<TScene>;
        collection: typeof collections.Scenes;
        sidebarIcon: string;
    };

    /** Configuration for the Playlist document */
    Playlist: {
        documentClass: typeof documents.Playlist;
        sidebarIcon: string;
    };

    /** Configuration for RollTable random draws */
    RollTable: {
        documentClass: typeof documents.RollTable;
        sidebarIcon: string;
        resultIcon: string;
    };

    /** Configuration for the User document */
    User: {
        documentClass: ConstructorOf<TUser>;
        collection: typeof collections.Users;
        permissions: undefined;
    };

    /* -------------------------------------------- */
    /*  Embedded Documents                          */
    /* -------------------------------------------- */

    /** Configuration for the AmbientLight embedded document type and its representation on the game Canvas */
    AmbientLight: {
        documentClass: ConstructorOf<TAmbientLightDocument>;
        objectClass: ConstructorOf<NonNullable<TAmbientLightDocument["object"]>>;
    };

    /** Configuration for the ActiveEffect embedded document type */
    ActiveEffect: {
        documentClass: {
            new (
                data: PreCreate<TActiveEffect["_source"]>,
                context?: DocumentConstructionContext<TActiveEffect["parent"]>,
            ): TActiveEffect;
        };
    };

    /** Configuration for the ActorDelta embedded document type. */
    ActorDelta: {
        documentClass: ConstructorOf<TActorDelta>;
    };

    /** Configuration for the Combatant document */
    Combatant: {
        documentClass: new (
            data: PreCreate<TCombatant["_source"]>,
            context?: DocumentConstructionContext<TCombatant["parent"]>,
        ) => TCombatant;
    };

    /**
     * Configuration for the JournalEntryPage embedded document type.
     */
    JournalEntryPage: {
        dataModels: Record<string, ConstructorOf<TypeDataModel<Document, DataSchema>>>;
        defaultType: string;
        documentClass: typeof documents.JournalEntryPage;
        sidebarIcon: string;
        typeIcons: Record<string, string>;
        typeLabels: Record<string, string>;
    };

    /** Configuration for the MeasuredTemplate embedded document type and its representation on the game Canvas */
    MeasuredTemplate: {
        defaults: {
            angle: number;
            width: number;
        };
        types: {
            circle: string;
            cone: string;
            rect: string;
            ray: string;
        };
        documentClass: ConstructorOf<TMeasuredTemplateDocument>;
        objectClass: ConstructorOf<NonNullable<TMeasuredTemplateDocument["object"]>>;
    };

    /** Configuration for the Region embedded document type and its representation on the game Canvas  */
    Region: {
        documentClass: ConstructorOf<TRegionDocument>;
        objectClass: ConstructorOf<TRegionDocument["object"]>;
    };

    /** Configuration for the RegionBehavior embedded document type */
    RegionBehavior: {
        documentClass: ConstructorOf<TRegionBehavior>;
        dataModels: Record<string, ConstructorOf<foundry.data.regionBehaviors.RegionBehaviorType>>;
        typeIcons: Record<string, string>;
        typeLabels: Record<string, string>;
    };

    /** Configuration for the Tile embedded document type and its representation on the game Canvas */
    Tile: {
        documentClass: ConstructorOf<TTileDocument>;
        objectClass: ConstructorOf<NonNullable<TTileDocument["object"]>>;
    };

    /** Configuration for the Token embedded document type and its representation on the game Canvas */
    Token: {
        documentClass: ConstructorOf<TTokenDocument>;
        objectClass: ConstructorOf<NonNullable<TTokenDocument["object"]>>;
        layerClass: ConstructorOf<layers.TokenLayer>;
        prototypeSheetClass: ConstructorOf<PrototypeTokenConfig>;
        hudClass: ConstructorOf<applications.hud.TokenHUD>;
        rulerClass: ConstructorOf<placeables.tokens.TokenRuler<NonNullable<TTokenDocument["object"]>>>;
        movement: {
            TerrainData: typeof foundry.data.TerrainData;
            /** The movement cost aggregator. */
            costAggregator: TokenMovementCostAggregator;
            /** The default movement animation speed in grid spaces per second. */
            defaultSpeed: number;
            defaultAction: string;
            actions: Record<string, PartialTokenMovementActionConfig>;
        };
        adjectivesPrefix: string;
        ring: TokenRingConfig;
    };

    /** Configuration for the Wall embedded document type and its representation on the game Canvas */
    Wall: {
        documentClass: ConstructorOf<TWallDocument>;
        objectClass: ConstructorOf<placeables.Wall<TWallDocument>>;
    };

    /* -------------------------------------------- */
    /*  Canvas                                      */
    /* -------------------------------------------- */

    /** Configuration settings for the Canvas and its contained layers and objects */
    Canvas: {
        blurStrength: number;
        darknessColor: number;
        daylightColor: number;
        brightestColor: number;
        chatBubblesClass: ChatBubbles;
        darknessLightPenalty: number;
        dispositionColors: {
            HOSTILE: number;
            NEUTRAL: number;
            FRIENDLY: number;
            INACTIVE: number;
            PARTY: number;
            CONTROLLED: number;
            SECRET: number;
        };
        doorControlClass: typeof DoorControl;
        exploredColor: number;
        unexploredColor: number;
        darknessToDaylightAnimationMS: number;
        daylightToDarknessAnimationMS: number;
        darknessSourceClass: typeof PointDarknessSource;
        lightSourceClass: typeof PointLightSource;
        globalLightSourceClass: typeof GlobalLightSource;
        rulerClass: typeof Ruler;
        visionSourceClass: ConstructorOf<PointVisionSource<NonNullable<TTokenDocument["object"]>>>;
        soundSourceClass: typeof PointSoundSource;
        groups: {
            hidden: {
                groupClass: typeof HiddenCanvasGroup;
                parent: "stage";
            };
            rendered: {
                groupClass: typeof PIXI.Container;
                parent: "stage";
            };
            environment: {
                groupClass: typeof EnvironmentCanvasGroup;
                parent: "rendered";
            };
            primary: {
                groupClass: typeof PrimaryCanvasGroup;
                parent: "environment";
            };
            effects: {
                groupClass: ConstructorOf<TEffectsCanvasGroup>;
                parent: "environment";
            };
            interface: {
                groupClass: typeof InterfaceCanvasGroup;
                parent: "rendered";
            };
        };
        layers: {
            drawings: {
                group: "primary";
                layerClass: typeof layers.DrawingsLayer;
            };
            grid: {
                group: "primary";
                layerClass: typeof layers.GridLayer;
            };
            walls: {
                group: "effects";
                layerClass: ConstructorOf<NonNullable<TWallDocument["object"]>["layer"]>;
            };
            templates: {
                group: "primary";
                layerClass: ConstructorOf<NonNullable<TMeasuredTemplateDocument["object"]>["layer"]>;
            };
            notes: {
                group: "interface";
                layerClass: typeof layers.NotesLayer;
            };
            tokens: {
                group: "primary";
                layerClass: ConstructorOf<NonNullable<TTokenDocument["object"]>["layer"]>;
            };
            tiles: {
                group: "primary";
                layerClass: typeof layers.TilesLayer;
            };
            sounds: {
                group: "interface";
                layerClass: typeof layers.SoundsLayer;
            };
            lighting: {
                group: "effects";
                layerClass: ConstructorOf<NonNullable<TAmbientLightDocument["object"]>["layer"]>;
            };
            controls: {
                group: "interface";
                layerClass: typeof layers.ControlsLayer;
            };
        };
        lightLevels: {
            dark: number;
            halfdark: number;
            dim: number;
            bright: number;
        };

        polygonBackends: {
            sight: typeof ClockwiseSweepPolygon;
            light: typeof ClockwiseSweepPolygon;
            sound: typeof ClockwiseSweepPolygon;
            move: typeof ClockwiseSweepPolygon;
        };
        dragSpeedModifier: number;
        maxZoom: number;
        objectBorderThickness: number;
        lightAnimations: Record<string, LightSourceAnimationConfig>;

        pings: {
            types: {
                PULSE: "pulse";
                ALERT: "alert";
                PULL: "chevron";
                ARROW: "arrow";
            };
            styles: {
                alert: {
                    class: AlertPing;
                    color: string;
                    size: number;
                    duration: number;
                };
                arrow: {
                    class: ArrowPing;
                    size: number;
                    duration: number;
                };
                chevron: {
                    class: ChevronPing;
                    size: number;
                    duration: number;
                };
                pulse: {
                    class: PulsePing;
                    size: number;
                    duration: number;
                };
            };
            pullSpeed: number;
        };

        /** The set of VisionMode definitions which are available to be used for Token vision. */
        visionModes: {
            // Default (Basic) Vision
            basic: perception.VisionMode;

            // Darkvision
            darkvision: perception.VisionMode;

            // Monochromatic
            monochromatic: perception.VisionMode;

            // Blindness
            blindness: perception.VisionMode;

            // Tremorsense
            tremorsense: perception.VisionMode;

            // Light Amplification
            lightAmplification: perception.VisionMode;

            [key: string]: perception.VisionMode;
        };

        /** The set of DetectionMode definitions which are available to be used for visibility detection. */
        detectionModes: {
            basicSight: perception.DetectionModeDarkvision;
            seeInvisibility: perception.DetectionModeInvisibility;
            senseInvisibility: perception.DetectionModeInvisibility;
            feelTremor: perception.DetectionModeTremor;
            seeAll: perception.DetectionModeAll;
            senseAll: perception.DetectionModeAll;
        } & Record<string, perception.DetectionMode | undefined>;
    };

    /** Configure the default Token text style so that it may be reused and overridden by modules */
    canvasTextStyle: PIXI.TextStyle;

    /** Available Weather Effects implemntations */
    weatherEffects: Record<string, WeatherAmbienceConfiguration>;

    /** Configuration for dice rolling behaviors in the Foundry VTT client */
    Dice: {
        types: (typeof dice.terms.Die | typeof dice.terms.DiceTerm)[];
        rollModes: Record<RollMode, string>;
        rolls: ConstructorOf<dice.Roll>[];
        termTypes: Record<string, ConstructorOf<dice.terms.RollTerm> & { fromData(data: object): dice.terms.RollTerm }>;
        terms: {
            c: typeof dice.terms.Coin;
            d: typeof dice.terms.Die;
            f: typeof dice.terms.FateDie;
            [key: string]: ConstructorOf<dice.terms.DiceTerm>;
        };
        randomUniform: () => number;

        /**
         * A collection of custom functions that can be included in roll expressions.
         */
        functions: Record<string, RollFunction>;
    };

    /** The control icons used for rendering common HUD operations */
    controlIcons: ControlIconsConfig;

    /** A collection of fonts to load either from the user's local system, or remotely. */
    fontDefinitions: Record<string, FontFamilyDefinition>;

    /** deprecated since v10. */
    _fontFamilies: string[];

    /** The default font family used for text labels on the PIXI Canvas */
    defaultFontFamily: string;

    /** An array of status effect icons which can be applied to Tokens */
    statusEffects: StatusEffectConfig[];

    /** A mapping of status effect IDs which provide some additional mechanical integration. */
    specialStatusEffects: {
        DEFEATED: string;
        INVISIBLE: string;
        BLIND: string;
        [key: string]: string;
    };

    /** A mapping of core audio effects used which can be replaced by systems or mods */
    sounds: {
        dice: AudioFilePath;
        lock: string;
        notification: string;
        combat: string;
    };

    /** Define the set of supported languages for localization */
    supportedLanguages: {
        en: string;
        [key: string]: string;
    };

    /** Maximum canvas zoom scale */
    maxCanvasZoom: number;

    /** Custom enrichers for TextEditor.enrichHTML */
    TextEditor: {
        enrichers: {
            pattern: RegExp;
            enricher: (match: RegExpMatchArray, options: EnrichmentOptions) => Promise<HTMLElement | null>;
        }[];
    };

    /* -------------------------------------------- */
    /*  Integrations                                */
    /* -------------------------------------------- */

    /** Default configuration options for TinyMCE editors */
    // See https://www.tiny.cloud/docs/configure/content-appearance/
    TinyMCE: TinyMCE.EditorOptions;

    ui: {
        actors: ConstructorOf<foundry.applications.sidebar.tabs.ActorDirectory<documents.Actor<null>>>;
        chat: ConstructorOf<TChatLog>;
        combat: ConstructorOf<TCombatTracker>;
        compendium: ConstructorOf<TCompendiumDirectory>;
        controls: typeof applications.ui.SceneControls;
        hotbar: ConstructorOf<THotbar>;
        items: ConstructorOf<sidebar.tabs.ItemDirectory<documents.Item<null>>>;
        journal: typeof sidebar.tabs.JournalDirectory;
        macros: typeof sidebar.tabs.MacroDirectory;
        menu: typeof MainMenu;
        nav: typeof SceneNavigation;
        notifications: typeof Notifications;
        pause: typeof applications.ui.GamePause;
        players: typeof applications.ui.Players;
        playlists: typeof sidebar.tabs.PlaylistDirectory;
        scenes: typeof sidebar.tabs.SceneDirectory;
        settings: typeof sidebar.tabs.Settings;
        sidebar: typeof sidebar.Sidebar;
        tables: typeof sidebar.tabs.RollTableDirectory;
        webrtc: typeof CameraViews;
    };

    ux: {
        ContextMenu: typeof applications.ux.ContextMenu;
        Draggable: typeof applications.ux.Draggable;
        DragDrop: typeof applications.ux.DragDrop;
        FilePicker: typeof applications.apps.FilePicker;
        TextEditor: typeof applications.ux.TextEditor;
        TooltipManager: typeof foundry.helpers.interaction.TooltipManager;
    };

    /**
     * System and modules must prefix the names of the queries they register (e.g. "my-module.aCustomQuery").
     * Non-prefixed query names are reserved by core.
     */
    queries: {
        dialog: typeof applications.api.DialogV2._handleQuery;
        confirmTeleportToken: typeof foundry.data.regionBehaviors.TeleportTokenRegionBehaviorType._confirmQuery;
        [key: string]: Function;
    };
}

interface ControlIconsConfig {
    combat: ImageFilePath;
    visibility: ImageFilePath;
    effects: ImageFilePath;
    lock: ImageFilePath;
    up: ImageFilePath;
    down: ImageFilePath;
    defeated: ImageFilePath;
    [key: string]: ImageFilePath | undefined;
}

interface StatusEffectConfig extends Partial<ActiveEffectSource> {
    id: string;
    name: string;
    img: ImageFilePath;
}

interface FontFamilyDefinition {
    /** Whether the font is available in the rich text editor. This will also enable it for notes and drawings. */
    editor: boolean;
    fonts: FontDefinition[];
}

interface FontDefinition extends FontFaceDescriptors {
    /**
     * Individual font face definitions for this font family. If this is empty, the font family may only be loaded
     * from the client's OS-installed fonts.
     */
    urls: string[];
}
