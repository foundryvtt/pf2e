import type * as TinyMCE from "tinymce";

declare global {
    interface Config<
        TAmbientLightDocument extends AmbientLightDocument<TScene | null>,
        TActiveEffect extends ActiveEffect<TActor | TItem | null>,
        TActor extends Actor<TTokenDocument | null>,
        TActorDelta extends ActorDelta<TTokenDocument | null>,
        TChatLog extends ChatLog,
        TChatMessage extends ChatMessage,
        TCombat extends Combat,
        TCombatant extends Combatant<TCombat | null, TTokenDocument | null>,
        TCombatTracker extends CombatTracker<TCombat | null>,
        TCompendiumDirectory extends CompendiumDirectory,
        THotbar extends Hotbar,
        TItem extends Item<TActor | null>,
        TMacro extends Macro,
        TMeasuredTemplateDocument extends MeasuredTemplateDocument<TScene | null>,
        TTileDocument extends TileDocument<TScene | null>,
        TTokenDocument extends TokenDocument<TScene | null>,
        TWallDocument extends WallDocument<TScene | null>,
        TScene extends Scene,
        TUser extends User,
        TEffectsCanvasGroup extends EffectsCanvasGroup
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
                new (
                    data: PreCreate<TActor["_source"]>,
                    context?: DocumentConstructionContext<TActor["parent"]>
                ): TActor;
            };
            collection: ConstructorOf<Actors<Actor<null>>>;
            sheetClasses: Record<
                string,
                Record<
                    string,
                    {
                        id: string;
                        cls: typeof ActorSheet;
                        default: boolean;
                    }
                >
            >;
            typeIcons: Record<string, string>;
            typeLabels: Record<string, string | undefined>;
        };

        /** Configuration for the Cards primary Document type */
        Cards: {
            collection: WorldCollection<Cards>;
            documentClass: ConstructorOf<Cards>;
            sidebarIcon: string;
            presets: Record<string, { type: string; label: string; source: string }>;
        };

        /** Configuration for the FogExploration document */
        FogExploration: {
            documentClass: typeof FogExploration;
            collection: typeof WorldCollection;
        };

        /** Configuration for the Folder document */
        Folder: {
            documentClass: typeof Folder;
            collection: typeof Folders;
        };

        /** Configuration for the ChatMessage document */
        ChatMessage: {
            batchSize: number;
            collection: typeof Messages;
            documentClass: {
                new (
                    data: PreCreate<TChatMessage["_source"]>,
                    context?: DocumentConstructionContext<null>
                ): TChatMessage;
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
            sheetClasses: Record<
                string,
                Record<
                    string,
                    {
                        id: string;
                        cls: typeof ItemSheet;
                        default: boolean;
                    }
                >
            >;
            typeIcons: Record<string, string>;
            typeLabels: Record<string, string | undefined>;
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
            documentClass: typeof JournalEntry;
            noteIcons: {
                Anchor: string;
                [key: string]: string;
            };
            sidebarIcon: string;
        };

        /** Configuration for the Macro document */
        Macro: {
            documentClass: ConstructorOf<TMacro>;
            collection: typeof Macros;
            sidebarIcon: string;
        };

        /** Configuration for Scene document */
        Scene: {
            documentClass: ConstructorOf<TScene>;
            collection: typeof Scenes;
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
            documentClass: ConstructorOf<TUser>;
            collection: typeof Users;
            permissions: undefined;
        };

        /* -------------------------------------------- */
        /*  Embedded Documents                          */
        /* -------------------------------------------- */

        /** Configuration for the AmbientLight embedded document type and its representation on the game Canvas */
        AmbientLight: {
            documentClass: ConstructorOf<TAmbientLightDocument>;
            objectClass: ConstructorOf<NonNullable<TAmbientLightDocument["object"]>>;
            layerClass: ConstructorOf<NonNullable<TAmbientLightDocument["object"]>["layer"]>;
        };

        /** Configuration for the ActiveEffect embedded document type */
        ActiveEffect: {
            documentClass: {
                new (
                    data: PreCreate<TActiveEffect["_source"]>,
                    context?: DocumentConstructionContext<TActiveEffect["parent"]>
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
                context?: DocumentConstructionContext<TCombatant["parent"]>
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
            documentClass: ConstructorOf<TMeasuredTemplateDocument>;
            objectClass: ConstructorOf<NonNullable<TMeasuredTemplateDocument["object"]>>;
            layerClass: ConstructorOf<NonNullable<TMeasuredTemplateDocument["object"]>["layer"]>;
        };

        /** Configuration for the Tile embedded document type and its representation on the game Canvas */
        Tile: {
            documentClass: ConstructorOf<TTileDocument>;
            objectClass: ConstructorOf<NonNullable<TTileDocument["object"]>>;
            layerClass: ConstructorOf<TilesLayer<NonNullable<TTileDocument["object"]>>>;
        };

        /** Configuration for the Token embedded document type and its representation on the game Canvas */
        Token: {
            documentClass: ConstructorOf<TTokenDocument>;
            objectClass: ConstructorOf<NonNullable<TTokenDocument["object"]>>;
            layerClass: ConstructorOf<NonNullable<TTokenDocument["object"]>["layer"]>;
            prototypeSheetClass: ConstructorOf<TTokenDocument["sheet"]>;
        };

        /** Configuration for the Wall embedded document type and its representation on the game Canvas */
        Wall: {
            documentClass: ConstructorOf<TWallDocument>;
            objectClass: ConstructorOf<Wall<TWallDocument>>;
            layerClass: ConstructorOf<NonNullable<TWallDocument["object"]>["layer"]>;
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
                    layerClass: typeof DrawingsLayer;
                };
                grid: {
                    group: "primary";
                    layerClass: typeof GridLayer;
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
                    layerClass: typeof NotesLayer;
                };
                tokens: {
                    group: "primary";
                    layerClass: ConstructorOf<NonNullable<TTokenDocument["object"]>["layer"]>;
                };
                tiles: {
                    group: "primary";
                    layerClass: typeof TilesLayer;
                };
                sounds: {
                    group: "interface";
                    layerClass: typeof SoundsLayer;
                };
                lighting: {
                    group: "effects";
                    layerClass: ConstructorOf<NonNullable<TAmbientLightDocument["object"]>["layer"]>;
                };
                controls: {
                    group: "interface";
                    layerClass: typeof ControlsLayer;
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

            normalLightColor: number;
            maxZoom: number;
            objectBorderThickness: number;
            lightAnimations: {
                torch: {
                    label: "LIGHT.AnimationTorch";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animateTorch"];
                    illuminationShader: typeof PIXI.Shader;
                    colorationShader: typeof PIXI.Shader;
                };
                pulse: {
                    label: "LIGHT.AnimationPulse";
                    animation: LightSource<TAmbientLightDocument["object"] | TTokenDocument["object"]>["animatePulse"];
                    illuminationShader: typeof PIXI.Shader;
                    colorationShader: typeof PIXI.Shader;
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

            /** The set of VisionMode definitions which are available to be used for Token vision. */
            visionModes: {
                // Default (Basic) Vision
                basic: VisionMode;

                // Darkvision
                darkvision: VisionMode;

                // Monochromatic
                monochromatic: VisionMode;

                // Blindness
                blindness: VisionMode;

                // Tremorsense
                tremorsense: VisionMode;

                // Light Amplification
                lightAmplification: VisionMode;

                [key: string]: VisionMode;
            };

            /** The set of DetectionMode definitions which are available to be used for visibility detection. */
            detectionModes: {
                basicSight: DetectionModeBasicSight;
                seeInvisibility: DetectionModeInvisibility;
                senseInvisibility: DetectionModeInvisibility;
                feelTremor: DetectionModeTremor;
                seeAll: DetectionModeAll;
                senseAll: DetectionModeAll;
            } & {
                [K in string]?: DetectionMode;
            };
        };

        /** Configure the default Token text style so that it may be reused and overridden by modules */
        canvasTextStyle: PIXI.TextStyle;

        /** Available Weather Effects implemntations */
        weatherEffects: Record<string, SpecialEffect>;

        /** Configuration for dice rolling behaviors in the Foundry VTT client */
        Dice: {
            types: (typeof Die | typeof DiceTerm)[];
            rollModes: Record<RollMode, string>;
            rolls: ConstructorOf<Roll>[];
            termTypes: Record<string, ConstructorOf<RollTerm> & { fromData(data: object): RollTerm }>;
            terms: {
                c: typeof Coin;
                d: typeof Die;
                f: typeof FateDie;
                [key: string]: ConstructorOf<DiceTerm>;
            };
            randomUniform: Function;
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
        statusEffects: StatusEffect[];

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
                enricher: (match: RegExpMatchArray, options: EnrichHTMLOptions) => Promise<HTMLElement | null>;
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
            actors: ConstructorOf<ActorDirectory<Actor<null>>>;
            chat: ConstructorOf<TChatLog>;
            combat: ConstructorOf<TCombatTracker>;
            compendium: ConstructorOf<TCompendiumDirectory>;
            controls: typeof SceneControls;
            hotbar: ConstructorOf<THotbar>;
            items: ConstructorOf<ItemDirectory<Item<null>>>;
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

    interface ControlIconsConfig {
        combat: ImageFilePath | VideoFilePath;
        visibility: ImageFilePath | VideoFilePath;
        effects: ImageFilePath | VideoFilePath;
        lock: ImageFilePath | VideoFilePath;
        up: ImageFilePath | VideoFilePath;
        down: ImageFilePath | VideoFilePath;
        defeated: ImageFilePath | VideoFilePath;
        [key: string]: ImageFilePath | VideoFilePath | undefined;
    }

    interface StatusEffect {
        id: string;
        label: string;
        icon: ImageFilePath | VideoFilePath;
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
}
