import type * as TinyMCE from "tinymce";
import * as PIXI from "pixi.js";

declare global {
    interface Config<
        TAmbientLightDocument extends AmbientLightDocument = AmbientLightDocument,
        TActiveEffect extends ActiveEffect = ActiveEffect,
        TActor extends Actor = Actor,
        TChatLog extends ChatLog = ChatLog,
        TChatMessage extends ChatMessage = ChatMessage,
        TCombat extends Combat = Combat,
        TCombatant extends Combatant<TActor | null> = Combatant<TActor | null>,
        TCombatTracker extends CombatTracker<TCombat> = CombatTracker<TCombat>,
        TCompendiumDirectory extends CompendiumDirectory = CompendiumDirectory,
        TFogExploration extends FogExploration = FogExploration,
        TFolder extends Folder = Folder,
        THotbar extends Hotbar = Hotbar,
        TItem extends Item = Item,
        TMacro extends Macro = Macro,
        TMeasuredTemplateDocument extends MeasuredTemplateDocument = MeasuredTemplateDocument,
        TTileDocument extends TileDocument = TileDocument,
        TTokenDocument extends TokenDocument = TokenDocument,
        TScene extends Scene = Scene,
        TUser extends User = User
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

        /* -------------------------------------------- */
        /*  Embedded Documents                          */
        /* -------------------------------------------- */

        /** Configuration for the Actor document */
        Actor: {
            documentClass: {
                new (data: PreCreate<TActor["data"]["_source"]>, context?: DocumentConstructionContext<TActor>): TActor;
            };
            collection: ConstructorOf<Actors<TActor>>;
            sheetClasses: Record<string, Record<string, typeof ActorSheet>>;
            typeLabels: Record<string, string | undefined>;
        };

        /**
         * Configuration for the FogExploration document
         */
        FogExploration: {
            documentClass: {
                new (
                    data: PreCreate<TFogExploration["data"]["_source"]>,
                    context?: DocumentConstructionContext<TFogExploration>
                ): TFogExploration;
            };
            collection: typeof WorldCollection;
        };

        /** Configuration for the Folder document */
        Folder: {
            documentClass: {
                new (
                    data: PreCreate<TFolder["data"]["_source"]>,
                    context?: DocumentConstructionContext<TFolder>
                ): TFolder;
            };
            collection: typeof Folders;
        };

        /** Configuration for the ChatMessage document */
        ChatMessage: {
            batchSize: number;
            collection: typeof Messages;
            documentClass: {
                new (
                    data: PreCreate<TChatMessage["data"]["_source"]>,
                    context?: DocumentConstructionContext<TChatMessage>
                ): TChatMessage;
            };
            sidebarIcon: string;
            template: string;
        };

        /** Configuration for Item document */
        Item: {
            documentClass: {
                new (data: PreCreate<TItem["data"]["_source"]>, context?: DocumentConstructionContext<TItem>): TItem;
            };
            collection: typeof Items;
            sheetClasses: Record<string, Record<string, typeof ItemSheet>>;
            typeLabels: Record<string, string | undefined>;
        };

        /** Configuration for the Combat document */
        Combat: {
            documentClass: {
                new (
                    data: PreCreate<TCombat["data"]["_source"]>,
                    context?: DocumentConstructionContext<TCombat>
                ): TCombat;
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
            documentClass: typeof JournalEntry;
            noteIcons: {
                Anchor: string;
                [key: string]: string;
            };
            sidebarIcon: string;
        };

        /** Configuration for the Macro document */
        Macro: {
            documentClass: {
                new (data: PreCreate<TMacro["data"]["_source"]>, context?: DocumentConstructionContext<TMacro>): TMacro;
            };
            collection: typeof Macros;
            sidebarIcon: string;
        };

        /** Configuration for Scene document */
        Scene: {
            documentClass: {
                new (data: PreCreate<TScene["data"]["_source"]>, context?: DocumentConstructionContext<TScene>): TScene;
            };

            collection: typeof Scenes;
            notesClass: any;
            sidebarIcon: string;
        };

        /** Configuration for the Playlist document */
        Playlist: {
            documentClass: typeof Playlist;
            sidebarIcon: string;
        };

        /** Configuration for RollTable random draws */
        RollTable: {
            documentClass: typeof RollTable;
            sidebarIcon: string;
            resultIcon: string;
        };

        /** Configuration for the User document */
        User: {
            documentClass: {
                new (data: PreCreate<TUser["data"]["_source"]>, context?: DocumentConstructionContext<TUser>): TUser;
            };
            collection: typeof Users;
            permissions: undefined;
        };

        /* -------------------------------------------- */
        /*  Embedded Documents                          */
        /* -------------------------------------------- */

        /** Configuration for the AmbientLight embedded document type and its representation on the game Canvas */
        AmbientLight: {
            documentClass: ConstructorOf<TAmbientLightDocument>;
            objectClass: ConstructorOf<TAmbientLightDocument["object"]>;
            layerClass: ConstructorOf<TAmbientLightDocument["object"]["layer"]>;
        };

        /** Configuration for the ActiveEffect embedded document type */
        ActiveEffect: {
            documentClass: {
                new (
                    data: PreCreate<TActiveEffect["data"]["_source"]>,
                    context?: DocumentConstructionContext<TActiveEffect>
                ): TActiveEffect;
            };
        };

        /** Configuration for the Combatant document */
        Combatant: {
            documentClass: new (
                data: PreCreate<TCombat["turns"][number]["data"]["_source"]>,
                context?: DocumentConstructionContext<TCombat["turns"][number]>
            ) => TCombatant;
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
            documentClass: new (
                data: PreCreate<foundry.data.MeasuredTemplateSource>,
                context?: DocumentConstructionContext<TMeasuredTemplateDocument>
            ) => TMeasuredTemplateDocument;
            objectClass: ConstructorOf<TMeasuredTemplateDocument["object"]>;
            layerClass: ConstructorOf<TMeasuredTemplateDocument["object"]["layer"]>;
        };

        /** Configuration for the Tile embedded document type and its representation on the game Canvas */
        Tile: {
            documentClass: ConstructorOf<TTileDocument>;
            objectClass: ConstructorOf<TTileDocument["object"]>;
            layerClass: ConstructorOf<BackgroundLayer>;
        };

        /** Configuration for the Token embedded document type and its representation on the game Canvas */
        Token: {
            documentClass: ConstructorOf<TTokenDocument>;
            objectClass: new (...args: any[]) => TTokenDocument["object"];
            layerClass: ConstructorOf<TTokenDocument["object"]["layer"]>;
            prototypeSheetClass: ConstructorOf<TTokenDocument["sheet"]>;
        };

        /* -------------------------------------------- */
        /*  Canvas                                      */
        /* -------------------------------------------- */

        /** Configuration settings for the Canvas and its contained layers and objects */
        Canvas: {
            blurStrength: number;
            darknessColor: number;
            darknessLightPenalty: number;
            daylightColor: number;
            dispositionColors: {
                HOSTILE: number;
                NEUTRAL: number;
                FRIENDLY: number;
                INACTIVE: number;
                PARTY: number;
                CONTROLLED: number;
            };
            exploredColor: number;
            unexploredColor: number;
            layers: {
                background: {
                    group: "primary";
                    layerClass: typeof BackgroundLayer;
                };
                drawings: {
                    group: "primary";
                    layerClass: typeof DrawingsLayer;
                };
                grid: {
                    group: "primary";
                    layerClass: typeof GridLayer;
                };
                walls: {
                    group: "effects";
                    layerClass: typeof WallsLayer;
                };
                templates: {
                    group: "primary";
                    layerClass: ConstructorOf<TMeasuredTemplateDocument["object"]["layer"]>;
                };
                notes: {
                    group: "interface";
                    layerClass: typeof NotesLayer;
                };
                tokens: {
                    group: "primary";
                    layerClass: ConstructorOf<TTokenDocument["object"]["layer"]>;
                };
                foreground: {
                    group: "primary";
                    layerClass: typeof ForegroundLayer;
                };
                sounds: {
                    group: "interface";
                    layerClass: typeof SoundsLayer;
                };
                lighting: {
                    group: "effects";
                    layerClass: ConstructorOf<TAmbientLightDocument["object"]["layer"]>;
                };
                sight: {
                    group: "effects";
                    layerClass: ConstructorOf<SightLayer<TTokenDocument["object"], TFogExploration>>;
                };
                weather: {
                    group: "effects";
                    layerClass: typeof EffectsLayer;
                };
                controls: {
                    group: "interface";
                    layerClass: typeof ControlsLayer;
                };
            };
            lightLevels: {
                dark: number;
                dim: number;
                bright: number;
            };
            normalLightColor: number;
            maxZoom: number;
            objectBorderThickness: number;
            lightAnimations: {
                torch: {
                    label: "LIGHT.AnimationTorch";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTorch"];
                    illuminationShader: typeof TorchIlluminationShader;
                    colorationShader: typeof TorchColorationShader;
                };
                pulse: {
                    label: "LIGHT.AnimationPulse";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animatePulse"];
                    illuminationShader: typeof PulseIlluminationShader;
                    colorationShader: typeof PulseColorationShader;
                };
                chroma: {
                    label: "LIGHT.AnimationChroma";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    colorationShader: typeof PIXI.Shader;
                };
                wave: {
                    label: "LIGHT.AnimationWave";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    illuminationShader: typeof PIXI.Shader;
                    colorationShader: typeof PIXI.Shader;
                };
                fog: {
                    label: "LIGHT.AnimationFog";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    colorationShader: typeof PIXI.Shader;
                };
                sunburst: {
                    label: "LIGHT.AnimationSunburst";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    illuminationShader: typeof PIXI.Shader;
                    colorationShader: typeof PIXI.Shader;
                };
                dome: {
                    label: "LIGHT.AnimationLightDome";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    colorationShader: typeof PIXI.Shader;
                };
                emanation: {
                    label: "LIGHT.AnimationEmanation";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    colorationShader: typeof PIXI.Shader;
                };
                hexa: {
                    label: "LIGHT.AnimationHexaDome";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    colorationShader: typeof PIXI.Shader;
                };
                ghost: {
                    label: "LIGHT.AnimationGhostLight";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    illuminationShader: typeof PIXI.Shader;
                    colorationShader: typeof PIXI.Shader;
                };
                energy: {
                    label: "LIGHT.AnimationEnergyField";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    colorationShader: typeof PIXI.Shader;
                };
                roiling: {
                    label: "LIGHT.AnimationRoilingMass";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    illuminationShader: typeof PIXI.Shader;
                };
                hole: {
                    label: "LIGHT.AnimationBlackHole";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTime"];
                    illuminationShader: typeof PIXI.Shader;
                };
            };
        };

        /** Configuration for dice rolling behaviors in the Foundry VTT client */
        Dice: {
            types: Array<typeof Die | typeof DiceTerm>;
            rollModes: Record<RollMode, string>;
            rolls: ConstructorOf<Roll>[];
            termTypes: Record<string, typeof DiceTerm>;
            terms: {
                c: typeof Coin;
                d: typeof Die;
                f: typeof FateDie;
            };
            randomUniform: Function;
        };

        /**
         * The control icons used for rendering common HUD operations
         */
        controlIcons: {
            combat: string;
            visibility: string;
            effects: string;
            lock: string;
            up: string;
            down: string;
            defeated: string;
            [key: string]: string | undefined;
        };

        /**
         * Suggested font families that are displayed wherever a choice is presented
         */
        fontFamilies: string[];

        /**
         * The default font family used for text labels on the PIXI Canvas
         */
        defaultFontFamily: string;

        /**
         * Available Weather Effects implemntations
         */
        weatherEffects: any;

        /**
         * An array of status effect icons which can be applied to Tokens
         */
        statusEffects: string[];

        /**
         * A mapping of core audio effects used which can be replaced by systems or mods
         */
        sounds: {
            dice: AudioPath;
            lock: string;
            notification: string;
            combat: string;
        };

        /**
         * Define the set of supported languages for localization
         */
        supportedLanguages: {
            en: string;
            [key: string]: string;
        };

        /**
         * Maximum canvas zoom scale
         */
        maxCanvasZoom: number;

        /* -------------------------------------------- */
        /*  Integrations                                */
        /* -------------------------------------------- */

        /** Default configuration options for TinyMCE editors */
        // See https://www.tiny.cloud/docs/configure/content-appearance/
        TinyMCE: Omit<TinyMCE.EditorSettings, "content_css" | "style_formats"> & {
            content_css: string[];
            style_formats: NonNullable<TinyMCE.EditorSettings["style_formats"]>;
        };

        ui: {
            actors: typeof ActorDirectory;
            chat: ConstructorOf<TChatLog>;
            combat: ConstructorOf<TCombatTracker>;
            compendium: ConstructorOf<TCompendiumDirectory>;
            controls: typeof SceneControls;
            hotbar: ConstructorOf<THotbar>;
            items: typeof ItemDirectory;
            // journal: typeof JournalDirectory;
            // macros: typeof MacroDirectory;
            menu: typeof MainMenu;
            nav: typeof SceneNavigation;
            notifications: typeof Notifications;
            pause: typeof Pause;
            players: typeof PlayerList;
            // playlists: typeof PlaylistDirectory;
            // scenes: typeof SceneDirectory;
            settings: typeof Settings;
            sidebar: typeof Sidebar;
            tables: typeof RollTableDirectory;
            // webrtc: typeof CameraViews;
        };
    }
}
