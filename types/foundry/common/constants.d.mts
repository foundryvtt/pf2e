/**
 * Constant definitions used throughout the Foundry Virtual Tabletop framework.
 * @module CONST
 */

import * as data from "./data/data.mjs";

/** The shortened software name */
export const vtt: "Foundry VTT";

/** The full software name */
export const VTT: "Foundry Virtual Tabletop";

/** The software website URL */
export const WEBSITE_URL: "https://foundryvtt.com";

/** The serverless API URL */
export const WEBSITE_API_URL: "https://api.foundryvtt.com";

/** An ASCII greeting displayed to the client */
export const ASCII: string;

/**
 * Define the allowed ActiveEffect application modes.
 * Other arbitrary mode numbers can be used by systems and modules to identify special behaviors and are ignored
 */
export const ACTIVE_EFFECT_MODES: Readonly<{
    /** Used to denote that the handling of the effect is programmatically provided by a system or module. */
    CUSTOM: 0;

    /**
     * Multiplies a numeric base value by the numeric effect value
     * @example
     * 2 (base value) * 3 (effect value) = 6 (derived value)
     */
    MULTIPLY: 1;

    /**
     * Adds a numeric base value to a numeric effect value, or concatenates strings
     * @example
     * 2 (base value) + 3 (effect value) = 5 (derived value)
     * @example
     * "Hello" (base value) + " World" (effect value) = "Hello World"
     */
    ADD: 2;

    /**
     * Keeps the lower value of the base value and the effect value
     * @example
     * 2 (base value), 0 (effect value) = 0 (derived value)
     * @example
     * 2 (base value), 3 (effect value) = 2 (derived value)
     */
    DOWNGRADE: 3;

    /**
     * Keeps the greater value of the base value and the effect value
     * @example
     * 2 (base value), 4 (effect value) = 4 (derived value)
     * @example
     * 2 (base value), 1 (effect value) = 2 (derived value)
     */
    UPGRADE: 4;

    /**
     * Directly replaces the base value with the effect value
     * @example
     * 2 (base value), 4 (effect value) = 4 (derived value)
     */
    OVERRIDE: 5;
}>;

export type ActiveEffectChangeMode = (typeof ACTIVE_EFFECT_MODES)[keyof typeof ACTIVE_EFFECT_MODES];

/**
 * Define the string name used for the base document type when specific sub-types are not defined by the system
 */
export const BASE_DOCUMENT_TYPE: "base";

/**
 * Define the methods by which a Card can be drawn from a Cards stack
 */
export const CARD_DRAW_MODES: Readonly<{
    /**
     * Draw the first card from the stack
     * Synonymous with {@link CARD_DRAW_MODES.TOP}
     */
    FIRST: 0;
    /**
     * Draw the top card from the stack
     * Synonymous with {@link CARD_DRAW_MODES.FIRST}
     */
    TOP: 0;
    /**
     * Draw the last card from the stack
     * Synonymous with {@link CARD_DRAW_MODES.BOTTOM}
     */
    LAST: 1;
    /**
     * Draw the bottom card from the stack
     * Synonymous with {@link CARD_DRAW_MODES.LAST}
     */
    BOTTOM: 1;
    /**
     * Draw a random card from the stack
     */
    RANDOM: 2;
}>;

/**
 * An enumeration of canvas performance modes.
 */
export const CANVAS_PERFORMANCE_MODES: Readonly<{
    LOW: 0;
    MED: 1;
    HIGH: 2;
    MAX: 3;
}>;

export type CanvasPerformanceMode = (typeof CANVAS_PERFORMANCE_MODES)[keyof typeof CANVAS_PERFORMANCE_MODES];

/**
 * Valid Chat Message styles which affect how the message is presented in the chat log.
 */
export const CHAT_MESSAGE_STYLES: Readonly<{
    /**
     * An uncategorized chat message
     */
    OTHER: 0;
    /**
     * The message is spoken out of character (OOC).
     * OOC messages will be outlined by the player's color to make them more easily recognizable.
     */
    OOC: 1;
    /**
     * The message is spoken by an associated character.
     */
    IC: 2;
    /**
     * The message is an emote performed by the selected character.
     * Entering "/emote waves his hand." while controlling a character named Simon will send the message, "Simon waves his hand."
     */
    EMOTE: 3;
}>;

export type ChatMessageStyle = (typeof CHAT_MESSAGE_STYLES)[keyof typeof CHAT_MESSAGE_STYLES];

/**
 * Define the set of languages which have built-in support in the core software
 */
export const C: readonly ["en"];

/**
 * Configure the severity of compatibility warnings.
 */
export const COMPATIBILITY_MODES: Readonly<{
    /**
     * Nothing will be logged
     */
    SILENT: 0;
    /**
     * A message will be logged at the "warn" level
     */
    WARNING: 1;
    /**
     * A message will be logged at the "error" level
     */
    ERROR: 2;
    /**
     * An Error will be thrown
     */
    FAILURE: 3;
}>;

export type CompatibilityMode = (typeof COMPATIBILITY_MODES)[keyof typeof COMPATIBILITY_MODES];

/**
 * Configure custom cursor images to use when interacting with the application.
 */
export const CURSOR_STYLES: Readonly<{
    default: "default";
    "default-down": "default";
    pointer: "pointer";
    "pointer-down": "pointer";
    grab: "grab";
    "grab-down": "grabbing";
    text: "text";
    "text-down": "text";
}>;

/**
 * The lighting illumination levels which are supported.
 */
export const LIGHTING_LEVELS: Readonly<{
    DARKNESS: -2;
    HALFDARK: -1;
    UNLIT: 0;
    DIM: 1;
    BRIGHT: 2;
    BRIGHTEST: 3;
}>;

export type LightingLevel = (typeof LIGHTING_LEVELS)[keyof typeof LIGHTING_LEVELS];

/**
 * The CSS themes which are currently supported for the V11 Setup menu.
 */
export const CSS_THEMES: Readonly<{
    dark: "THEME.foundry";
    fantasy: "THEME.fantasy";
    scifi: "THEME.scifi";
}>;

/**
 * The default artwork used for Token images if none is provided
 */
export const DEFAULT_TOKEN: "icons/svg/mystery-man.svg";

/**
 * The primary Document types.
 */
export const PRIMARY_DOCUMENT_TYPES: readonly [
    "Actor",
    "Adventure",
    "Cards",
    "ChatMessage",
    "Combat",
    "FogExploration",
    "Folder",
    "Item",
    "JournalEntry",
    "Macro",
    "Playlist",
    "RollTable",
    "Scene",
    "Setting",
    "User",
];

/**
 * The embedded Document types.
 */
export const EMBEDDED_DOCUMENT_TYPES: readonly [
    "ActiveEffect",
    "ActorDelta",
    "AmbientLight",
    "AmbientSound",
    "Card",
    "Combatant",
    "CombatantGroup",
    "Drawing",
    "Item",
    "JournalEntryCategory",
    "JournalEntryPage",
    "MeasuredTemplate",
    "Note",
    "PlaylistSound",
    "Region",
    "RegionBehavior",
    "TableResult",
    "Tile",
    "Token",
    "Wall",
];

/**
 * A listing of all valid Document types, both primary and embedded.
 */
export const ALL_DOCUMENT_TYPES: readonly [
    "ActiveEffect",
    "Actor",
    "ActorDelta",
    "Adventure",
    "AmbientLight",
    "AmbientSound",
    "Card",
    "Cards",
    "ChatMessage",
    "Combat",
    "Combatant",
    "CombatantGroup",
    "Drawing",
    "FogExploration",
    "Folder",
    "Item",
    "JournalEntry",
    "JournalEntryCategory",
    "JournalEntryPage",
    "Macro",
    "MeasuredTemplate",
    "Note",
    "Playlist",
    "PlaylistSound",
    "Region",
    "RegionBehavior",
    "RollTable",
    "Scene",
    "Setting",
    "TableResult",
    "Tile",
    "Token",
    "User",
    "Wall",
];

export type DocumentType = (typeof ALL_DOCUMENT_TYPES)[number];

/**
 * The allowed primary Document types which may exist within a World.
 */
export const WORLD_DOCUMENT_TYPES: readonly [
    "Actor",
    "Cards",
    "ChatMessage",
    "Combat",
    "FogExploration",
    "Folder",
    "Item",
    "JournalEntry",
    "Macro",
    "Playlist",
    "RollTable",
    "Scene",
    "Setting",
    "User",
];

export type WorldDocumentType = (typeof WORLD_DOCUMENT_TYPES)[number];

/**
 * The allowed primary Document types which may exist within a Compendium pack.
 * @type {string[]}
 */
export const COMPENDIUM_DOCUMENT_TYPES: readonly [
    "Actor",
    "Adventure",
    "Cards",
    "Item",
    "JournalEntry",
    "Macro",
    "Playlist",
    "RollTable",
    "Scene",
];

/**
 * Define the allowed ownership levels for a Document.
 * Each level is assigned a value in ascending order.
 * Higher levels grant more permissions.
 * @see https://foundryvtt.com/article/users/
 */
export const DOCUMENT_OWNERSHIP_LEVELS: Readonly<{
    /**
     * The User inherits permissions from the parent Folder.
     */
    INHERIT: -1;
    /**
     * Restricts the associated Document so that it may not be seen by this User.
     */
    NONE: 0;
    /**
     * Allows the User to interact with the Document in basic ways, allowing them to see it in sidebars and see only limited aspects of its contents. The limits of this interaction are defined by the game system being used.
     */
    LIMITED: 1;
    /**
     * Allows the User to view this Document as if they were owner, but prevents them from making any changes to it.
     */
    OBSERVER: 2;
    /**
     * Allows the User to view and make changes to the Document as its owner. Owned documents cannot be deleted by anyone other than a gamemaster level User.
     */
    OWNER: 3;
}>;

export type DocumentOwnershipString = keyof typeof DOCUMENT_OWNERSHIP_LEVELS;
export type DocumentOwnershipLevel = (typeof DOCUMENT_OWNERSHIP_LEVELS)[DocumentOwnershipString];

/**
 * Meta ownership levels that are used in the UI but never stored.
 */
export const DOCUMENT_META_OWNERSHIP_LEVELS: Readonly<{
    DEFAULT: -20;
    NOCHANGE: -10;
}>;

/**
 * Define the allowed Document types which may be dynamically linked in chat
 */
export const DOCUMENT_LINK_TYPES: readonly [
    "Actor",
    "Cards",
    "Item",
    "Scene",
    "JournalEntry",
    "Macro",
    "RollTable",
    "PlaylistSound",
];

/**
 * The supported dice roll visibility modes
 * @see https://foundryvtt.com/article/dice/
 */
export const DICE_ROLL_MODES: Readonly<{
    /**
     * This roll is visible to all players.
     */
    PUBLIC: "publicroll";
    /**
     * Rolls of this type are only visible to the player that rolled and any Game Master users.
     */
    PRIVATE: "gmroll";
    /**
     * A private dice roll only visible to Game Master users. The rolling player will not see the result of their own roll.
     */
    BLIND: "blindroll";
    /**
     * A private dice roll which is only visible to the user who rolled it.
     */
    SELF: "selfroll";
}>;

export type RollMode = (typeof DICE_ROLL_MODES)[keyof typeof DICE_ROLL_MODES];

/**
 * The allowed fill types which a Drawing object may display
 * @see https://foundryvtt.com/article/drawings/
 */
export const DRAWING_FILL_TYPES: Readonly<{
    /**
     * The drawing is not filled
     */
    NONE: 0;
    /**
     * The drawing is filled with a solid color
     */
    SOLID: 1;
    /**
     * The drawing is filled with a tiled image pattern
     */
    PATTERN: 2;
}>;

export type DrawingFillType = (typeof DRAWING_FILL_TYPES)[keyof typeof DRAWING_FILL_TYPES];

/**
 * Define the allowed Document types which Folders may contain
 */
export const FOLDER_DOCUMENT_TYPES: readonly [
    "Actor",
    "Adventure",
    "Item",
    "Scene",
    "JournalEntry",
    "Playlist",
    "RollTable",
    "Cards",
    "Macro",
    "Compendium",
];

export type FolderDocumentType = (typeof FOLDER_DOCUMENT_TYPES)[number];

/**
 * The maximum allowed level of depth for Folder nesting
 */
export const FOLDER_MAX_DEPTH: 4;
/**
 * A list of allowed game URL names
 */
export const GAME_VIEWS: readonly ["game", "stream"];

/**
 * The directions of movement.
 */
export const MOVEMENT_DIRECTIONS: Readonly<{
    UP: 1;
    DOWN: 2;
    LEFT: 4;
    RIGHT: 8;
    UP_LEFT: 5;
    UP_RIGHT: 5;
    DOWN_LEFT: 9;
    DOWN_RIGHT: 10;
    DESCEND: 16;
    ASCEND: 32;
}>;

export type MovementDirection = (typeof MOVEMENT_DIRECTIONS)[keyof typeof MOVEMENT_DIRECTIONS];

/**
 * The minimum allowed grid size which is supported by the software
 */
export const GRID_MIN_SIZE: 20;

/**
 * The allowed Grid types which are supported by the software
 * @see https://foundryvtt.com/article/scenes/
 */
export const GRID_TYPES: Readonly<{
    /**
     * No fixed grid is used on this Scene allowing free-form point-to-point measurement without grid lines.
     */
    GRIDLESS: 0;
    /**
     * A square grid is used with width and height of each grid space equal to the chosen grid size.
     */
    SQUARE: 1;
    /**
     * A row-wise hexagon grid (pointy-topped) where odd-numbered rows are offset.
     */
    HEXODDR: 2;
    /**
     * A row-wise hexagon grid (pointy-topped) where even-numbered rows are offset.
     */
    HEXEVENR: 3;
    /**
     * A column-wise hexagon grid (flat-topped) where odd-numbered columns are offset.
     */
    HEXODDQ: 4;
    /**
     * A column-wise hexagon grid (flat-topped) where even-numbered columns are offset.
     */
    HEXEVENQ: 5;
}>;

export type GridType = (typeof GRID_TYPES)[keyof typeof GRID_TYPES];

/**
 * The different rules to define and measure diagonal distance/cost in a square grid.
 * The description of each option refers to the distance/cost of moving diagonally relative to the distance/cost of a horizontal or vertical move.
 */
export const GRID_DIAGONALS: Readonly<{
    /**
     * The diagonal distance is 1. Diagonal movement costs the same as horizontal/vertical movement.
     */
    EQUIDISTANT: 0;
    /**
     * The diagonal distance is √2. Diagonal movement costs √2 times as much as horizontal/vertical movement.
     */
    EXACT: 1;
    /**
     * The diagonal distance is 1.5. Diagonal movement costs 1.5 times as much as horizontal/vertical movement.
     */
    APPROXIMATE: 2;
    /**
     * The diagonal distance is 2. Diagonal movement costs 2 times as much as horizontal/vertical movement.
     */
    RECTILINEAR: 3;
    /**
     * The diagonal distance alternates between 1 and 2 starting at 1.
     * The first diagonal movement costs the same as horizontal/vertical movement
     * The second diagonal movement costs 2 times as much as horizontal/vertical movement.
     * And so on...
     */
    ALTERNATING_1: 4;
    /**
     * The diagonal distance alternates between 2 and 1 starting at 2.
     * The first diagonal movement costs 2 times as much as horizontal/vertical movement.
     * The second diagonal movement costs the same as horizontal/vertical movement.
     * And so on...
     */
    ALTERNATING_2: 5;
    /**
     * The diagonal distance is ∞. Diagonal movement is not allowed/possible.
     */
    ILLEGAL: 6;
}>;

export type GridDiagonalRule = (typeof GRID_DIAGONALS)[keyof typeof GRID_DIAGONALS];

/**
 * The grid snapping modes.
 */
export const GRID_SNAPPING_MODES: Readonly<{
    /**
     * Nearest center point.
     */
    CENTER: 1;
    /**
     * Nearest edge midpoint.
     */
    EDGE_MIDPOINT: 2;
    /**
     * Nearest top-left vertex.
     */
    TOP_LEFT_VERTEX: 16;
    /**
     * Nearest top-right vertex.
     */
    TOP_RIGHT_VERTEX: 32;
    /**
     * Nearest bottom-left vertex.
     */
    BOTTOM_LEFT_VERTEX: 64;
    /**
     * Nearest bottom-right vertex.
     */
    BOTTOM_RIGHT_VERTEX: 128;
    /**
     * Nearest vertex.
     * Alias for `TOP_LEFT_VERTEX | TOP_RIGHT_VERTEX | BOTTOM_LEFT_VERTEX | BOTTOM_RIGHT_VERTEX`.
     */
    VERTEX: 240;
    /**
     * Nearest top-left corner.
     */
    TOP_LEFT_CORNER: 256;
    /**
     * Nearest top-right corner.
     */
    TOP_RIGHT_CORNER: 512;
    /**
     * Nearest bottom-left corner.
     */
    BOTTOM_LEFT_CORNER: 1024;
    /**
     * Nearest bottom-right corner.
     */
    BOTTOM_RIGHT_CORNER: 2048;
    /**
     * Nearest corner.
     * Alias for `TOP_LEFT_CORNER | TOP_RIGHT_CORNER | BOTTOM_LEFT_CORNER | BOTTOM_RIGHT_CORNER`.
     */
    CORNER: 3840;
    /**
     * Nearest top side midpoint.
     */
    TOP_SIDE_MIDPOINT: 4096;
    /**
     * Nearest bottom side midpoint.
     */
    BOTTOM_SIDE_MIDPOINT: 8192;
    /**
     * Nearest left side midpoint.
     */
    LEFT_SIDE_MIDPOINT: 16384;
    /**
     * Nearest right side midpoint.
     */
    RIGHT_SIDE_MIDPOINT: 32768;
    /**
     * Nearest side midpoint.
     * Alias for `TOP_SIDE_MIDPOINT | BOTTOM_SIDE_MIDPOINT | LEFT_SIDE_MIDPOINT | RIGHT_SIDE_MIDPOINT`.
     */
    SIDE_MIDPOINT: 61440;
}>;

export type GridSnappingMode = (typeof GRID_SNAPPING_MODES)[keyof typeof GRID_SNAPPING_MODES];

/**
 * A list of supported setup URL names
 */
export const SETUP_VIEWS: readonly ["auth", "license", "setup", "players", "join", "update"];

/**
 * An Array of valid MacroAction scope values
 */
export const MACRO_SCOPES: readonly ["global", "actors", "actor"];

export type MacroScope = (typeof MACRO_SCOPES)[number];

/**
 * An enumeration of valid Macro types
 * @see https://foundryvtt.com/article/macros/
 */
export const MACRO_TYPES: Readonly<{
    /**
     * Complex and powerful macros which leverage the FVTT API through plain JavaScript to perform functions as simple or as advanced as you can imagine.
     */
    SCRIPT: "script";
    /**
     * Simple and easy to use, chat macros post pre-defined chat messages to the chat log when executed. All users can execute chat macros by default.
     */
    CHAT: "chat";
}>;

export type MacroType = (typeof MACRO_TYPES)[keyof typeof MACRO_TYPES];

/**
 * The allowed channels for audio playback.
 */
export const AUDIO_CHANNELS: Readonly<{
    music: "AUDIO.CHANNELS.MUSIC.label";
    environment: "AUDIO.CHANNELS.ENVIRONMENT.label";
    interface: "AUDIO.CHANNELS.INTERFACE.label";
}>;

/**
 * The allowed playback modes for an audio Playlist
 * @see https://foundryvtt.com/article/playlists/
 */
export const PLAYLIST_MODES: Readonly<{
    /**
     * The playlist does not play on its own, only individual Sound tracks played as a soundboard.
     */
    DISABLED: -1;
    /**
     * The playlist plays sounds one at a time in sequence.
     */
    SEQUENTIAL: 0;
    /**
     * The playlist plays sounds one at a time in randomized order.
     */
    SHUFFLE: 1;
    /**
     * The playlist plays all contained sounds at the same time.
     */
    SIMULTANEOUS: 2;
}>;

export type PlaylistMode = (typeof PLAYLIST_MODES)[keyof typeof PLAYLIST_MODES];

/**
 * The available sort modes for an audio Playlist.
 * @see https://foundryvtt.com/article/playlists/
 */
export const PLAYLIST_SORT_MODES: Readonly<{
    /**
     * Sort sounds alphabetically.
     * @defaultValue
     */
    ALPHABETICAL: "a";
    /**
     * Sort sounds by manual drag-and-drop.
     */
    MANUAL: "m";
}>;

export type PlaylistSortMode = "a" | "m";

/**
 * The available modes for searching within a DirectoryCollection
 */
export const DIRECTORY_SEARCH_MODES: Readonly<{
    FULL: "full";
    NAME: "name";
}>;

export type DirectorySearchMode = "full" | "name";

/**
 * The allowed package types
 */
export const PACKAGE_TYPES: readonly ["world", "system", "module"];

export type PackageType = (typeof PACKAGE_TYPES)[number];

/**
 * Encode the reasons why a package may be available or unavailable for use
 */
export const PACKAGE_AVAILABILITY_CODES: Readonly<{
    /**
     * Package availability could not be determined
     */
    UNKNOWN: 0;
    /**
     * The Package is verified to be compatible with the current core software build
     */
    VERIFIED: 1;
    /**
     * Package is available for use, but not verified for the current core software build
     */
    UNVERIFIED_BUILD: 2;
    /**
     * One or more installed system is incompatible with the Package.
     */
    UNVERIFIED_SYSTEM: 3;
    /**
     * Package is available for use, but not verified for the current core software generation
     */
    UNVERIFIED_GENERATION: 4;
    /**
     * The System that the Package relies on is not available
     */
    MISSING_SYSTEM: 5;
    /**
     * A dependency of the Package is not available
     */
    MISSING_DEPENDENCY: 6;
    /**
     * The Package is compatible with an older version of Foundry than the currently installed version
     */
    REQUIRES_CORE_DOWNGRADE: 7;
    /**
     * The Package is compatible with a newer version of Foundry than the currently installed version, and that version is Stable
     */
    REQUIRES_CORE_UPGRADE_STABLE: 8;
    /**
     * The Package is compatible with a newer version of Foundry than the currently installed version, and that version is not yet Stable
     */
    REQUIRES_CORE_UPGRADE_UNSTABLE: 9;
    /**
     * A required dependency is not compatible with the current version of Foundry
     */
    REQUIRES_DEPENDENCY_UPDATE: 10;
}>;

export type PackageAvailabilityCode = (typeof PACKAGE_AVAILABILITY_CODES)[keyof typeof PACKAGE_AVAILABILITY_CODES];

/**
 * A safe password string which can be displayed
 */
export const PASSWORD_SAFE_STRING: "••••••••••••••••";

/**
 * The allowed software update channels
 */
export const SOFTWARE_UPDATE_CHANNELS: Readonly<{
    /**
     * The Stable release channel
     */
    stable: "SETUP.UpdateStable";
    /**
     * The User Testing release channel
     */
    testing: "SETUP.UpdateTesting";
    /**
     * The Development release channel
     */
    development: "SETUP.UpdateDevelopment";
    /**
     * The Prototype release channel
     */
    prototype: "SETUP.UpdatePrototype";
}>;

export type SoftwareUpdateChannel = keyof typeof SOFTWARE_UPDATE_CHANNELS;

/**
 * The default sorting density for manually ordering child objects within a parent
 */
export const SORT_INTEGER_DENSITY: 100000;
/**
 * The allowed types of a TableResult document
 * @see https://foundryvtt.com/article/roll-tables/
 */
export const TABLE_RESULT_TYPES: Readonly<{
    /**
     *  Plain text or HTML scripted entries which will be output to Chat.
     */
    TEXT: "text";
    /**
     * An in-World Document reference which will be linked to in the chat message.
     */
    DOCUMENT: "document";
}>;

export type TableResultType = (typeof TABLE_RESULT_TYPES)[keyof typeof TABLE_RESULT_TYPES];

/**
 * The allowed formats of a Journal Entry Page.
 * @see https://foundryvtt.com/article/journal/
 */
export const JOURNAL_ENTRY_PAGE_FORMATS: Readonly<{
    /**
     * The page is formatted as HTML.
     */
    HTML: 1;
    /**
     * The page is formatted as Markdown.
     */
    MARKDOWN: 2;
}>;

export type JournalEntryPageFormat = (typeof JOURNAL_ENTRY_PAGE_FORMATS)[keyof typeof JOURNAL_ENTRY_PAGE_FORMATS];

/**
 * Define the valid anchor locations for a Tooltip displayed on a Placeable Object
 * @see {@link foundry.helpers.interaction.TooltipManager}
 */
export const TEXT_ANCHOR_POINTS: Readonly<{
    /**
     * Anchor the tooltip to the center of the element.
     */
    CENTER: 0;
    /**
     * Anchor the tooltip to the bottom of the element.
     */
    BOTTOM: 1;
    /**
     * Anchor the tooltip to the top of the element.
     */
    TOP: 2;
    /**
     * Anchor the tooltip to the left of the element.
     */
    LEFT: 3;
    /**
     * Anchor the tooltip to the right of the element.
     */
    RIGHT: 4;
}>;

export type TextAnchorPoint = (typeof TEXT_ANCHOR_POINTS)[keyof typeof TEXT_ANCHOR_POINTS];

/**
 * Define the valid occlusion modes which a tile can use
 * @see https://foundryvtt.com/article/tiles/
 */
export const OCCLUSION_MODES: Readonly<{
    /**
     * Turns off occlusion, making the tile never fade while tokens are under it.
     */
    NONE: 0;
    /**
     * Causes the whole tile to fade when an actor token moves under it.
     * @defaultValue
     */
    FADE: 1;
    /**
     * Causes the tile to reveal the background in the vicinity of an actor token under it. The radius is determined by the token's size.
     */
    RADIAL: 3;
    /**
     * Causes the tile to be partially revealed based on the vision of the actor, which does not need to be under the tile to see what's beneath it.
     *
     * @remarks
     * This is useful for rooves on buildings where players could see through a window or door, viewing only a portion of what is obscured by the roof itself.
     */
    VISION: 4;
}>;

/**
 * Alias for old tile occlusion modes definition
 */
export const TILE_OCCLUSION_MODES: Readonly<{
    /**
     * Turns off occlusion, making the tile never fade while tokens are under it.
     */
    NONE: 0;
    /**
     * Causes the whole tile to fade when an actor token moves under it.
     * @defaultValue
     */
    FADE: 1;
    /**
     * Causes the tile to reveal the background in the vicinity of an actor token under it. The radius is determined by the token's size.
     */
    RADIAL: 3;
    /**
     * Causes the tile to be partially revealed based on the vision of the actor, which does not need to be under the tile to see what's beneath it.
     *
     * @remarks
     * This is useful for rooves on buildings where players could see through a window or door, viewing only a portion of what is obscured by the roof itself.
     */
    VISION: 4;
}>;

export type TileOcclusionMode = (typeof TILE_OCCLUSION_MODES)[keyof typeof TILE_OCCLUSION_MODES];

/**
 * The occlusion modes that define the set of tokens that trigger occlusion.
 */
export const TOKEN_OCCLUSION_MODES: Readonly<{
    /**
     * Owned tokens that aren't hidden.
     */
    OWNED: 1;
    /**
     * Controlled tokens.
     */
    CONTROLLED: 2;
    /**
     * Hovered tokens that are visible.
     */
    HOVERED: 4;
    /**
     * Highlighted tokens that are visible.
     */
    HIGHLIGHTED: 8;
    /**
     * All visible tokens.
     */
    VISIBLE: 16;
}>;

/**
 * Describe the various thresholds of token control upon which to show certain pieces of information
 * @see https://foundryvtt.com/article/tokens/
 */
export const TOKEN_DISPLAY_MODES: Readonly<{
    /**
     * No information is displayed.
     */
    NONE: 0;
    /**
     * Displayed when the token is controlled.
     */
    CONTROL: 10;
    /**
     * Displayed when hovered by a GM or a user who owns the actor.
     */
    OWNER_HOVER: 20;
    /**
     * Displayed when hovered by any user.
     */
    HOVER: 30;
    /**
     * Always displayed for a GM or for a user who owns the actor.
     */
    OWNER: 40;
    /**
     * Always displayed for everyone.
     */
    ALWAYS: 50;
}>;

export type TokenDisplayMode = (typeof TOKEN_DISPLAY_MODES)[keyof typeof TOKEN_DISPLAY_MODES];

/**
 * The allowed Token disposition types
 * @see https://foundryvtt.com/article/tokens/
 */
export const TOKEN_DISPOSITIONS: Readonly<{
    /**
     * Displayed with a purple borders for owners and with no borders for others (and no pointer change).
     */
    SECRET: -2;
    /**
     * Displayed as an enemy with a red border.
     */
    HOSTILE: -1;
    /**
     * Displayed as neutral with a yellow border.
     */
    NEUTRAL: 0;
    /**
     * Displayed as an ally with a cyan border.
     */
    FRIENDLY: 1;
}>;

export type TokenDisposition = (typeof TOKEN_DISPOSITIONS)[keyof typeof TOKEN_DISPOSITIONS];

/**
 * The allowed token turn markers modes.
 */
export const TOKEN_TURN_MARKER_MODES: Readonly<{
    /**
     * The turn marker is disabled for this token.
     */
    DISABLED: 0;
    /**
     * The turn marker for this token is using the combat tracker settings (which could be disabled).
     */
    DEFAULT: 1;
    /**
     * The turn marker is using the token settings (unless the combat tracker turn marker setting is disabled)
     */
    CUSTOM: 2;
}>;

/**
 * The possible shapes of Tokens.
 */
export const TOKEN_SHAPES: Readonly<{
    /**
     * Ellipse (Variant 1)
     */
    ELLIPSE_1: 0;
    /**
     * Ellipse (Variant 2)
     */
    ELLIPSE_2: 1;
    /**
     * Trapezoid (Variant 1)
     */
    TRAPEZOID_1: 2;
    /**
     * Trapezoid (Variant 2)
     */
    TRAPEZOID_2: 3;
    /**
     * Rectangle (Variant 1)
     */
    RECTANGLE_1: 4;
    /**
     * Rectangle (Variant 2)
     */
    RECTANGLE_2: 5;
}>;

export type TokenShapeType = (typeof TOKEN_SHAPES)[keyof typeof TOKEN_SHAPES];

/**
 * Define the allowed User permission levels.
 * Each level is assigned a value in ascending order. Higher levels grant more permissions.
 * @see https://foundryvtt.com/article/users/
 */
export const USER_ROLES: Readonly<{
    /**
     * The User is blocked from taking actions in Foundry Virtual Tabletop.
     * You can use this role to temporarily or permanently ban a user from joining the game.
     */
    NONE: 0;
    /**
     * The User is able to join the game with permissions available to a standard player.
     * They cannot take some more advanced actions which require Trusted permissions, but they have the basic functionalities needed to operate in the virtual tabletop.
     */
    PLAYER: 1;
    /**
     * Similar to the Player role, except a Trusted User has the ability to perform some more advanced actions like create drawings, measured templates, or even to (optionally) upload media files to the server.
     */
    TRUSTED: 2;
    /**
     * A special User who has many of the same in-game controls as a Game Master User, but does not have the ability to perform administrative actions like changing User roles or modifying World-level settings.
     */
    ASSISTANT: 3;
    /**
     *  A special User who has administrative control over this specific World.
     *  Game Masters behave quite differently than Players in that they have the ability to see all Documents and Objects within the world as well as the capability to configure World settings.
     */
    GAMEMASTER: 4;
}>;

export type UserRoleName = keyof typeof USER_ROLES;

/**
 * Invert the User Role mapping to recover role names from a role integer
 * @type {{0: "NONE"; 1: "PLAYER"; 2: "TRUSTED"; 3: "ASSISTANT"; 4: "GAMEMASTER"}}
 * @see USER_ROLES
 */
export const USER_ROLE_NAMES: {
    0: "NONE";
    1: "PLAYER";
    2: "TRUSTED";
    3: "ASSISTANT";
    4: "GAMEMASTER";
};

export type UserRole = keyof typeof USER_ROLE_NAMES;

/**
 * An enumeration of the allowed types for a MeasuredTemplate embedded document
 * @see https://foundryvtt.com/article/measurement/
 */
export const MEASURED_TEMPLATE_TYPES: Readonly<{
    /**
     * Circular templates create a radius around the starting point.
     */
    CIRCLE: "circle";
    /**
     * Cones create an effect in the shape of a triangle or pizza slice from the starting point.
     */
    CONE: "cone";
    /**
     * A rectangle uses the origin point as one of the corners, treating the origin as being inside of the rectangle's area.
     */
    RECTANGLE: "rect";
    /**
     * A ray creates a single line that is one square in width and as long as you want it to be.
     */
    RAY: "ray";
}>;

export type MeasuredTemplateType = (typeof MEASURED_TEMPLATE_TYPES)[keyof typeof MEASURED_TEMPLATE_TYPES];

/**
 * Define the recognized User capabilities which individual Users or role levels may be permitted to perform
 */
export const USER_PERMISSIONS: Readonly<{
    ACTOR_CREATE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 3;
    };
    BROADCAST_AUDIO: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 2;
    };
    BROADCAST_VIDEO: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 2;
    };
    CARDS_CREATE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 3;
    };
    DRAWING_CREATE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 2;
    };
    ITEM_CREATE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 3;
    };
    FILES_BROWSE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 2;
    };
    FILES_UPLOAD: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 3;
    };
    JOURNAL_CREATE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 2;
    };
    MACRO_SCRIPT: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 1;
    };
    MANUAL_ROLLS: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 2;
    };
    MESSAGE_WHISPER: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 1;
    };
    NOTE_CREATE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 2;
    };
    PING_CANVAS: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 1;
    };
    PLAYLIST_CREATE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 3;
    };
    SETTINGS_MODIFY: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 3;
    };
    SHOW_CURSOR: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 1;
    };
    SHOW_RULER: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 1;
    };
    TEMPLATE_CREATE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 1;
    };
    TOKEN_CREATE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 3;
    };
    TOKEN_DELETE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 3;
    };
    TOKEN_CONFIGURE: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 2;
    };
    WALL_DOORS: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 1;
    };
    QUERY_USER: {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: 1;
    };
}>;

export type UserPermission = keyof typeof USER_PERMISSIONS;

/**
 * The allowed directions of effect that a Wall can have
 * @see https://foundryvtt.com/article/walls/
 */
export const WALL_DIRECTIONS: Readonly<{
    /**
     * The wall collides from both directions.
     */
    BOTH: 0;
    /**
     * The wall collides only when a ray strikes its left side.
     */
    LEFT: 1;
    /**
     * The wall collides only when a ray strikes its right side.
     */
    RIGHT: 2;
}>;

export type WallDirection = (typeof WALL_DIRECTIONS)[keyof typeof WALL_DIRECTIONS];

/**
 * The allowed door types which a Wall may contain
 * @see https://foundryvtt.com/article/walls/
 */
export const WALL_DOOR_TYPES: Readonly<{
    /**
     * The wall does not contain a door.
     */
    NONE: 0;
    /**
     *  The wall contains a regular door.
     */
    DOOR: 1;
    /**
     * The wall contains a secret door.
     */
    SECRET: 2;
}>;

export type WallDoorType = (typeof WALL_DOOR_TYPES)[keyof typeof WALL_DOOR_TYPES];

/**
 * The allowed door states which may describe a Wall that contains a door
 * @see https://foundryvtt.com/article/walls/
 */
export const WALL_DOOR_STATES: Readonly<{
    /**
     * The door is closed.
     */
    CLOSED: 0;
    /**
     * The door is open.
     */
    OPEN: 1;
    /**
     * The door is closed and locked.
     */
    LOCKED: 2;
}>;

export type WallDoorState = (typeof WALL_DOOR_STATES)[keyof typeof WALL_DOOR_STATES];

/**
 * The possible ways to interact with a door
 */
export const WALL_DOOR_INTERACTIONS: readonly ["open", "close", "lock", "unlock", "test"];

/**
 * The wall properties which restrict the way interaction occurs with a specific wall
 */
export const WALL_RESTRICTION_TYPES: readonly ["light", "sight", "sound", "move"];

export type WallRestrictionType = (typeof WALL_RESTRICTION_TYPES)[number];

/**
 * The types of sensory collision which a Wall may impose
 * @see https://foundryvtt.com/article/walls/
 */
export const WALL_SENSE_TYPES: Readonly<{
    /**
     * Senses do not collide with this wall.
     */
    NONE: 0;
    /**
     * Senses collide with this wall.
     */
    LIMITED: 10;
    /**
     * Senses collide with the second intersection, bypassing the first.
     */
    NORMAL: 20;
    /**
     * Senses bypass the wall within a certain proximity threshold.
     */
    PROXIMITY: 30;
    /**
     * Senses bypass the wall outside a certain proximity threshold.
     */
    DISTANCE: 40;
}>;

export type WallSenseType = (typeof WALL_SENSE_TYPES)[keyof typeof WALL_SENSE_TYPES];

/**
 * The types of movement collision which a Wall may impose
 * @see https://foundryvtt.com/article/walls/
 */
export const WALL_MOVEMENT_TYPES: Readonly<{
    /**
     * Movement does not collide with this wall.
     */
    NONE: 0;
    /**
     * Movement collides with this wall.
     */
    NORMAL: 20;
}>;

export type WallMovementType = (typeof WALL_MOVEMENT_TYPES)[keyof typeof WALL_MOVEMENT_TYPES];

/**
 * The possible precedence values a Keybinding might run in
 * @see https://foundryvtt.com/article/keybinds/
 */
export const KEYBINDING_PRECEDENCE: Readonly<{
    /**
     * Runs in the first group along with other PRIORITY keybindings.
     */
    PRIORITY: 0;
    /**
     * Runs after the PRIORITY group along with other NORMAL keybindings.
     */
    NORMAL: 1;
    /**
     * Runs in the last group along with other DEFERRED keybindings.
     */
    DEFERRED: 2;
}>;

/**
 * The allowed set of HTML template extensions
 */
export const HTML_FILE_EXTENSIONS: Readonly<{
    handlebars: "text/x-handlebars-template";
    hbs: "text/x-handlebars-template";
    html: "text/html";
}>;

/**
 * The supported file extensions for image-type files, and their corresponding mime types.
 */
export const IMAGE_FILE_EXTENSIONS: Readonly<{
    apng: "image/apng";
    avif: "image/avif";
    bmp: "image/bmp";
    gif: "image/gif";
    jpeg: "image/jpeg";
    jpg: "image/jpeg";
    png: "image/png";
    svg: "image/svg+xml";
    tiff: "image/tiff";
    webp: "image/webp";
}>;

export type ImageFileExtension = keyof typeof IMAGE_FILE_EXTENSIONS;

/**
 * The supported file extensions for video-type files, and their corresponding mime types.
 */
export const VIDEO_FILE_EXTENSIONS: Readonly<{
    m4v: "video/mp4";
    mp4: "video/mp4";
    ogv: "video/ogg";
    webm: "video/webm";
}>;

export type VideoFileExtension = keyof typeof VIDEO_FILE_EXTENSIONS;

/**
 * The supported file extensions for audio-type files, and their corresponding mime types.
 */
export const AUDIO_FILE_EXTENSIONS: Readonly<{
    aac: "audio/aac";
    flac: "audio/flac";
    m4a: "audio/mp4";
    mid: "audio/midi";
    mp3: "audio/mpeg";
    ogg: "audio/ogg";
    opus: "audio/opus";
    wav: "audio/wav";
    webm: "audio/webm";
}>;

export type AudioFileExtension = keyof typeof AUDIO_FILE_EXTENSIONS;

/**
 * The supported file extensions for text files, and their corresponding mime types.
 */
export const TEXT_FILE_EXTENSIONS: Readonly<{
    csv: "text/csv";
    json: "application/json";
    md: "text/markdown";
    pdf: "application/pdf";
    tsv: "text/tab-separated-values";
    txt: "text/plain";
    xml: "application/xml";
    yml: "application/yaml";
    yaml: "application/yaml";
}>;

/**
 * Supported file extensions for font files, and their corresponding mime types.
 */
export const FONT_FILE_EXTENSIONS: Readonly<{
    otf: "font/otf";
    ttf: "font/ttf";
    woff: "font/woff";
    woff2: "font/woff2";
}>;

/**
 * Supported file extensions for 3D files, and their corresponding mime types.
 */
export const GRAPHICS_FILE_EXTENSIONS: Readonly<{
    fbx: "application/octet-stream";
    glb: "model/gltf-binary";
    gltf: "model/gltf+json";
    mtl: "model/mtl";
    obj: "model/obj";
    stl: "model/stl";
    usdz: "model/vnd.usdz+zip";
}>;

/**
 * A consolidated mapping of all extensions permitted for upload.
 */
export const UPLOADABLE_FILE_EXTENSIONS: Readonly<{
    fbx: "application/octet-stream";
    glb: "model/gltf-binary";
    gltf: "model/gltf+json";
    mtl: "model/mtl";
    obj: "model/obj";
    stl: "model/stl";
    usdz: "model/vnd.usdz+zip";
    otf: "font/otf";
    ttf: "font/ttf";
    woff: "font/woff";
    woff2: "font/woff2";
    csv: "text/csv";
    json: "application/json";
    md: "text/markdown";
    pdf: "application/pdf";
    tsv: "text/tab-separated-values";
    txt: "text/plain";
    xml: "application/xml";
    yml: "application/yaml";
    yaml: "application/yaml";
    m4v: "video/mp4";
    mp4: "video/mp4";
    ogv: "video/ogg";
    webm: "video/webm";
    aac: "audio/aac";
    flac: "audio/flac";
    m4a: "audio/mp4";
    mid: "audio/midi";
    mp3: "audio/mpeg";
    ogg: "audio/ogg";
    opus: "audio/opus";
    wav: "audio/wav";
    apng: "image/apng";
    avif: "image/avif";
    bmp: "image/bmp";
    gif: "image/gif";
    jpeg: "image/jpeg";
    jpg: "image/jpeg";
    png: "image/png";
    svg: "image/svg+xml";
    tiff: "image/tiff";
    webp: "image/webp";
}>;

export type FileExtension = keyof typeof UPLOADABLE_FILE_EXTENSIONS;

/**
 * An enumeration of file type categories which can be selected.
 */
export const FILE_CATEGORIES: Readonly<{
    HTML: Readonly<{
        handlebars: "text/x-handlebars-template";
        hbs: "text/x-handlebars-template";
        html: "text/html";
    }>;
    IMAGE: Readonly<{
        apng: "image/apng";
        avif: "image/avif";
        bmp: "image/bmp";
        gif: "image/gif";
        jpeg: "image/jpeg";
        jpg: "image/jpeg";
        png: "image/png";
        svg: "image/svg+xml";
        tiff: "image/tiff";
        webp: "image/webp";
    }>;
    VIDEO: Readonly<{
        m4v: "video/mp4";
        mp4: "video/mp4";
        ogv: "video/ogg";
        webm: "video/webm";
    }>;
    AUDIO: Readonly<{
        aac: "audio/aac";
        flac: "audio/flac";
        m4a: "audio/mp4";
        mid: "audio/midi";
        mp3: "audio/mpeg";
        ogg: "audio/ogg";
        opus: "audio/opus";
        wav: "audio/wav";
        webm: "audio/webm";
    }>;
    TEXT: Readonly<{
        csv: "text/csv";
        json: "application/json";
        md: "text/markdown";
        pdf: "application/pdf";
        tsv: "text/tab-separated-values";
        txt: "text/plain";
        xml: "application/xml";
        yml: "application/yaml";
        yaml: "application/yaml";
    }>;
    FONT: Readonly<{
        otf: "font/otf";
        ttf: "font/ttf";
        woff: "font/woff";
        woff2: "font/woff2";
    }>;
    GRAPHICS: Readonly<{
        fbx: "application/octet-stream";
        glb: "model/gltf-binary";
        gltf: "model/gltf+json";
        mtl: "model/mtl";
        obj: "model/obj";
        stl: "model/stl";
        usdz: "model/vnd.usdz+zip";
    }>;
}>;

export type FileCategory = keyof typeof FILE_CATEGORIES;

/**
 * The list of file categories that are "media".
 */
export const MEDIA_FILE_CATEGORIES: readonly ["IMAGE", "VIDEO", "AUDIO", "TEXT", "FONT", "GRAPHICS"];

/**
 * A list of MIME types which are treated as uploaded "media", which are allowed to overwrite existing files.
 * Any non-media MIME type is not allowed to replace an existing file.
 */
export const MEDIA_MIME_TYPES: (
    | "image/apng"
    | "image/avif"
    | "image/bmp"
    | "image/gif"
    | "image/jpeg"
    | "image/png"
    | "image/svg+xml"
    | "image/tiff"
    | "image/webp"
    | "video/mp4"
    | "video/ogg"
    | "video/webm"
    | "audio/aac"
    | "audio/flac"
    | "audio/mp4"
    | "audio/midi"
    | "audio/mpeg"
    | "audio/ogg"
    | "audio/opus"
    | "audio/wav"
    | "audio/webm"
    | "text/csv"
    | "application/json"
    | "text/markdown"
    | "application/pdf"
    | "text/tab-separated-values"
    | "text/plain"
    | "application/xml"
    | "application/yaml"
    | "font/otf"
    | "font/ttf"
    | "font/woff"
    | "font/woff2"
    | "application/octet-stream"
    | "model/gltf-binary"
    | "model/gltf+json"
    | "model/mtl"
    | "model/obj"
    | "model/stl"
    | "model/vnd.usdz+zip"
)[];

/**
 * A font weight to name mapping.
 */
export const FONT_WEIGHTS: Readonly<{
    Thin: 100;
    ExtraLight: 200;
    Light: 300;
    Regular: 400;
    Medium: 500;
    SemiBold: 600;
    Bold: 700;
    ExtraBold: 800;
    Black: 900;
}>;

/**
 * Stores shared commonly used timeouts, measured in MS
 */
export const TIMEOUTS: Readonly<{
    /**
     * The default timeout for interacting with the foundryvtt.com API.
     */
    FOUNDRY_WEBSITE: 10000;
    /**
     * The specific timeout for loading the list of packages from the foundryvtt.com API.
     */
    PACKAGE_REPOSITORY: 5000;
    /**
     * The specific timeout for the IP address lookup service.
     */
    IP_DISCOVERY: 5000;
}>;

/**
 * A subset of Compendium types which require a specific system to be designated
 */
export const SYSTEM_SPECIFIC_COMPENDIUM_TYPES: readonly ["Actor", "Item"];

/**
 * The configured showdown bi-directional HTML <-> Markdown converter options.
 */
export const SHOWDOWN_OPTIONS: Readonly<{
    disableForced4SpacesIndentedSublists: true;
    noHeaderId: true;
    parseImgDimensions: true;
    strikethrough: true;
    tables: true;
    tablesHeaderId: true;
}>;

/**
 * The list of allowed HTML tags.
 */
export const ALLOWED_HTML_TAGS: readonly [
    "header",
    "main",
    "section",
    "article",
    "aside",
    "nav",
    "footer",
    "div",
    "address",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "br",
    "p",
    "blockquote",
    "summary",
    "details",
    "span",
    "code",
    "pre",
    "a",
    "label",
    "abbr",
    "cite",
    "mark",
    "q",
    "ruby",
    "rp",
    "rt",
    "small",
    "time",
    "var",
    "dfn",
    "sub",
    "sup",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "del",
    "ins",
    "ol",
    "ul",
    "li",
    "dl",
    "dd",
    "dt",
    "menu",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "col",
    "colgroup",
    "form",
    "input",
    "select",
    "option",
    "button",
    "datalist",
    "fieldset",
    "legend",
    "meter",
    "optgroup",
    "progress",
    "textarea",
    "output",
    "figure",
    "figcaption",
    "caption",
    "img",
    "video",
    "map",
    "area",
    "track",
    "picture",
    "source",
    "audio",
    "iframe",
    "color-picker",
    "code-mirror",
    "document-embed",
    "document-tags",
    "enriched-content",
    "file-picker",
    "hue-slider",
    "multi-select",
    "multi-checkbox",
    "range-picker",
    "secret-block",
    "string-tags",
    "prose-mirror",
];

/**
 * The list of allowed attributes in HTML elements.
 */
export const ALLOWED_HTML_ATTRIBUTES: Readonly<{
    "*": readonly [
        "class",
        "data-*",
        "id",
        "title",
        "style",
        "draggable",
        "aria-*",
        "tabindex",
        "dir",
        "hidden",
        "inert",
        "role",
        "is",
        "lang",
        "popover",
        "autocapitalize",
        "autocorrect",
        "autofocus",
        "contenteditable",
        "spellcheck",
        "translate",
    ];
    a: readonly ["href", "name", "target", "rel"];
    area: readonly ["alt", "coords", "href", "rel", "shape", "target"];
    audio: readonly ["controls", "loop", "muted", "src", "autoplay"];
    blockquote: readonly ["cite"];
    button: readonly ["disabled", "name", "type", "value"];
    col: readonly ["span"];
    colgroup: readonly ["span"];
    "code-mirror": readonly [
        "disabled",
        "name",
        "value",
        "placeholder",
        "readonly",
        "required",
        "language",
        "indent",
        "nowrap",
    ];
    "color-picker": readonly ["disabled", "name", "value", "placeholder", "readonly", "required"];
    details: readonly ["open"];
    "document-embed": readonly ["uuid"];
    "document-tags": readonly [
        "disabled",
        "name",
        "value",
        "placeholder",
        "readonly",
        "required",
        "type",
        "single",
        "max",
    ];
    "enriched-content": readonly ["enricher"];
    fieldset: readonly ["disabled"];
    "file-picker": readonly ["disabled", "name", "value", "placeholder", "readonly", "required", "type", "noupload"];
    form: readonly ["name"];
    "hue-slider": readonly ["disabled", "name", "value", "readonly", "required"];
    iframe: readonly ["src", "srcdoc", "name", "height", "width", "loading", "sandbox"];
    img: readonly ["height", "src", "width", "usemap", "sizes", "srcset", "alt"];
    input: readonly [
        "checked",
        "disabled",
        "name",
        "value",
        "placeholder",
        "type",
        "alt",
        "height",
        "list",
        "max",
        "min",
        "readonly",
        "size",
        "src",
        "step",
        "width",
        "required",
    ];
    label: readonly ["for"];
    li: readonly ["value"];
    map: readonly ["name"];
    meter: readonly ["value", "min", "max", "low", "high", "optimum"];
    "multi-checkbox": readonly ["disabled", "name", "required"];
    "multi-select": readonly ["disabled", "name", "required"];
    ol: readonly ["reversed", "start", "type"];
    optgroup: readonly ["disabled", "label"];
    option: readonly ["disabled", "selected", "label", "value"];
    output: readonly ["for", "form", "name"];
    progress: readonly ["max", "value"];
    "prose-mirror": readonly ["disabled", "name", "value", "placeholder", "readonly", "required", "toggled", "open"];
    "range-picker": readonly ["disabled", "name", "value", "placeholder", "readonly", "min", "max", "step"];
    select: readonly ["name", "disabled", "multiple", "size", "required"];
    source: readonly ["media", "sizes", "src", "srcset", "type"];
    "string-tags": readonly ["disabled", "name", "value", "placeholder", "readonly", "required"];
    table: readonly ["border"];
    td: readonly ["colspan", "headers", "rowspan"];
    textarea: readonly ["rows", "cols", "disabled", "name", "readonly", "wrap", "required"];
    time: readonly ["datetime"];
    th: readonly ["abbr", "colspan", "headers", "rowspan", "scope", "sorted"];
    track: readonly ["default", "kind", "label", "src", "srclang"];
    video: readonly ["controls", "height", "width", "loop", "muted", "poster", "src", "autoplay"];
}>;

/**
 * The list of allowed URL schemes.
 */
export const ALLOWED_URL_SCHEMES: readonly ["http", "https", "data", "mailto", "obsidian", "syrinscape-online"];

/**
 * The list of attributes validated as URLs.
 */
export const ALLOWED_URL_SCHEMES_APPLIED_TO_ATTRIBUTES: readonly ["href", "src", "cite"];

/**
 * The list of trusted iframe domains.
 */
export const TRUSTED_IFRAME_DOMAINS: readonly ["google.com", "youtube.com"];

/**
 * Available themes for the world join page.
 */
export const WORLD_JOIN_THEMES: Readonly<{
    default: "WORLD.JOIN_THEMES.default";
    minimal: "WORLD.JOIN_THEMES.minimal";
}>;

/**
 * Setup page package progress protocol.
 */
export const SETUP_PACKAGE_PROGRESS: Readonly<{
    ACTIONS: Readonly<{
        CREATE_BACKUP: "createBackup";
        RESTORE_BACKUP: "restoreBackup";
        DELETE_BACKUP: "deleteBackup";
        CREATE_SNAPSHOT: "createSnapshot";
        RESTORE_SNAPSHOT: "restoreSnapshot";
        DELETE_SNAPSHOT: "deleteSnapshot";
        INSTALL_PKG: "installPackage";
        LAUNCH_WORLD: "launchWorld";
        UPDATE_CORE: "updateCore";
        UPDATE_DOWNLOAD: "updateDownload";
    }>;
    STEPS: Readonly<{
        ARCHIVE: "archive";
        CHECK_DISK_SPACE: "checkDiskSpace";
        CLEAN_WORLD: "cleanWorld";
        EXTRACT_DEMO: "extractDemo";
        CONNECT_WORLD: "connectWorld";
        MIGRATE_WORLD: "migrateWorld";
        CONNECT_PKG: "connectPackage";
        MIGRATE_PKG: "migratePackage";
        MIGRATE_CORE: "migrateCore";
        MIGRATE_SYSTEM: "migrateSystem";
        DOWNLOAD: "download";
        EXTRACT: "extract";
        INSTALL: "install";
        CLEANUP: "cleanup";
        COMPLETE: "complete";
        DELETE: "delete";
        ERROR: "error";
        VEND: "vend";
        SNAPSHOT_MODULES: "snapshotModules";
        SNAPSHOT_SYSTEMS: "snapshotSystems";
        SNAPSHOT_WORLDS: "snapshotWorlds";
    }>;
}>;

/**
 * The combat announcements.
 */
export const COMBAT_ANNOUNCEMENTS: readonly ["startEncounter", "nextUp", "yourTurn"];

/**
 * The fit modes of {@link foundry.data.TextureData}.
 */
export const TEXTURE_DATA_FIT_MODES: readonly ["fill", "contain", "cover", "width", "height"];

/**
 * The maximum depth to recurse to when embedding enriched text.
 */
export const TEXT_ENRICH_EMBED_MAX_DEPTH: 5;
/**
 * The Region events that are supported by core.
 */
export const REGION_EVENTS: Readonly<{
    /**
     * Triggered when the shapes or bottom/top elevation of the Region are changed.
     */
    REGION_BOUNDARY: "regionBoundary";
    /**
     * Triggered when the Region Behavior becomes active, i.e. is enabled or created without being disabled.
     *
     * The event is triggered only for this Region Behavior.
     */
    BEHAVIOR_ACTIVATED: "behaviorActivated";
    /**
     * Triggered when the Region Behavior becomes inactive, i.e. is disabled or deleted without being disabled.
     *
     * The event is triggered only for this Region Behavior.
     */
    BEHAVIOR_DEACTIVATED: "behaviorDeactivated";
    /**
     * Triggered when the Region Behavior becomes viewed, i.e. active and the Scene of its Region is viewed.
     *
     * The event is triggered only for this Region Behavior.
     */
    BEHAVIOR_VIEWED: "behaviorViewed";
    /**
     * Triggered when the Region Behavior becomes unviewed, i.e. inactive or the Scene of its Region is unviewed.
     *
     * The event is triggered only for this Region Behavior.
     */
    BEHAVIOR_UNVIEWED: "behaviorUnviewed";
    /**
     * Triggered when a Token enters a Region.
     *
     * A Token enters a Region whenever ...
     *   - it is created within the Region,
     *   - the boundary of the Region has changed such that the Token is now inside the Region,
     *   - the Token moves into the Region (the Token's x, y, elevation, width, height, or shape
     *     has changed such that it is now inside the Region), or
     *   - a Region Behavior becomes active (i.e., is enabled or created while enabled), in which case
     *     the event it triggered only for this Region Behavior.
     */
    TOKEN_ENTER: "tokenEnter";
    /**
     * Triggered when a Token exits a Region.
     *
     * A Token exits a Region whenever ...
     *   - it is deleted while inside the Region,
     *   - the boundary of the Region has changed such that the Token is no longer inside the Region,
     *   - the Token moves out of the Region (the Token's x, y, elevation, width, height, or shape
     *     has changed such that it is no longer inside the Region), or
     *   - a Region Behavior becomes inactive (i.e., is disabled or deleted while enabled), in which case
     *     the event it triggered only for this Region Behavior.
     */
    TOKEN_EXIT: "tokenExit";
    /**
     * Triggered when a Token moves into a Region.
     *
     * A Token moves whenever its x, y, elevation, width, height, or shape is changed.
     */
    TOKEN_MOVE_IN: "tokenMoveIn";
    /**
     * Triggered when a Token moves out of a Region.
     *
     * A Token moves whenever its x, y, elevation, width, height, or shape is changed.
     */
    TOKEN_MOVE_OUT: "tokenMoveOut";
    /**
     * Triggered when a Token moves within a Region.
     *
     * A token moves whenever its x, y, elevation, width, height, or shape is changed.
     */
    TOKEN_MOVE_WITHIN: "tokenMoveWithin";
    /**
     * Triggered when a Token animates into a Region.
     *
     * This event is only triggered only if the Scene the Token is in is viewed.
     */
    TOKEN_ANIMATE_IN: "tokenAnimateIn";
    /**
     * Triggered when a Token animates out of a Region.
     *
     * This event is triggered only if the Scene the Token is in is viewed.
     */
    TOKEN_ANIMATE_OUT: "tokenAnimateOut";
    /**
     * Triggered when a Token starts its Combat turn in a Region.
     */
    TOKEN_TURN_START: "tokenTurnStart";
    /**
     * Triggered when a Token ends its Combat turn in a Region.
     */
    TOKEN_TURN_END: "tokenTurnEnd";
    /**
     * Triggered when a Token starts the Combat round in a Region.
     */
    TOKEN_ROUND_START: "tokenRoundStart";
    /**
     * Triggered when a Token ends the Combat round in a Region.
     */
    TOKEN_ROUND_END: "tokenRoundEnd";
}>;

/**
 * The possible visibility state of Region.
 */
export const REGION_VISIBILITY: Readonly<{
    /**
     * Only visible on the RegionLayer.
     */
    LAYER: 0;
    /**
     * Only visible to Gamemasters.
     */
    GAMEMASTER: 1;
    /**
     * Visible to anyone.
     */
    ALWAYS: 2;
}>;

/**
 * The types of a Region movement segment.
 */
export const REGION_MOVEMENT_SEGMENTS: Readonly<{
    /**
     * The segment crosses the boundary of the Region and exits it.
     */
    EXIT: -1;
    /**
     * The segment does not cross the boundary of the Region and is contained within it.
     */
    MOVE: 0;
    /**
     * The segment crosses the boundary of the Region and enters it.
     */
    ENTER: 1;
}>;

export type RegionMovementSegmentType = (typeof REGION_MOVEMENT_SEGMENTS)[keyof typeof REGION_MOVEMENT_SEGMENTS];

/**
 * Available setting scopes.
 */
export const SETTING_SCOPES: Readonly<{
    /**
     * Settings scoped to the client device. Stored in localStorage.
     */
    CLIENT: "client";
    /**
     * Settings scoped to the game World. Applies to all Users in the World. Stored in the Settings database.
     */
    WORLD: "world";
    /**
     * Settings scoped to an individual User in the World. Stored in the Settings database.
     */
    USER: "user";
}>;

/**
 * The scaling factor that is used for Clipper polygons/paths consistently everywhere core performs Clipper operations.
 * @type {number}
 */
export const CLIPPER_SCALING_FACTOR: 100;

export type DrawingShapeType = "r" | "e" | "t" | "p" | "f";
export type ShapeDataType = keyof typeof data.BaseShapeData.TYPES;
export type UserAction = "create" | "update" | "delete";

export type HexColorString = `#${string}`;
export type AudioFilePath = `${string}.${AudioFileExtension}`;
export type ImageFilePath = `${string}.${ImageFileExtension}`;
export type VideoFilePath = `${string}.${VideoFileExtension}`;
export type FilePath = AudioFilePath | ImageFilePath | VideoFilePath;
