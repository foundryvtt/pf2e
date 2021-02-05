/**
 * A singleton class {@link game#time} which keeps the official Server and World time stamps.
 * Uses a basic implementation of https://www.geeksforgeeks.org/cristians-algorithm/ for synchronization.
 */
declare class GameTime {
    /**
     * The most recently synchronized timestamps retrieved from the server.
     */
    _time?: {
        clientTime: number;
        serverTime: number;
        worldTime: number;
    };

    /**
     * The average one-way latency across the most recent 5 trips
     */
    protected _dt: number;

    /**
     * The most recent five synchronization durations
     */
    protected _dts: number[];

    /**
     * The amount of time to delay before re-syncing the official server time.
     */
    static SYNC_INTERVAL_MS: number;

    constructor(socket?: WebSocket);

    /**
     * The current server time based on the last synchronization point and the approximated one-way latency.
     */
    get serverTime(): number;

    /**
     * The current World time based on the last recorded value of the core.time setting
     */
    get worldTime(): number;

    /**
     * Advance the game time by a certain number of seconds
     * @param seconds The number of seconds to advance (or rewind if negative) by
     * @return The new game time
     */
    advance(seconds: number): Promise<number>;

    /**
     * Synchronize the local client game time with the official time kept by the server
     */
    sync(socket: WebSocket | null): Promise<GameTime>;

    /**
     * Handle follow-up actions when the official World time is changed
     * @param worldTime The new canonical World time.
     */
    onUpdateWorldTime(worldTime: number): void;
}
