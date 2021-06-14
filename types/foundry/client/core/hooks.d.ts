interface DropCanvasData<T extends foundry.abstract.DocumentSource> {
    type: string;
    id: string;
    data?: PreCreate<T>;
    pack?: string;
    x: number;
    y: number;
    actorId?: string;
    tokenId?: string;
}

declare type HookCallback<P extends any[]> = (...args: P) => boolean | void | Promise<boolean | void>;
declare type HookParameters<H extends string, C extends any[]> = [hook: H, callback: HookCallback<C>];
declare type HookParamsInit = HookParameters<'init', never>;
declare type HookParamsSetup = HookParameters<'setup', never>;
declare type HookParamsReady = HookParameters<'ready', never>;
declare type HookParamsCanvasReady = HookParameters<'canvasReady', [Canvas]>;
declare type HookParamsDeleteCombat = HookParameters<'deleteCombat', [Combat, { [key: string]: any }, string]>;
declare type HookParamsDropCanvasData = HookParameters<'dropCanvasData', [Canvas, DropCanvasData<any>]>;
declare type HookParamsGetChatLogEntryContext = HookParameters<
    'getChatLogEntryContext',
    [JQuery, EntryContextOption[]]
>;
declare type HookParamsHotbarDrop = HookParameters<'hotbarDrop', [Hotbar, unknown, string]>;
declare type HookParamsPreCreateItem = HookParameters<
    'preCreateItem',
    [PreCreate<foundry.data.ItemSource>, DocumentModificationContext, string]
>;
declare type HooksParamsPreUpdateCombat = HookParameters<
    'preUpdateCombat',
    [Combat, object, { diff: boolean; advanceTime: number; [key: string]: any }, string]
>;
declare type HookParamsPreUpdateToken = HookParameters<
    'preUpdateToken',
    [Scene, foundry.data.TokenData, Partial<foundry.data.TokenData>, { diff: boolean; [key: string]: any }, string]
>;
declare type HookParamsRender<T extends Application, N extends string> = HookParameters<
    `render${N}`,
    [T, JQuery, ReturnType<T['getData']>]
>;
declare type HookParamsRenderChatMessage = HookParameters<
    'renderChatMessage',
    [ChatMessage, JQuery, foundry.data.ChatMessageSource]
>;
declare type HookParamsUpdateCombat = HookParameters<
    'updateCombat',
    [Combat, object, { diff: boolean; advanceTime: number; [key: string]: any }, string]
>;
declare type HookParamsUpdateWorldTime = HookParameters<'updateWorldTime', [number, number]>;

declare class Hooks {
    /**
     * Register a callback handler which should be triggered when a hook is triggered.
     *
     * @param hook The unique name of the hooked event
     * @param fn   The callback function which should be triggered when the hook event occurs
     */
    static on(...args: HookParamsSetup): number;
    static on(...args: HookParamsInit): number;
    static on(...args: HookParamsReady): number;
    static on(...args: HookParamsCanvasReady): number;
    static on(...args: HookParamsDropCanvasData): number;
    static on(...args: HookParamsHotbarDrop): number;
    static on(...args: HookParamsGetChatLogEntryContext): number;
    static on(...args: HookParamsPreCreateItem): number;
    static on(...args: HooksParamsPreUpdateCombat): number;
    static on(...args: HookParamsPreUpdateToken): number;
    static on(...args: HookParamsRenderChatMessage): number;
    static on(...args: HookParamsRender<ChatLog, 'ChatLog'>): number;
    static on(...args: HookParamsRender<ChatPopout, 'ChatPopout'>): number;
    static on(...args: HookParamsRender<CompendiumDirectory, 'CompendiumDirectory'>): number;
    static on(...args: HookParamsRender<ActorDirectory, 'ActorDirectory'>): number;
    static on(...args: HookParamsRender<ItemDirectory, 'ItemDirectory'>): number;
    static on(...args: HookParamsRender<Settings, 'Settings'>): number;
    static on(...args: HookParamsUpdateCombat): number;
    static on(...args: HookParamsUpdateWorldTime): number;
    static on(...args: HookParameters<string, any>): number;

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
    static once(...args: HookParamsCanvasReady): number;
    static once(...args: HookParamsDropCanvasData): number;
    static once(...args: HookParamsHotbarDrop): number;
    static once(...args: HookParamsGetChatLogEntryContext): number;
    static once(...args: HookParamsPreCreateItem): number;
    static once(...args: HookParamsPreUpdateToken): number;
    static once(...args: HookParamsRenderChatMessage): number;
    static once(...args: HookParamsRender<ChatLog, 'ChatLog'>): number;
    static once(...args: HookParamsRender<ChatPopout, 'ChatPopout'>): number;
    static once(...args: HookParamsRender<CompendiumDirectory, 'CompendiumDirectory'>): number;
    static once(...args: HookParamsRender<ActorDirectory, 'ActorDirectory'>): number;
    static once(...args: HookParamsRender<ItemDirectory, 'ItemDirectory'>): number;
    static once(...args: HookParamsRender<Settings, 'Settings'>): number;
    static once(...args: HookParamsUpdateWorldTime): number;
    static once(...args: HookParameters<string, any>): number;

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

    static callAll(hook: string, ...args: any[]): boolean;

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
    static call(hook: string, ...args: any[]): boolean;
}
