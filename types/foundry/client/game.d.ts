import * as io from "socket.io";

declare global {
    const socket: io.Socket | null;
    const keyboard: KeyboardManager;

    /**
     * The core Game instance which encapsulates the data, settings, and states relevant for managing the game experience.
     * The singleton instance of the Game class is available as the global variable game.
     *
     * @param view      The named view which is active for this game instance.
     * @param data      An object of all the World data vended by the server when the client first connects
     * @param sessionId The ID of the currently active client session retrieved from the browser cookie
     * @param socket    The open web-socket which should be used to transact game-state data
     */
    class Game<
        TActor extends Actor<null>,
        TActors extends Actors<TActor>,
        TChatMessage extends ChatMessage,
        TCombat extends Combat,
        TItem extends Item<null>,
        TMacro extends Macro,
        TScene extends Scene,
        TUser extends User
    > {
        /**
         * The named view which is currently active.
         * Game views include: join, setup, players, license, game, stream
         */
        view: string;

        // Undocumented
        _documentsReady?: boolean;

        /** The object of world data passed from the server */
        data: {
            actors: TActor["_source"][];
            items: TItem["_source"][];
            macros: TMacro["_source"][];
            messages: TChatMessage["_source"][];
            packs: CompendiumMetadata[];
            tables: foundry.documents.RollTableSource[];
            users: TUser["_source"][];
            version: string;
        };

        /** The game World which is currently active */
        world: object;

        /** Localization support */
        i18n: Localization;

        /** The Keyboard Manager */
        keyboard: KeyboardManager;

        /** A mapping of installed modules */
        modules: Collection<{
            id: string;
            active: boolean;
            esmodules: Set<string>;
            scripts: Set<string>;
            flags: DocumentFlags;
            title: string;
            compatibility: {
                minimum?: string;
                verified?: string;
                maximum?: string;
            };
        }>;

        /** The user role permissions setting */
        permissions: Record<string, number[]>;

        /** The client session id which is currently active */
        sessionId: string;

        /** Client settings which are used to configure application behavior */
        settings: ClientSettings;

        /** Client keybindings which are used to configure application behavior */
        keybindings: ClientKeybindings;

        /** A reference to the open Socket.io connection */
        socket: io.Socket;

        /** A singleton GameTime instance which manages the progression of time within the game world. */
        time: GameTime;

        /** The id of the active game user */
        userId: string;

        /** A singleton instance of the Audio Helper class */
        audio: AudioHelper;

        /** A singleton instance of the Video Helper class */
        video: VideoHelper;

        /** A singleton instance of the TooltipManger class */
        tooltip: TooltipManager;

        /** A singleton instance of the Clipboard Helper class. */
        clipboard: ClipboardHelper;

        /** A singleton instance of the Tours class */
        tours: Tours;

        /** The global document index. */
        documentIndex: DocumentIndex;

        /** Whether the Game is running in debug mode */
        debug: boolean;

        /**
         * A flag for whether texture assets for the game canvas are currently loading
         */
        loading: boolean;

        /** A flag for whether the Game has successfully reached the "ready" hook */
        ready: boolean;

        /** The Release data for this version of Foundry */
        release: {
            build: number;
            channel: string;
            download: string;
            generation: number;
            node_version?: number;
            notes: string;
            suffix?: string;
            time: number;
        };

        /* -------------------------------------------- */
        /*  World Collections                           */
        /* -------------------------------------------- */

        actors: TActors;
        collections: Collection<
            WorldCollection<TActor | TItem | JournalEntry | TMacro | Playlist | RollTable | TScene>
        >;

        combats: CombatEncounters<TCombat>;
        folders: Folders<Folder>;
        items: Items<TItem>;
        journal: Journal;
        macros: Macros<TMacro>;
        messages: Messages<TChatMessage>;
        packs: Collection<CompendiumCollection<TActor | TItem | JournalEntry | TMacro | Playlist | RollTable | TScene>>;
        playlists: Playlists;
        scenes: Scenes<TScene>;
        tables: RollTables;
        users: Users<TUser>;

        constructor(view: string, worldData: {}, sessionId: string, socket: io.Socket);

        /** Returns the current version of the Release, usable for comparisons using isNewerVersion */
        get version(): string;

        /**
         * Fetch World data and return a Game instance
         * @return A Promise which resolves to the created Game instance
         */
        static create(): Promise<
            Game<Actor<null>, Actors<Actor<null>>, ChatMessage, Combat, Item<null>, Macro, Scene, User>
        >;

        /** Request World data from server and return it */
        static getWorldData(socket: io.Socket): Promise<object>;

        /** Request setup data from server and return it */
        static getSetupData(socket: io.Socket): Promise<object>;

        /** Initialize the Game for the current window location */
        initialize(): Promise<void>;

        /** Fully set up the game state, initializing Entities, UI applications, and the Canvas */
        setupGame(): Promise<void>;

        /** Initialize game state data by creating Collections for all Entity types */
        initializeEntities(): void;

        /** Initialization actions for compendium packs */
        initializePacks(config: object): Promise<void>;

        /** Initialize the WebRTC implementation */
        initializeRTC(): void;

        /** Initialize core UI elements */
        initializeUI(): void;

        /** Initialize the game Canvas */
        initializeCanvas(): Promise<void>;

        /** Initialize Keyboard controls */
        initializeKeyboard(): void;

        /** Initialize Mouse controls */
        initializeMouse(): void;

        /**
         * Register core game settings
         */
        registerSettings(): void;

        /** The currently connected User */
        get user(): Active<TUser>;

        /**
         * Metadata regarding the game System which powers this World
         */
        get system(): {
            id: string;
            version: string;
            gridUnits: string;
            data: {
                authors: string[];
                availability: number;
                bugs: string;
                changelog: string;
                compatibleCoreVersion: string;
                description: string;
                download: string;
                esmodules: string[];
                gridDistance: number;
                initiative: string;
                keywords: string[];
                languages: {
                    lang: string;
                    name: string;
                    path: string;
                }[];
                license: string;
                manifest: string;
                minimumCoreVersion: string;
                name: string;
                packs: {
                    entity: CompendiumDocumentType;
                    label: string;
                    module: string;
                    name: string;
                    path: string;
                    system: string;
                }[];
                readme: string;
                schema: number;
                scripts: string[];
                socket: boolean;
                styles: string[];
                templateVersion: number;
                title: string;
                unavailable: boolean;
                url: string;
            };
            documentTypes: {
                Actor: string[];
                ChatMessage: string[];
                Combat: string[];
                Folder: string[];
                Item: string[];
                JournalEntry: string[];
                Macro: ["chat", "script"];
                Playlist: string[];
                RollTable: string[];
                Scene: string[];
                User: string[];
            };
            model: {
                Actor: Record<string, object>;
                Item: Record<string, object>;
            };
        };

        /** A convenience accessor for the currently active Combat encounter */
        get combat(): TCombat | null;

        /**
         * A state variable which tracks whether or not the game session is currently paused
         */
        get paused(): boolean;

        /**
         * A convenient reference to the currently active canvas tool
         */
        get activeTool(): string;

        /**
         * Toggle the pause state of the game
         * Trigger the `pauseGame` Hook when the paused state changes
         * @param pause The new pause state
         * @param push  Push the pause state change to other connected clients?
         */
        togglePause(pause: boolean, push?: boolean): void;

        static getCookies(): object;

        static clearCookies(): boolean;

        /**
         * Open socket listeners which transact game state data
         */
        openSockets(): void;

        /**
         * General game-state socket listeners and event handlers
         */
        static socketListeners(socket: io.Socket): void;

        /**
         * Activate Event Listeners which apply to every Game View
         */
        activateListeners(): void;
    }
}
