import type { Document, EmbeddedCollection } from "./abstract/module.d.ts";

declare global {
    interface DocumentConstructionContext<TParent extends Document | null> {
        parent?: TParent;
        pack?: string | null;
        [key: string]: unknown;
    }

    interface DocumentModificationContext<TParent extends Document | null> {
        /** A parent Document within which these Documents should be embedded */
        parent?: TParent;
        /** Block the dispatch of preCreate hooks for this operation */
        noHook?: boolean;
        /** A Compendium pack identifier within which the Documents should be modified */
        pack?: string | null;
        /** Return an index of the Document collection, used only during a get operation. */
        index?: boolean;
        /** When performing a creation operation, keep the provided _id instead of clearing it. */
        keepId?: boolean;
        /** When performing a creation operation, keep existing _id values of documents embedded within the one being created instead of generating new ones. */
        keepEmbeddedIds?: boolean;
        /** Create a temporary document which is not saved to the database. Only used during creation. */
        temporary?: boolean;
        /** Automatically re-render existing applications associated with the document. */
        render?: boolean;
        /** Automatically create and render the Document sheet when the Document is first created. */
        renderSheet?: boolean;
        /** Difference each update object against current Document data to reduce the size of the transferred data. Only used during update. */
        diff?: boolean;
        /** Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution! */
        recursive?: boolean;
        /** Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation. */
        deleteAll?: boolean;
    }

    type DocumentUpdateContext<TParent extends Document | null> = Omit<
        DocumentModificationContext<TParent>,
        "deleteAll" | "index" | "keepId" | "keepEmbeddedIds" | "temporary"
    >;

    /* ----------------------------------------- */
    /*  Reusable Type Definitions                */
    /* ----------------------------------------- */

    /** A single point, expressed as an object {x, y} */
    type Point = PIXI.Point | { x: number; y: number };

    /** A single point, expressed as an array [x,y] */
    type PointArray = [number, number];

    /** A standard rectangle interface. */
    type Rectangle = PIXI.Rectangle | { x: number; y: number; width: number; height: number };

    /* ----------------------------------------- */
    /*  Settings Type Definitions                */
    /* ----------------------------------------- */

    /** A Client Setting */
    interface SettingConfig<
        TChoices extends Record<string, unknown> | undefined = Record<string, unknown> | undefined
    > {
        /** A unique machine-readable id for the setting */
        key: string;
        /** The namespace the setting belongs to */
        namespace: string;
        /** The human readable name */
        name: string;
        /** An additional human readable hint */
        hint?: string;
        /** The scope the Setting is stored in, either World or Client */
        scope: "world" | "client";
        /** Indicates if this Setting should render in the Config application */
        config: boolean;
        /** This will prompt the user to reload the application for the setting to take effect. */
        requiresReload?: boolean;
        /** The JS Type that the Setting is storing */
        type:
            | NumberConstructor
            | StringConstructor
            | BooleanConstructor
            | ObjectConstructor
            | ArrayConstructor
            | FunctionConstructor;
        /** For string Types, defines the allowable values */
        choices?: TChoices;
        /** For numeric Types, defines the allowable range */
        range?: this["type"] extends NumberConstructor ? { min: number; max: number; step: number } : never;
        /** The default value */
        default: number | string | boolean | object | Function;
        /** Executes when the value of this Setting changes */
        onChange?: (
            choice: TChoices extends Record<string, unknown> ? keyof TChoices : undefined
        ) => void | Promise<void>;
    }

    interface SettingSubmenuConfig {
        /** The human readable name */
        name: string;
        /** The human readable label */
        label: string;
        /** An additional human readable hint */
        hint: string;
        /** The classname of an Icon to render */
        icon: string;
        /** The FormApplication to render */
        type: SettingsMenuConstructor;
        /** If true, only a GM can edit this Setting */
        restricted: boolean;
    }

    interface SettingsMenuConstructor {
        new (object?: object, options?: FormApplicationOptions): FormApplication;
        registerSettings(): void;
    }

    /** A Client Keybinding Action Configuration */
    interface KeybindingActionConfig {
        /** The namespace within which the action was registered */
        namespace?: string;
        /** The human readable name */
        name: string;
        /** An additional human readable hint */
        hint?: string;
        /** The default bindings that can never be changed nor removed. */
        uneditable?: KeybindingActionBinding[];
        /** The default bindings that can be changed by the user. */
        editable?: KeybindingActionBinding[];
        /** A function to execute when a key down event occurs. If True is returned, the event is consumed and no further keybinds execute. */
        onDown?: (context: KeyboardEventContext) => boolean | void;
        /** A function to execute when a key up event occurs. If True is returned, the event is consumed and no further keybinds execute. */
        onUp?: (context: KeyboardEventContext) => boolean | void;
        /** If True, allows Repeat events to execute the Action's onDown. Defaults to false. */
        repeat?: boolean;
        /** If true, only a GM can edit and execute this Action */
        restricted?: boolean;
        /** Modifiers such as [ "CONTROL" ] that can be also pressed when executing this Action. Prevents using one of these modifiers as a Binding. */
        reservedModifiers?: ModifierKey[];
        /** The preferred precedence of running this Keybinding Action */
        precedence?: number;
        /** The recorded registration order of the action */
        order?: number;
    }

    interface KeybindingActionBinding {
        /** The KeyboardEvent#code value from https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values */
        key: string | null;
        /** An array of modifiers keys from KeyboardManager.MODIFIER_KEYS which are required for this binding to be activated */
        modifiers: ModifierKey[];
    }

    /** An action that can occur when a key is pressed */
    interface KeybindingAction {
        /** The namespaced machine identifier of the Action */
        action: string;
        /** The Keyboard key */
        key: string;
        /** The human readable name */
        name: string;
        /** Required modifiers */
        requiredModifiers?: ModifierKey[];
        /** Optional (reserved) modifiers */
        optionalModifiers?: ModifierKey[];
        /** The handler that executes onDown */
        onDown?: (...args: unknown[]) => boolean;
        /** The handler that executes onUp */
        onUp?: (...args: unknown[]) => boolean;
        /** If True, allows Repeat events to execute this Action's onDown */
        repeat?: boolean;
        /** If true, only a GM can execute this Action */
        restricted?: boolean;
        /** The registration precedence */
        precedence?: number;
        /** The registration order */
        order?: number;
    }

    /** Keyboard event context */
    interface KeyboardEventContext {
        /** The normalized string key, such as "A" */
        key: string;
        /** The originating keypress event */
        event: KeyboardEvent;
        /** Is the Shift modifier being pressed */
        isShift: boolean;
        /** Is the Control or Meta modifier being processed */
        isControl: boolean;
        /** Is the Alt modifier being pressed */
        isAlt: boolean;
        /** Are any of the modifiers being pressed */
        hasModifiers: boolean;
        /** A list of string modifiers applied to this context, such as [ "CONTROL" ] */
        modifiers: ModifierKey[];
        /** True if the Key is Up, else False if down */
        up: boolean;
        /** True if the given key is being held down such that it is automatically repeating. */
        repeat: boolean;
        /** The executing Keybinding Action. May be undefined until the action is known. */
        action?: string;
    }

    interface ConnectedGamepad {
        /** A map of axes values */
        axes: Map<string, number>;
        /** The Set of pressed Buttons */
        activeButtons: Set<string>;
    }

    type RequestData = object | object[] | string | string[];

    interface SocketRequest {
        /** The type of object being modified */
        type?: string;
        /** The server-side action being requested */
        action?: string;
        /** Data applied to the operation */
        data?: RequestData;
        query?: object;
        /** The type of parent document */
        parentType?: string;
        /** The ID of a parent document */
        parentId?: string;
        /** A Compendium pack name */
        pack?: string;
        /** Additional options applied to the request */
        options?: object;
    }

    interface SocketResponse {
        /** The initial request */
        request: SocketRequest;
        /** An error, if one occurred */
        error?: Error;
        /** The status of the request */
        status?: string;
        /** The ID of the requesting User */
        userId?: string;
        /** Data returned as a result of the request */
        data?: RequestData;
    }
}
