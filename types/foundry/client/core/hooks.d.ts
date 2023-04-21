export {};
declare global {
    type HookCallback<P extends unknown[]> = (...args: P) => boolean | void | Promise<boolean | void>;
    type HookParameters<H extends string, C extends unknown[]> = [hook: H, callback: HookCallback<C>];

    // Sequence of hooks called on world load
    type HookParamsInit = HookParameters<"init", never>;
    type HookParamsSetup = HookParameters<"setup", never>;
    type HookParamsCanvasInit = HookParameters<"canvasInit", [DrawnCanvas]>;
    type HookParamsCanvasReady = HookParameters<"canvasReady", [DrawnCanvas]>;
    type HookParamsReady = HookParameters<"ready", never>;

    type HookParamsClose<T extends Application, N extends string> = HookParameters<`close${N}`, [T, JQuery]>;
    type HookParamsDeleteCombat = HookParameters<"deleteCombat", [Combat, { [key: string]: unknown }, string]>;
    type HookParamsDropCanvasData = HookParameters<"dropCanvasData", [Canvas, DropCanvasData]>;
    type HookParamsGetChatLogEntryContext = HookParameters<"getChatLogEntryContext", [JQuery, EntryContextOption[]]>;
    type HookParamsGetSceneControlButtons = HookParameters<"getSceneControlButtons", [SceneControl[]]>;
    type HookParamsHotbarDrop = HookParameters<"hotbarDrop", [Hotbar, unknown, string]>;
    type HookParamsLightingRefresh = HookParameters<"lightingRefresh", [LightingLayer]>;
    type HookParamsPreCreateItem = HookParameters<
        "preCreateItem",
        [
            PreCreate<foundry.documents.ItemSource>,
            DocumentModificationContext<Actor<TokenDocument<Scene | null> | null> | null>,
            string
        ]
    >;
    type HooksParamsPreUpdateCombat = HookParameters<
        "preUpdateCombat",
        [Combat, object, { diff: boolean; advanceTime: number; [key: string]: unknown }, string]
    >;
    type HookParamsPreUpdateToken = HookParameters<
        "preUpdateToken",
        [
            Scene,
            foundry.documents.TokenSource,
            DeepPartial<foundry.documents.TokenSource>,
            { diff: boolean; [key: string]: unknown },
            string
        ]
    >;
    type HookParamsRender<T extends Application, N extends string> = HookParameters<
        `render${N}`,
        [T, JQuery, ReturnType<T["getData"]>]
    >;
    type HookParamsRenderChatMessage = HookParameters<
        "renderChatMessage",
        [ChatMessage, JQuery, foundry.documents.ChatMessageSource]
    >;
    type HookParamsTargetToken = HookParameters<"targetToken", [User, Token<TokenDocument<Scene>>, boolean]>;
    type HookParamsUpdate<T extends foundry.abstract.Document, N extends string> = HookParameters<
        `update${N}`,
        [T, DocumentUpdateData<T>, DocumentModificationContext<T["parent"]>]
    >;
    type HookParamsUpdateWorldTime = HookParameters<"updateWorldTime", [number, number]>;

    class Hooks {
        /**
         * Register a callback handler which should be triggered when a hook is triggered.
         *
         * @param hook The unique name of the hooked event
         * @param fn   The callback function which should be triggered when the hook event occurs
         */
        static on(...args: HookParamsSetup): number;
        static on(...args: HookParamsInit): number;
        static on(...args: HookParamsReady): number;
        static on(...args: HookParamsCanvasInit): number;
        static on(...args: HookParamsCanvasReady): number;
        static on(...args: HookParamsClose<CombatTrackerConfig, "CombatTrackerConfig">): number;
        static on(...args: HookParamsDropCanvasData): number;
        static on(...args: HookParamsGetChatLogEntryContext): number;
        static on(...args: HookParamsGetSceneControlButtons): number;
        static on(...args: HookParamsHotbarDrop): number;
        static on(...args: HookParamsLightingRefresh): number;
        static on(...args: HookParamsPreCreateItem): number;
        static on(...args: HooksParamsPreUpdateCombat): number;
        static on(...args: HookParamsPreUpdateToken): number;
        static on(...args: HookParamsRenderChatMessage): number;
        static on(...args: HookParamsRender<ChatLog, "ChatLog">): number;
        static on(...args: HookParamsRender<ChatPopout, "ChatPopout">): number;
        static on(...args: HookParamsRender<CombatTrackerConfig, "CombatTrackerConfig">): number;
        static on(...args: HookParamsRender<CompendiumDirectory, "CompendiumDirectory">): number;
        static on(...args: HookParamsRender<Dialog, "Dialog">): number;
        static on(...args: HookParamsRender<ActorDirectory<Actor<null>>, "ActorDirectory">): number;
        static on(...args: HookParamsRender<ItemDirectory<Item<null>>, "ItemDirectory">): number;
        static on(...args: HookParamsRender<SceneControls, "SceneControls">): number;
        static on(...args: HookParamsRender<Settings, "Settings">): number;
        static on(...args: HookParamsRender<TokenHUD, "TokenHUD">): number;
        static on(
            ...args: HookParamsRender<JournalPageSheet<JournalEntryPage<JournalEntry | null>>, "JournalPageSheet">
        ): number;
        static on(
            ...args: HookParamsRender<
                JournalTextPageSheet<JournalEntryPage<JournalEntry | null>>,
                "JournalTextPageSheet"
            >
        ): number;
        static on(...args: HookParamsTargetToken): number;
        static on(...args: HookParamsUpdate<Combat, "Combat">): number;
        static on(...args: HookParamsUpdate<Scene, "Scene">): number;
        static on(...args: HookParamsUpdateWorldTime): number;
        static on(...args: HookParameters<string, unknown[]>): number;

        /**
         * Register a callback handler for an event which is only triggered once the first time the event occurs.
         * After a "once" hook is triggered the hook is automatically removed.
         *
         * @param hook  The unique name of the hooked event
         * @param fn    The callback function which should be triggered when the hook event occurs
         */
        static once(...args: HookParamsSetup): number;
        static once(...args: HookParamsInit): number;
        static once(...args: HookParamsReady): number;
        static once(...args: HookParamsCanvasInit): number;
        static once(...args: HookParamsCanvasReady): number;
        static once(...args: HookParamsClose<CombatTrackerConfig, "CombatTrackerConfig">): number;
        static once(...args: HookParamsDropCanvasData): number;
        static once(...args: HookParamsGetChatLogEntryContext): number;
        static once(...args: HookParamsGetSceneControlButtons): number;
        static once(...args: HookParamsHotbarDrop): number;
        static once(...args: HookParamsLightingRefresh): number;
        static once(...args: HookParamsPreCreateItem): number;
        static once(...args: HookParamsPreUpdateToken): number;
        static once(...args: HookParamsRenderChatMessage): number;
        static once(...args: HookParamsRender<ActorDirectory<Actor<null>>, "ActorDirectory">): number;
        static once(...args: HookParamsRender<ChatLog, "ChatLog">): number;
        static once(...args: HookParamsRender<ChatPopout, "ChatPopout">): number;
        static once(...args: HookParamsRender<CombatTrackerConfig, "CombatTrackerConfig">): number;
        static once(...args: HookParamsRender<CompendiumDirectory, "CompendiumDirectory">): number;
        static once(...args: HookParamsRender<Dialog, "Dialog">): number;
        static once(...args: HookParamsRender<ItemDirectory<Item<null>>, "ItemDirectory">): number;
        static once(
            ...args: HookParamsRender<JournalPageSheet<JournalEntryPage<JournalEntry | null>>, "JournalPageSheet">
        ): number;
        static once(
            ...args: HookParamsRender<
                JournalTextPageSheet<JournalEntryPage<JournalEntry | null>>,
                "JournalTextPageSheet"
            >
        ): number;
        static once(...args: HookParamsRender<SceneControls, "SceneControls">): number;
        static once(...args: HookParamsRender<Settings, "Settings">): number;
        static once(...args: HookParamsRender<TokenHUD, "TokenHUD">): number;
        static once(...args: HookParamsTargetToken): number;
        static once(...args: HookParamsUpdate<Combat, "Combat">): number;
        static once(...args: HookParamsUpdate<Scene, "Scene">): number;
        static once(...args: HookParamsUpdateWorldTime): number;
        static once(...args: HookParameters<string, unknown[]>): number;

        /**
         * Unregister a callback handler for a particular hook event
         *
         * @param hook  The unique name of the hooked event
         * @param fn    The function that should be removed from the set of hooked callbacks
         */
        static off(hook: string, fn: Function): void;

        /**
         * Call all hook listeners in the order in which they were registered
         * Hooks called this way can not be handled by returning false and will always trigger every hook callback.
         *
         * @param hook  The hook being triggered
         * @param args  Arguments passed to the hook callback functions
         */
        static callAll(hook: string, ...args: unknown[]): boolean;

        /**
         * Call hook listeners in the order in which they were registered.
         * Continue calling hooks until either all have been called or one returns `false`.
         *
         * Hook listeners which return `false` denote that the original event has been adequately handled and no further
         * hooks should be called.
         *
         * @param hook  The hook being triggered
         * @param args  Arguments passed to the hook callback functions
         */
        static call(hook: string, ...args: unknown[]): boolean;
    }

    interface DropCanvasData<T extends string = string, D extends object = object> {
        type?: T;
        data?: D extends foundry.abstract.Document ? D["_source"] : D;
        uuid?: DocumentUUID;
        id?: string;
        pack?: string;
        x: number;
        y: number;
        documentName?: string;
        actorId?: string;
        tokenId?: string;
    }
}
