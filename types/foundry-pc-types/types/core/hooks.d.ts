interface DropCanvasData {
    type: string;
    id: string;
    data?: any;
    pack?: string;
    x: number;
    y: number;
    actorId?: string;
}

declare type HookCallback<P extends any[]> = (...args: P) => boolean | void | Promise<boolean | void>;
declare type HookParameters<H extends string, C extends any[]> = [hook: H, callback: HookCallback<C>];
declare type HookParamsSetup = HookParameters<'setup', never>;
declare type HookParamsInit = HookParameters<'init', never>;
declare type HookParamsReady = HookParameters<'ready', never>;
declare type HookParamsCanvasReady = HookParameters<'canvasReady', [Canvas]>;
declare type HookParamsDropCanvasData = HookParameters<'dropCanvasData', [Canvas, DropCanvasData]>;
declare type HookParamsRenderChatLog = HookParameters<
    'renderChatLog', [ChatLog, JQuery, ReturnType<ChatLog['getData']>]
>;
declare type HookParamsRenderChatPopout = HookParameters<
    'renderChatPopout', [ChatPopout, JQuery, {}]
>;
declare type HookParamsRenderChatMessage = HookParameters<
    'renderChatMessage', [ChatMessage, JQuery, ChatMessageData]
>;
declare type HookParamsRenderCompendiumDirectory = HookParameters<
    'renderCompendiumDirectory', [CompendiumDirectory, JQuery, ReturnType<CompendiumDirectory['getData']>]
>;
declare type HookParamsRenderActorDirectory = HookParameters<
    'renderActorDirectory', [ActorDirectory, JQuery, ReturnType<ActorDirectory['getData']>]
>;
declare type HookParamsRenderItemDirectory = HookParameters<
    'renderItemDirectory', [ItemDirectory, JQuery, ReturnType<ItemDirectory['getData']>]
>;

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
    static on(...args: HookParamsRenderChatLog): number;
    static on(...args: HookParamsRenderChatPopout): number;
    static on(...args: HookParamsRenderChatMessage): number;
    static on(...args: HookParamsRenderCompendiumDirectory): number;
    static on(...args: HookParamsRenderActorDirectory): number;
    static on(...args: HookParamsRenderItemDirectory): number;
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
    static once(...args: HookParamsRenderChatMessage): number;
    static once(...args: HookParamsRenderChatPopout): number;
    static once(...args: HookParamsRenderCompendiumDirectory): number;
    static once(...args: HookParamsRenderActorDirectory): number;
    static once(...args: HookParamsRenderItemDirectory): number;
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
