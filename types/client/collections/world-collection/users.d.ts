/**
 * The Collection of User documents which exist within the active World.
 * This Collection is accessible within the Game object as game.users.
 * @see {@link User} The User entity
 * @see {@link UserDirectory} The UserDirectory sidebar directory
 */
declare class Users<TUser extends User = User> extends WorldCollection<TUser> {
    /** @override */
    constructor(data?: foundry.data.UserSource[]);

    /** The User entity of the currently connected user */
    current: TUser | null;

    /** @override */
    protected _initialize(data: TUser['data']['_source'][]): void;

    /** @override */
    static documentName: 'User';

    /** Get the users with player roles */
    get players(): TUser[];

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    /** @override */
    protected static _activateSocketListeners(socket: SocketIO.Socket): void;

    /**
     * Handle receipt of activity data from another User connected to the Game session
     * @param {string} userId         The User id who generated the activity data
     * @param {Object} activityData   The object of activity data
     * @private
     */
    protected static _handleUserActivity(userId: string, activityData?: UserActivity): void;
}
