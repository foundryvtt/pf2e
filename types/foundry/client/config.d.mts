import { DataSchema, Document, TypeDataModel } from "@common/abstract/_module.mjs";
import type * as TinyMCE from "tinymce";
import { DocumentConstructionContext } from "../common/_types.mjs";
import { ActiveEffectSource } from "../common/documents/active-effect.mjs";
import DocumentSheetV2 from "./applications/api/document-sheet.mjs";
import HTMLEnrichedContentElement from "./applications/elements/enriched-content.mjs";
import { CompendiumDirectory, ItemDirectory } from "./applications/sidebar/tabs/_module.mjs";
import Hotbar from "./applications/ui/hotbar.mjs";
import { EnrichmentOptions } from "./applications/ux/text-editor.mjs";
import ActorSheet from "./appv1/sheets/actor-sheet.mjs";
import ItemSheet from "./appv1/sheets/item-sheet.mjs";
import JournalSheet from "./appv1/sheets/journal-sheet.mjs";
import ChatBubbles from "./canvas/animation/chat-bubbles.mjs";
import { DoorControl } from "./canvas/containers/_module.mjs";
import ClockwiseSweepPolygon from "./canvas/geometry/clockwise-sweep.mjs";
import EffectsCanvasGroup from "./canvas/groups/effects.mjs";
import InterfaceCanvasGroup from "./canvas/groups/interface.mjs";
import { AlertPing, ArrowPing, ChevronPing, PulsePing, Ruler } from "./canvas/interaction/_module.mjs";
import * as layers from "./canvas/layers/_module.mjs";
import * as perception from "./canvas/perception/_module.mjs";
import type {
    GlobalLightSource,
    PointDarknessSource,
    PointLightSource,
    PointSoundSource,
    PointVisionSource,
} from "./canvas/sources/_module.mjs";
import ClientDatabaseBackend from "./data/client-backend.mjs";
import * as dice from "./dice/_module.mjs";
import * as documents from "./documents/_module.mjs";
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

export default interface Config<
    TAmbientLightDocument extends documents.AmbientLightDocument<TScene | null>,
    TActiveEffect extends documents.ActiveEffect<TActor | TItem | null>,
    TActor extends documents.Actor<TTokenDocument | null>,
    TActorDelta extends documents.ActorDelta<TTokenDocument | null>,
    TChatLog extends ChatLog,
    TChatMessage extends documents.ChatMessage,
    TCombat extends documents.Combat,
    TCombatant extends documents.Combatant<TCombat | null, TTokenDocument | null>,
    TCombatTracker extends CombatTracker<TCombat | null>,
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
    TUser extends documents.User<documents.Actor<null>>,
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
        collection: typeof Folders;
    };

    /** Configuration for the ChatMessage document */
    ChatMessage: {
        batchSize: number;
        collection: typeof Messages;
        documentClass: {
            new (data: PreCreate<TChatMessage["_source"]>, context?: DocumentConstructionContext<null>): TChatMessage;
        };
        sidebarIcon: string;
        template: string;
    };

    /** Configuration for Item document */
    Item: {
        documentClass: {
            new (data: PreCreate<TItem["_source"]>, context?: DocumentConstructionContext<TItem["parent"]>): TItem;
        };
        collection: typeof Items;
        dataModels: Record<string, ConstructorOf<TypeDataModel<documents.Item, DataSchema>>>;
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
        collection: typeof CombatEncounters;
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
        documentClass: typeof documents.JournalEntryPage;
        dataModels: Record<string, ConstructorOf<TypeDataModel<Document, DataSchema>>>;
        typeLabels: Record<string, string>;
        typeIcons: Record<string, string>;
        defaultType: string;
        sidebarIcon: string;
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
        prototypeSheetClass: ConstructorOf<TTokenDocument["sheet"]>;
        ring: TokenRingConfig;
    };

    /** Configuration for the Wall embedded document type and its representation on the game Canvas */
    Wall: {
        documentClass: ConstructorOf<TWallDocument>;
        objectClass: ConstructorOf<Wall<TWallDocument>>;
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
        doorControlsClass: DoorControl;
        exploredColor: number;
        unexploredColor: number;
        darknessToDaylightAnimationMS: number;
        daylightToDarknessAnimationMS: number;
        darknessSourceClass: ConstructorOf<
            PointDarknessSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>
        >;
        lightSourceClass: ConstructorOf<PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>>;
        globalLightSourceClass: ConstructorOf<GlobalLightSource>;
        rulerClass: ConstructorOf<Ruler>;
        visionSourceClass: ConstructorOf<PointVisionSource<TTokenDocument["object"]>>;
        soundSourceClass: ConstructorOf<PointSoundSource>;
        groups: {
            hidden: {
                groupClass: ConstructorOf<PIXI.Container>;
                parent: "stage";
            };
            rendered: {
                groupClass: ConstructorOf<PIXI.Container>;
                parent: "stage";
            };
            environment: {
                groupClass: ConstructorOf<PIXI.Container>;
                parent: "rendered";
            };
            primary: {
                groupClass: ConstructorOf<PIXI.Container>;
                parent: "environment";
            };
            effects: {
                groupClass: ConstructorOf<TEffectsCanvasGroup>;
                parent: "environment";
            };
            interface: {
                groupClass: ConstructorOf<InterfaceCanvasGroup>;
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
        lightAnimations: {
            flame: {
                label: "LIGHT.AnimationFlame";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTorch"];
                illuminationShader: typeof PIXI.Shader;
                colorationShader: typeof PIXI.Shader;
            };
            torch: {
                label: "LIGHT.AnimationTorch";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTorch"];
                illuminationShader: typeof PIXI.Shader;
                colorationShader: typeof PIXI.Shader;
            };
            pulse: {
                label: "LIGHT.AnimationPulse";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animatePulse"];
                illuminationShader: typeof PIXI.Shader;
                colorationShader: typeof PIXI.Shader;
            };
            chroma: {
                label: "LIGHT.AnimationChroma";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            wave: {
                label: "LIGHT.AnimationWave";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                illuminationShader: typeof PIXI.Shader;
                colorationShader: typeof PIXI.Shader;
            };
            fog: {
                label: "LIGHT.AnimationFog";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            sunburst: {
                label: "LIGHT.AnimationSunburst";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                illuminationShader: typeof PIXI.Shader;
                colorationShader: typeof PIXI.Shader;
            };
            dome: {
                label: "LIGHT.AnimationLightDome";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            emanation: {
                label: "LIGHT.AnimationEmanation";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            hexa: {
                label: "LIGHT.AnimationHexaDome";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            ghost: {
                label: "LIGHT.AnimationGhostLight";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                illuminationShader: typeof PIXI.Shader;
                colorationShader: typeof PIXI.Shader;
            };
            energy: {
                label: "LIGHT.AnimationEnergyField";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            vortex: {
                label: "LIGHT.AnimationVortex";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                illuminationShader: typeof PIXI.Shader;
                colorationShader: typeof PIXI.Shader;
            };
            witchwave: {
                label: "LIGHT.AnimationBewitchingWave";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            rainbowswirl: {
                label: "LIGHT.AnimationSwirlingRainbow";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            radialrainbow: {
                label: "LIGHT.AnimationRadialRainbow";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            fairy: {
                label: "LIGHT.AnimationFairyLight";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                illuminationShader: typeof PIXI.Shader;
                colorationShader: typeof PIXI.Shader;
            };
            grid: {
                label: "LIGHT.AnimationForceGrid";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            starlight: {
                label: "LIGHT.AnimationStarLight";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                colorationShader: typeof PIXI.Shader;
            };
            smokepatch: {
                label: "LIGHT.AnimationSmokePatch";
                animation: PointLightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                illuminationShader: typeof PIXI.Shader;
                colorationShader: typeof PIXI.Shader;
            };
        };

        darknessAnimations: {
            magicalGloom: {
                label: "LIGHT.AnimationMagicalGloom";
                animation: PointDarknessSource<
                    TAmbientLightDocument["object"] | TTokenDocument["object"]
                >["animateTime"];
                darknessShader: typeof PIXI.Shader;
            };
            roiling: {
                label: "LIGHT.AnimationRoilingMass";
                animation: PointDarknessSource<
                    TAmbientLightDocument["object"] | TTokenDocument["object"]
                >["animateTime"];
                darknessShader: typeof PIXI.Shader;
            };
            hole: {
                label: "LIGHT.AnimationBlackHole";
                animation: PointDarknessSource<
                    TAmbientLightDocument["object"] | TTokenDocument["object"]
                >["animateTime"];
                darknessShader: typeof PIXI.Shader;
            };
        };

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
    weatherEffects: Record<string, SpecialEffect>;

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
    TinyMCE: Omit<TinyMCE.EditorOptions, "style_formats"> & {
        style_formats: NonNullable<TinyMCE.EditorOptions["style_formats"]>;
    };

    ui: {
        actors: ConstructorOf<foundry.applications.sidebar.tabs.ActorDirectory<documents.Actor<null>>>;
        chat: ConstructorOf<TChatLog>;
        combat: ConstructorOf<TCombatTracker>;
        compendium: ConstructorOf<TCompendiumDirectory>;
        controls: typeof foundry.applications.ui.SceneControls;
        hotbar: ConstructorOf<THotbar>;
        items: ConstructorOf<ItemDirectory<documents.Item<null>>>;
        // journal: typeof JournalDirectory;
        // macros: typeof MacroDirectory;
        menu: typeof MainMenu;
        nav: typeof SceneNavigation;
        notifications: typeof Notifications;
        pause: typeof foundry.applications.ui.GamePause;
        players: typeof PlayerList;
        // playlists: typeof PlaylistDirectory;
        // scenes: typeof SceneDirectory;
        settings: typeof Settings;
        sidebar: typeof Sidebar;
        tables: typeof RollTableDirectory;
        // webrtc: typeof CameraViews;
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
