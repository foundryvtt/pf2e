import {
    Actor,
    ChatMessage,
    Combat,
    Item,
    JournalEntry,
    Macro,
    Playlist,
    RollTable,
    Scene,
    User,
} from "./documents/_module.mjs";
import WorldCollection from "./documents/abstract/world-collection.mjs";
import * as collections from "./documents/collections/_module.mjs";
import { CompendiumMetadata } from "./documents/collections/compendium-collection.mjs";
import * as helpers from "./helpers/_module.mjs";
import * as packages from "./packages/_module.mjs";
import { Collection } from "./utils/_module.mjs";

/**
 * The core Game instance which encapsulates the data, settings, and states relevant for managing the game experience.
 * The singleton instance of the Game class is available as the global variable game.
 *
 * @param view      The named view which is active for this game instance.
 * @param data      An object of all the World data vended by the server when the client first connects
 * @param sessionId The ID of the currently active client session retrieved from the browser cookie
 * @param socket    The open web-socket which should be used to transact game-state data
 */
export default class Game<
    TActor extends Actor<null>,
    TActors extends collections.Actors<TActor>,
    TChatMessage extends ChatMessage,
    TCombat extends Combat,
    TItem extends Item<null>,
    TMacro extends Macro,
    TScene extends Scene,
    TUser extends User,
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
    world: {
        id: string;
        title: string;
    };

    /** Localization support */
    i18n: helpers.Localization;

    /** The Keyboard Manager */
    keyboard: helpers.interaction.KeyboardManager;

    /** A mapping of installed modules */
    modules: Collection<string, packages.Module>;

    /** The user role permissions setting */
    permissions: Record<string, number[]>;

    /** The client session id which is currently active */
    sessionId: string;

    /** Client settings which are used to configure application behavior */
    settings: helpers.ClientSettings;

    /** Client keybindings which are used to configure application behavior */
    keybindings: helpers.interaction.ClientKeybindings;

    /** A reference to the open Socket.io connection */
    socket: io.Socket;

    /** A singleton GameTime instance which manages the progression of time within the game world. */
    time: helpers.GameTime;

    /** The id of the active game user */
    userId: string;

    /* -------------------------------------------- */
    /*  Helper Classes                              */
    /* -------------------------------------------- */

    /** The singleton compendium art manager. */
    compendiumArt: helpers.media.CompendiumArt;

    /** A singleton instance of the Audio Helper class */
    audio: foundry.audio.AudioHelper;

    /** A singleton instance of the Video Helper class */
    video: helpers.media.VideoHelper;

    /** A singleton instance of the TooltipManger class */
    tooltip: helpers.interaction.TooltipManager;

    /** A singleton instance of the Clipboard Helper class. */
    clipboard: helpers.interaction.ClipboardHelper;

    /** A singleton instance of the Tours class */
    tours: foundry.nue.ToursCollection;

    /** The global document index. */
    documentIndex: helpers.DocumentIndex;

    documentTypes: Record<string, string[]>;

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
        string,
        WorldCollection<TActor | TItem | JournalEntry | TMacro | Playlist | RollTable | TScene>
    >;

    combats: collections.CombatEncounters<TCombat>;
    folders: collections.Folders;
    items: collections.Items<TItem>;
    journal: collections.Journal;
    macros: collections.Macros<TMacro>;
    messages: collections.Messages<TChatMessage>;
    packs: Collection<
        string,
        collections.CompendiumCollection<TActor | TItem | JournalEntry | TMacro | Playlist | RollTable | TScene>
    >;
    playlists: collections.Playlists;
    scenes: collections.Scenes<TScene>;
    tables: collections.RollTables;
    users: collections.Users<TUser>;

    constructor(view: string, worldData: object, sessionId: string, socket: io.Socket);

    /** Returns the current version of the Release, usable for comparisons using isNewerVersion */
    get version(): string;

    /**
     * Fetch World data and return a Game instance
     * @return A Promise which resolves to the created Game instance
     */
    static create(): Promise<
        Game<Actor<null>, collections.Actors<Actor<null>>, ChatMessage, Combat, Item<null>, Macro, Scene, User>
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

    /** Register core game settings */
    registerSettings(): void;

    /** The currently connected User */
    get user(): TUser & { active: true };

    /** Metadata regarding the game System which powers this World */
    get system(): packages.System;

    /** A convenience accessor for the currently active Combat encounter */
    get combat(): TCombat | null;

    /** A state variable which tracks whether or not the game session is currently paused */
    get paused(): boolean;

    /** A convenient reference to the currently active canvas tool */
    get activeTool(): string;

    /** An alias for the structured data model organized by document class and type. */
    get model(): Record<"Actor" | "Card" | "Cards" | "Item" | "JournalEntryPage", object>;

    /**
     * Toggle the pause state of the game
     * Trigger the `pauseGame` Hook when the paused state changes
     * @param pause The new pause state
     * @param push  Push the pause state change to other connected clients?
     */
    togglePause(pause: boolean, push?: boolean): void;

    static getCookies(): object;

    static clearCookies(): boolean;

    /** Open socket listeners which transact game state data */
    openSockets(): void;

    /** General game-state socket listeners and event handlers */
    static socketListeners(socket: io.Socket): void;

    /** Activate Event Listeners which apply to every Game View */
    activateListeners(): void;
}
