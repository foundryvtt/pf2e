import type * as TinyMCE from 'tinymce';

declare global {
    interface Config<
        TActiveEffect extends ActiveEffect = ActiveEffect,
        TActor extends Actor = Actor,
        TChatMessage extends ChatMessage<TActor> = ChatMessage<TActor>,
        TCombatant extends Combatant = Combatant,
        TCombat extends Combat = Combat,
        TItem extends Item = Item,
        TMacro extends Macro = Macro,
        TTokenDocument extends TokenDocument = TokenDocument,
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

        /** Configuration for the Actor document */
        Actor: {
            documentClass: {
                new (data: PreCreate<TActor['data']['_source']>, options?: DocumentConstructionContext<TActor>): TActor;
            };
            collection: Actors<TActor>;
            sheetClasses: Record<string, Record<string, typeof ActorSheet>>;
        };

        /**
         * Configuration for the ActiveEffect embedded Entity
         */
        ActiveEffect: {
            documentClass: {
                new (
                    data: PreCreate<TActiveEffect['data']['_source']>,
                    context?: DocumentConstructionContext<TActiveEffect>,
                ): TActiveEffect;
            };
            sheetClass: typeof ActiveEffectConfig;
        };

        Canvas: {
            blurStrength: number;
            darknessColor: number;
            darknessLightPenalty: number;
            daylightColor: number;
            dispositionColors: Record<string, number>;
            exploredColor: number;
            lightAnimations: Record<string, unknown>;
            lightLevels: {
                dark: number;
                dim: number;
                bright: number;
            };
            maxZoom: number;
            normalLightColor: number;
            objectBorderThickness: number;
            unexploredColor: number;
        };

        ChatMessage: {
            batchSize: number;
            collection: typeof Messages;
            documentClass: {
                new (
                    data: PreCreate<TChatMessage['data']['_source']>,
                    context?: DocumentConstructionContext<TChatMessage>,
                ): TChatMessage;
            };
            sidebarIcon: string;
            template: string;
        };

        /**
         * Configuration for the default Item entity class
         */
        Item: {
            documentClass: {
                new (data: PreCreate<TItem['data']['_source']>, context?: DocumentConstructionContext<TItem>): TItem;
            };
            collection: typeof Items;
            sheetClasses: Record<string, Record<string, typeof ItemSheet>>;
        };

        /** Configuration for the Combatant document */
        Combatant: {
            documentClass: new (
                data: PreCreate<TCombatant['data']['_source']>,
                context?: DocumentConstructionContext<TCombatant>,
            ) => TCombatant;
            sheetClass: typeof CombatantConfig;
        };

        /** Configuration for the Token embedded document type and its representation on the game Canvas */
        Token: {
            documentClass: new (
                data: PreCreate<TTokenDocument['data']['_source']>,
                context: DocumentConstructionContext<TTokenDocument>,
            ) => TTokenDocument;
            objectClass: new (...args: any[]) => TTokenDocument['object'];
            layerClass: typeof TokenLayer;
            sheetClass: typeof TokenConfig;
        };

        /** Configuration for the Combat document */
        Combat: {
            documentClass: {
                new (
                    data: PreCreate<TCombat['data']['_source']>,
                    context?: DocumentConstructionContext<TCombat>,
                ): TCombat;
            };
            collection: typeof CombatEncounters;
            defeatedStatusId: string;
            sidebarIcon: string;
            initiative: {
                formula: ((combatant: TCombatant) => string) | null;
                decimals: number;
            };
        };

        /** Configuration for dice rolling behaviors in the Foundry VTT client */
        Dice: {
            types: Array<typeof Die | typeof DiceTerm>;
            rollModes: Record<RollMode, string>;
            rolls: [typeof Roll];
            termTypes: Record<string, typeof DiceTerm>;
            terms: {
                c: Coin;
                d: Die;
                f: FateDie;
            };
            randomUniform: Function;
        };

        /** Configuration for the JournalEntry entity */
        JournalEntry: {
            documentClass: typeof JournalEntry;
            sheetClass: typeof JournalSheet;
            noteIcons: {
                Anchor: string;
                [key: string]: string;
            };
            sidebarIcon: string;
        };

        /** Configuration for the Macro document */
        Macro: {
            documentClass: {
                new (data: PreCreate<TMacro['data']['_source']>, context?: DocumentConstructionContext<TMacro>): TMacro;
            };
            collection: typeof Macros;
            sheetClass: typeof MacroConfig;
            sidebarIcon: string;
        };

        /** Configuration for Scene document */
        Scene: {
            documentClass: typeof Scene;
            collection: typeof Scenes;
            sheetClass: typeof SceneConfig;
            notesClass: any;
            sidebarIcon: string;
        };

        /** Configuration for the User document */
        User: {
            documentClass: typeof User;
            collection: typeof Users;
            // sheetClass: typeof UserConfig;
            permissions: undefined;
        };

        /** Configuration for the Playlist document */
        Playlist: {
            documentClass: typeof Playlist;
            sheetClass: typeof PlaylistConfig;
            sidebarIcon: string;
        };

        /** Configuration for RollTable random draws */
        RollTable: {
            documentClass: typeof RollTable;
            sheetClass: typeof RollTableConfig;
            sidebarIcon: string;
            resultIcon: string;
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
            [key: string]: string;
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
        TinyMCE: Omit<TinyMCE.EditorSettings, 'content_css' | 'style_formats'> & {
            content_css: string[];
            style_formats: NonNullable<TinyMCE.EditorSettings['style_formats']>;
        };

        ui: {
            actors: typeof ActorDirectory;
            chat: typeof ChatLog;
            combat: typeof CombatTracker;
            compendium: typeof CompendiumDirectory;
            controls: typeof SceneControls;
            hotbar: typeof Hotbar;
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
