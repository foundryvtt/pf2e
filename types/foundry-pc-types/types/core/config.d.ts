// @TODO: Assign class types

declare interface Config<
    ActorType extends Actor,
    ItemType extends Item,
EffectType extends ActiveEffect<ActorType | ItemType>,
MessageType extends ChatMessage<ActorType>
> {
    /**
     * Configure debugging flags to display additional information
     */
    debug: {
        hooks: boolean;
        sight: boolean;
    };

    /**
     * Configuration for the default Actor entity class
     */
    Actor: {
        entityClass: { new (data: ActorType['data'], options?: EntityConstructorOptions): ActorType };
        collection: Actors<ActorType>;
        sheetClasses: Record<string, Record<string, typeof ActorSheet>>;
    };

    /**
     * Configuration for the ActiveEffect embedded Entity
     */
    ActiveEffect: {
        entityClass: { new (data: EffectType['data'], parent: ActorType | ItemType): EffectType };
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
        entityClass: { new (data: ChatMessageData, options?: EntityConstructorOptions): MessageType };
        sidebarIcon: string;
        template: string;
    };

    /**
     * Configuration for the default Item entity class
     */
    Item: {
        entityClass: { new (data: ItemType['data'], options?: ItemConstructorOptions<ActorType>): ItemType };
        collection: Items<ItemType>;
        sheetClasses: Record<string, Record<string, typeof ItemSheet>>;
    };

    /**
     * Configuration for the default Combat entity class
     */
    Combat: {
        entityClass: { new (data: CombatData<ActorType>, options?: EntityConstructorOptions): Combat<ActorType> };
        collection: typeof CombatEncounters;
        initiative: {
            decimals: number;
            formula: ((combatant: CombatantData<ActorType>) => string) | null;
        };
    };

    /**
     * Configuration for the JournalEntry entity
     */
    JournalEntry: {
        entityClass: typeof JournalEntry;
        sheetClass: typeof JournalSheet;
        noteIcons: {
            Anchor: string;
            [key: string]: string;
        };
        sidebarIcon: string;
    };

    /**
     * Configuration for the default Scene entity class
     */
    Scene: {
        entityClass: typeof Scene;
        collection: Scenes;
        sheetClass: any;
        notesClass: any;
        sidebarIcon: string;
    };

    /**
     * Configuration for the default Playlist entity class
     */
    Playlist: {
        entityClass: typeof Playlist;
        sheetClass: typeof PlaylistConfig;
        sidebarIcon: string;
    };

    /**
     * Configuration for RollTable random draws
     */
    RollTable: {
        entityClass: typeof RollTable;
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
        dice: string;
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

    [key: string]: any;
}
