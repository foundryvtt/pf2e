/** The shortened software name */
export const vtt: "Foundry VTT";

/** The full software name */
export const VTT: "Foundry Virtual Tabletop";

/** The software website URL */
export const WEBSITE_URL: "https://foundryvtt.com";

/** The serverless API URL */
export const WEBSITE_API_URL: "https://api.foundryvtt.com";

/** An ASCII greeting displayed to the client */
export const ASCII: `_______________________________________________________________
 _____ ___  _   _ _   _ ____  ______   __ __     _______ _____
|  ___/ _ \\| | | | \\ | |  _ \\|  _ \\ \\ / / \\ \\   / |_   _|_   _|
| |_ | | | | | | |  \\| | | | | |_) \\ V /   \\ \\ / /  | |   | |
|  _|| |_| | |_| | |\\  | |_| |  _ < | |     \\ V /   | |   | |
|_|   \\___/ \\___/|_| \\_|____/|_| \\_\\|_|      \\_/    |_|   |_|
===============================================================`;

/** Define the allowed ActiveEffect application modes */
export const ACTIVE_EFFECT_MODES: {
    CUSTOM: 0;
    MULTIPLY: 1;
    ADD: 2;
    DOWNGRADE: 3;
    UPGRADE: 4;
    OVERRIDE: 5;
};

/** Define the string name used for the base document type when specific sub-types are not defined by the system */
export const BASE_DOCUMENT_TYPE: "base";

/**
 * Define the methods by which a Card can be drawn from a Cards stack
 * TOP and FIRST are synonymous, as are BOTTOM and LAST.
 */
export const CARD_DRAW_MODES: {
    FIRST: 0;
    TOP: 0;
    LAST: 1;
    BOTTOM: 1;
    RANDOM: 2;
};

/** An enumeration of canvas performance modes. */
export const CANVAS_PERFORMANCE_MODES: {
    LOW: 0;
    MED: 1;
    HIGH: 2;
    MAX: 3;
};

/** Valid Chat Message types */
export const CHAT_MESSAGE_TYPES: {
    OTHER: 0;
    OOC: 1;
    IC: 2;
    EMOTE: 3;
    WHISPER: 4;
    ROLL: 5;
};

/** Define the set of languages which have built-in support in the core software */
export const CORE_SUPPORTED_LANGUAGES: ["en"];

/**
 * Configure the severity of compatibility warnings.
 * If SILENT, nothing will be logged
 * If WARNING, a message will be logged at the "warn" level
 * If ERROR, a message will be logged at the "error" level
 * If FAILURE, an Error will be thrown
 */
export const COMPATIBILITY_MODES: {
    SILENT: 0;
    WARNING: 1;
    ERROR: 2;
    FAILURE: 3;
};

/** The default artwork used for Token images if none is provided */
export const DEFAULT_TOKEN: "icons/svg/mystery-man.svg";

/** Define the allowed Document class types. */
export const DOCUMENT_TYPES: [
    "Actor",
    "Cards",
    "ChatMessage",
    "Combat",
    "Item",
    "Folder",
    "JournalEntry",
    "Macro",
    "Playlist",
    "RollTable",
    "Scene",
    "User"
];

/** The allowed Document types which may exist within a Compendium pack. */
export const COMPENDIUM_DOCUMENT_TYPES: [
    "Actor",
    "Cards",
    "Item",
    "JournalEntry",
    "Macro",
    "Playlist",
    "RollTable",
    "Scene",
    "Adventure"
];

/**
 * Define the allowed ownership levels for a Document.
 * Each level is assigned a value in ascending order.
 * Higher levels grant more permissions.
 */
export const DOCUMENT_OWNERSHIP_LEVELS: {
    INHERIT: -1;
    NONE: 0;
    LIMITED: 1;
    OBSERVER: 2;
    OWNER: 3;
};

/** Meta ownership levels that are used in the UI but never stored. */
export const DOCUMENT_META_OWNERSHIP_LEVELS: {
    DEFAULT: -20;
    NOCHANGE: -10;
};

/** Define the allowed Document types which may be dynamically linked in chat */
export const DOCUMENT_LINK_TYPES: [
    "Actor",
    "Cards",
    "Item",
    "Scene",
    "JournalEntry",
    "Macro",
    "RollTable",
    "PlaylistSound"
];

/** The supported dice roll visibility modes */
export const DICE_ROLL_MODES: {
    PUBLIC: "publicroll";
    PRIVATE: "gmroll";
    BLIND: "blindroll";
    SELF: "selfroll";
};

/**
 * The allowed fill types which a Drawing object may display
 * NONE: The drawing is not filled
 * SOLID: The drawing is filled with a solid color
 * PATTERN: The drawing is filled with a tiled image pattern
 */
export const DRAWING_FILL_TYPES: {
    NONE: 0;
    SOLID: 1;
    PATTERN: 2;
};

/**
 * Define the allowed Document types which Folders may contain
 */
export const FOLDER_DOCUMENT_TYPES: [
    "Actor",
    "Item",
    "Scene",
    "JournalEntry",
    "Playlist",
    "RollTable",
    "Cards",
    "Macro"
];

/** The maximum allowed level of depth for Folder nesting */
export const FOLDER_MAX_DEPTH: 3;

/** A list of allowed game URL names */
export const GAME_VIEWS: ["game", "stream"];

/** The minimum allowed grid size which is supported by the software */
export const GRID_MIN_SIZE: 50;

/** The allowed Grid types which are supported by the software */
export const GRID_TYPES: {
    GRIDLESS: 0;
    SQUARE: 1;
    HEXODDR: 2;
    HEXEVENR: 3;
    HEXODDQ: 4;
    HEXEVENQ: 5;
};

/** A list of supported setup URL names */
export const SETUP_VIEWS: ["license", "setup", "players", "join", "auth"];

/** An Array of valid MacroAction scope values */
export const MACRO_SCOPES: ["global", "actors", "actor"];

/** An enumeration of valid Macro types */
export const MACRO_TYPES: {
    SCRIPT: "script";
    CHAT: "chat";
};

/**
 * The allowed playback modes for an audio Playlist
 * DISABLED: The playlist does not play on its own, only individual Sound tracks played as a soundboard
 * SEQUENTIAL: The playlist plays sounds one at a time in sequence
 * SHUFFLE: The playlist plays sounds one at a time in randomized order
 * SIMULTANEOUS: The playlist plays all contained sounds at the same time
 */
export const PLAYLIST_MODES: {
    DISABLED: -1;
    SEQUENTIAL: 0;
    SHUFFLE: 1;
    SIMULTANEOUS: 2;
};

/**
 * The available sort modes for an audio Playlist.
 * ALPHABETICAL (default): Sort sounds alphabetically.
 * MANUAL: Sort sounds by manual drag-and-drop.
 */
export const PLAYLIST_SORT_MODES: {
    ALPHABETICAL: "a";
    MANUAL: "m";
};

/** The available modes for searching within a DirectoryCollection */
export const DIRECTORY_SEARCH_MODES: {
    FULL: "full";
    NAME: "name";
};

/** The allowed package types */
export const PACKAGE_TYPES: ["world", "system", "module"];

/** Encode the reasons why a package may be available or unavailable for use */
export const PACKAGE_AVAILABILITY_CODES: {
    UNKNOWN: -1;
    AVAILABLE: 0;
    REQUIRES_UPDATE: 1;
    REQUIRES_SYSTEM: 2;
    REQUIRES_DEPENDENCY: 3;
    REQUIRES_CORE_UPGRADE: 4;
    REQUIRES_CORE_DOWNGRADE: 5;
};

/** A safe password string which can be displayed */
export const PASSWORD_SAFE_STRING: "••••••••••••••••";

/** The allowed software update channels */
export const SOFTWARE_UPDATE_CHANNELS: {
    stable: "SETUP.UpdateStable";
    testing: "SETUP.UpdateTesting";
    development: "SETUP.UpdateDevelopment";
    prototype: "SETUP.UpdatePrototype";
};

/** The default sorting density for manually ordering child objects within a parent */
export const SORT_INTEGER_DENSITY: 100000;

/** The allowed types of a TableResult document */
export const TABLE_RESULT_TYPES: {
    TEXT: 0;
    DOCUMENT: 1;
    COMPENDIUM: 2;
};

/** The allowed formats of a Journal Entry Page. */
export const JOURNAL_ENTRY_PAGE_FORMATS: {
    HTML: 1;
    MARKDOWN: 2;
};

/** Define the valid anchor locations for a Tooltip displayed on a Placeable Object */
export const TEXT_ANCHOR_POINTS: {
    CENTER: 0;
    BOTTOM: 1;
    TOP: 2;
    LEFT: 3;
    RIGHT: 4;
};

/** Define the valid occlusion modes which an overhead tile can use */
export const TILE_OCCLUSION_MODES: {
    NONE: 0;
    FADE: 1;
    // ROOF: 2,  This mode is no longer supported so we don't use 2 for any other mode
    RADIAL: 3;
    VISION: 4;
};

/**
 * Describe the various thresholds of token control upon which to show certain pieces of information
 * NONE - no information is displayed
 * CONTROL - displayed when the token is controlled
 * OWNER HOVER - displayed when hovered by a GM or a user who owns the actor
 * HOVER - displayed when hovered by any user
 * OWNER - always displayed for a GM or for a user who owns the actor
 * ALWAYS - always displayed for everyone
 */
export const TOKEN_DISPLAY_MODES: {
    NONE: 0;
    CONTROL: 10;
    OWNER_HOVER: 20;
    HOVER: 30;
    OWNER: 40;
    ALWAYS: 50;
};

/**
 * The allowed Token disposition types
 * HOSTILE - Displayed as an enemy with a red border
 * NEUTRAL - Displayed as neutral with a yellow border
 * FRIENDLY - Displayed as an ally with a cyan border
 */
export const TOKEN_DISPOSITIONS: {
    HOSTILE: -1;
    NEUTRAL: 0;
    FRIENDLY: 1;
};

/**
 * Define the allowed User permission levels.
 * Each level is assigned a value in ascending order. Higher levels grant more permissions.
 */
export const USER_ROLES: {
    NONE: 0;
    PLAYER: 1;
    TRUSTED: 2;
    ASSISTANT: 3;
    GAMEMASTER: 4;
};

/** Invert the User Role mapping to recover role names from a role integer */
export const USER_ROLE_NAMES: {
    0: "NONE";
    1: "PLAYER";
    2: "TRUSTED";
    3: "ASSISTANT";
    4: "GAMEMASTER";
};

/** An enumeration of the allowed types for a MeasuredTemplate embedded document */
export const MEASURED_TEMPLATE_TYPES: {
    CIRCLE: "circle";
    CONE: "cone";
    RECTANGLE: "rect";
    RAY: "ray";
};

/** Define the recognized User capabilities which individual Users or role levels may be permitted to perform */
export const USER_PERMISSIONS: {
    ACTOR_CREATE: {
        label: "PERMISSION.ActorCreate";
        hint: "PERMISSION.ActorCreateHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.ASSISTANT;
    };
    BROADCAST_AUDIO: {
        label: "PERMISSION.BroadcastAudio";
        hint: "PERMISSION.BroadcastAudioHint";
        disableGM: true;
        defaultRole: typeof USER_ROLES.TRUSTED;
    };
    BROADCAST_VIDEO: {
        label: "PERMISSION.BroadcastVideo";
        hint: "PERMISSION.BroadcastVideoHint";
        disableGM: true;
        defaultRole: typeof USER_ROLES.TRUSTED;
    };
    DRAWING_CREATE: {
        label: "PERMISSION.DrawingCreate";
        hint: "PERMISSION.DrawingCreateHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.TRUSTED;
    };
    ITEM_CREATE: {
        label: "PERMISSION.ItemCreate";
        hint: "PERMISSION.ItemCreateHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.ASSISTANT;
    };
    FILES_BROWSE: {
        label: "PERMISSION.FilesBrowse";
        hint: "PERMISSION.FilesBrowseHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.TRUSTED;
    };
    FILES_UPLOAD: {
        label: "PERMISSION.FilesUpload";
        hint: "PERMISSION.FilesUploadHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.ASSISTANT;
    };
    JOURNAL_CREATE: {
        label: "PERMISSION.JournalCreate";
        hint: "PERMISSION.JournalCreateHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.TRUSTED;
    };
    MACRO_SCRIPT: {
        label: "PERMISSION.MacroScript";
        hint: "PERMISSION.MacroScriptHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.PLAYER;
    };
    MESSAGE_WHISPER: {
        label: "PERMISSION.MessageWhisper";
        hint: "PERMISSION.MessageWhisperHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.PLAYER;
    };
    NOTE_CREATE: {
        label: "PERMISSION.NoteCreate";
        hint: "PERMISSION.NoteCreateHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.TRUSTED;
    };
    SETTINGS_MODIFY: {
        label: "PERMISSION.SettingsModify";
        hint: "PERMISSION.SettingsModifyHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.ASSISTANT;
    };
    SHOW_CURSOR: {
        label: "PERMISSION.ShowCursor";
        hint: "PERMISSION.ShowCursorHint";
        disableGM: true;
        defaultRole: typeof USER_ROLES.PLAYER;
    };
    SHOW_RULER: {
        label: "PERMISSION.ShowRuler";
        hint: "PERMISSION.ShowRulerHint";
        disableGM: true;
        defaultRole: typeof USER_ROLES.PLAYER;
    };
    TEMPLATE_CREATE: {
        label: "PERMISSION.TemplateCreate";
        hint: "PERMISSION.TemplateCreateHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.PLAYER;
    };
    TOKEN_CREATE: {
        label: "PERMISSION.TokenCreate";
        hint: "PERMISSION.TokenCreateHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.ASSISTANT;
    };
    TOKEN_CONFIGURE: {
        label: "PERMISSION.TokenConfigure";
        hint: "PERMISSION.TokenConfigureHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.TRUSTED;
    };
    WALL_DOORS: {
        label: "PERMISSION.WallDoors";
        hint: "PERMISSION.WallDoorsHint";
        disableGM: false;
        defaultRole: typeof USER_ROLES.PLAYER;
    };
};

/**
 * The allowed directions of effect that a Wall can have
 * BOTH: The wall collides from both directions
 * LEFT: The wall collides only when a ray strikes its left side
 * RIGHT: The wall collides only when a ray strikes its right side
 */
export const WALL_DIRECTIONS: {
    BOTH: 0;
    LEFT: 1;
    RIGHT: 2;
};

/**
 * The allowed door types which a Wall may contain
 * NONE: The wall does not contain a door
 * DOOR: The wall contains a regular door
 * SECRET: The wall contains a secret door
 */
export const WALL_DOOR_TYPES: {
    NONE: 0;
    DOOR: 1;
    SECRET: 2;
};

/**
 * The allowed door states which may describe a Wall that contains a door
 * CLOSED: The door is closed
 * OPEN: The door is open
 * LOCKED: The door is closed and locked
 */
export const WALL_DOOR_STATES: {
    CLOSED: 0;
    OPEN: 1;
    LOCKED: 2;
};

/** The wall properties which restrict the way interaction occurs with a specific wall */
export const WALL_RESTRICTION_TYPES: ["light", "sight", "sound", "move"];

/**
 * The types of sensory collision which a Wall may impose
 * NONE: Senses do not collide with this wall
 * NORMAL: Senses collide with this wall
 * LIMITED: Senses collide with the second intersection, bypassing the first
 */
export const WALL_SENSE_TYPES: {
    NONE: 0;
    LIMITED: 10;
    NORMAL: 20;
};

/**
 * The types of movement collision which a Wall may impose
 * NONE: Movement does not collide with this wall
 * NORMAL: Movement collides with this wall
 */
export const WALL_MOVEMENT_TYPES: {
    NONE: typeof WALL_SENSE_TYPES.NONE;
    NORMAL: typeof WALL_SENSE_TYPES.NORMAL;
};

/**
 * The possible precedence values a Keybinding might run in
 * PRIORITY: Runs in the first group along with other PRIORITY keybindings
 * NORMAL: Runs after the PRIORITY group along with other NORMAL keybindings
 * DEFERRED: Runs in the last group along with other DEFERRED keybindings
 */
export const KEYBINDING_PRECEDENCE: {
    PRIORITY: 0;
    NORMAL: 1;
    DEFERRED: 2;
};

/** The allowed set of HTML template extensions  */
export const HTML_FILE_EXTENSIONS: ["html", "handlebars", "hbs"];

/** The supported file extensions for image-type files, and their corresponding mime types. */
export const IMAGE_FILE_EXTENSIONS: {
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
};

/** The supported file extensions for video-type files, and their corresponding mime types. */
export const VIDEO_FILE_EXTENSIONS: {
    m4v: "video/mp4";
    mp4: "video/mp4";
    ogg: "video/ogg";
    webm: "video/webm";
};

/** The supported file extensions for audio-type files, and their corresponding mime types. */
export const AUDIO_FILE_EXTENSIONS: {
    aac: "audio/aac";
    flac: "audio/flac";
    m4a: "audio/mp4";
    mid: "audio/midi";
    mp3: "audio/mpeg";
    ogg: "audio/ogg";
    opus: "audio/opus";
    wav: "audio/wav";
    webm: "audio/webm";
};

/** The supported file extensions for text files, and their corresponding mime types. */
export const TEXT_FILE_EXTENSIONS: {
    csv: "text/csv";
    json: "application/json";
    md: "text/markdown";
    pdf: "application/pdf";
    tsv: "text/tab-separated-values";
    txt: "text/plain";
    xml: "application/xml";
    yml: "application/yaml";
    yaml: "application/yaml";
};

/** Supported file extensions for font files, and their corresponding mime types. */
export const FONT_FILE_EXTENSIONS: {
    ttf: "font/ttf";
    otf: "font/otf";
    woff: "font/woff";
    woff2: "font/woff2";
};

/** Supported file extensions for 3D files, and their corresponding mime types. */
export const GRAPHICS_FILE_EXTENSIONS: {
    fbx: "application/octet-stream";
    glb: "model/gltf-binary";
    gltf: "model/gltf+json";
    mtl: "model/mtl";
    obj: "model/obj";
    stl: "model/stl";
    usdz: "model/vnd.usdz+zip";
};

export const UPLOADABLE_FILE_EXTENSIONS: typeof IMAGE_FILE_EXTENSIONS &
    Omit<typeof VIDEO_FILE_EXTENSIONS, "ogg" | "webm"> &
    typeof AUDIO_FILE_EXTENSIONS &
    typeof TEXT_FILE_EXTENSIONS &
    typeof FONT_FILE_EXTENSIONS &
    typeof GRAPHICS_FILE_EXTENSIONS;

/**
 * A list of MIME types which are treated as uploaded "media", which are allowed to overwrite existing files.
 * Any non-media MIME type is not allowed to replace an existing file.
 */
export const MEDIA_MIME_TYPES: (typeof UPLOADABLE_FILE_EXTENSIONS)[keyof typeof UPLOADABLE_FILE_EXTENSIONS];

/** An enumeration of file type categories which can be selected */
export const FILE_CATEGORIES: {
    HTML: typeof HTML_FILE_EXTENSIONS;
    IMAGE: typeof IMAGE_FILE_EXTENSIONS;
    VIDEO: typeof VIDEO_FILE_EXTENSIONS;
    AUDIO: typeof AUDIO_FILE_EXTENSIONS;
    TEXT: typeof TEXT_FILE_EXTENSIONS;
    FONT: typeof FONT_FILE_EXTENSIONS;
    GRAPHICS: typeof GRAPHICS_FILE_EXTENSIONS;
    MEDIA: typeof MEDIA_MIME_TYPES;
};

/** A font weight to name mapping. */
export const FONT_WEIGHTS: {
    Thin: 100;
    ExtraLight: 200;
    Light: 300;
    Regular: 400;
    Medium: 500;
    SemiBold: 600;
    Bold: 700;
    ExtraBold: 800;
    Black: 900;
};

/** Stores shared commonly used timeouts, measured in MS */
export const TIMEOUTS: {
    FOUNDRY_WEBSITE: 10000;
    PACKAGE_REPOSITORY: 5000;
    IP_DISCOVERY: 5000;
};

declare global {
    interface UserPermission {
        label: string;
        hint: string;
        disableGM: boolean;
        defaultRole: UserRole;
    }

    type ActiveEffectChangeMode = (typeof CONST.ACTIVE_EFFECT_MODES)[keyof typeof CONST.ACTIVE_EFFECT_MODES];
    type AudioFileExtension = keyof typeof AUDIO_FILE_EXTENSIONS;
    type CanvasPerformanceMode = (typeof CANVAS_PERFORMANCE_MODES)[keyof typeof CANVAS_PERFORMANCE_MODES];
    type ChatMessageType = (typeof CONST.CHAT_MESSAGE_TYPES)[keyof typeof CONST.CHAT_MESSAGE_TYPES];
    type CompatibilityMode = (typeof CONST.COMPATIBILITY_MODES)[keyof typeof CONST.COMPATIBILITY_MODES];
    type DocumentOwnershipLevel = (typeof DOCUMENT_OWNERSHIP_LEVELS)[DocumentOwnershipString];
    type DocumentOwnershipString = keyof typeof DOCUMENT_OWNERSHIP_LEVELS;
    type DrawingFillType = (typeof DRAWING_FILL_TYPES)[keyof typeof DRAWING_FILL_TYPES];
    type FileCategory = keyof typeof FILE_CATEGORIES;
    type FileExtension = keyof typeof UPLOADABLE_FILE_EXTENSIONS;
    type FolderDocumentType = (typeof FOLDER_DOCUMENT_TYPES)[number];
    type GridType = (typeof GRID_TYPES)[keyof typeof GRID_TYPES];
    type ImageFileExtension = keyof typeof IMAGE_FILE_EXTENSIONS;
    type JournalEntryPageFormat = (typeof JOURNAL_ENTRY_PAGE_FORMATS)[keyof typeof JOURNAL_ENTRY_PAGE_FORMATS];
    type MacroScope = (typeof MACRO_SCOPES)[number];
    type MacroType = (typeof MACRO_TYPES)[keyof typeof MACRO_TYPES];
    type MeasuredTemplateType = (typeof MEASURED_TEMPLATE_TYPES)[keyof typeof MEASURED_TEMPLATE_TYPES];
    type PackageType = (typeof PACKAGE_TYPES)[number];
    type PlaylistMode = (typeof PLAYLIST_MODES)[keyof typeof PLAYLIST_MODES];
    type PlaylistSortMode = (typeof PLAYLIST_SORT_MODES)[keyof typeof PLAYLIST_SORT_MODES];
    type RollMode = (typeof CONST.DICE_ROLL_MODES)[keyof typeof CONST.DICE_ROLL_MODES];
    type TableResultType = (typeof TABLE_RESULT_TYPES)[keyof typeof TABLE_RESULT_TYPES];
    type TextAnchorPoint = (typeof TEXT_ANCHOR_POINTS)[keyof typeof TEXT_ANCHOR_POINTS];
    type TileOcclusionMode = (typeof TILE_OCCLUSION_MODES)[keyof typeof TILE_OCCLUSION_MODES];
    type TokenDisplayMode = (typeof TOKEN_DISPLAY_MODES)[keyof typeof TOKEN_DISPLAY_MODES];
    type TokenDisposition = (typeof TOKEN_DISPOSITIONS)[keyof typeof TOKEN_DISPOSITIONS];
    type UserAction = "create" | "update" | "delete";
    type UserPermissionString = keyof typeof USER_PERMISSIONS;
    type UserRole = keyof typeof USER_ROLE_NAMES;
    type UserRoleName = keyof typeof USER_ROLES;
    type VideoFileExtension = keyof typeof VIDEO_FILE_EXTENSIONS;
    type WallDirection = (typeof WALL_DIRECTIONS)[keyof typeof WALL_DIRECTIONS];
    type WallDoorState = (typeof WALL_DOOR_STATES)[keyof typeof WALL_DOOR_STATES];
    type WallDoorType = (typeof WALL_DOOR_TYPES)[keyof typeof WALL_DOOR_TYPES];
    type WallMovementType = (typeof WALL_MOVEMENT_TYPES)[keyof typeof WALL_MOVEMENT_TYPES];
    type WallRestrictionType = (typeof WALL_RESTRICTION_TYPES)[number];
    type WallSenseType = (typeof WALL_SENSE_TYPES)[keyof typeof WALL_SENSE_TYPES];
    type DrawingShapeType = "r" | "e" | "t" | "p" | "f";
}
