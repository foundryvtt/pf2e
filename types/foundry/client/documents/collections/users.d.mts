import { User, UserSource } from "../_module.mjs";
import WorldCollection from "../abstract/world-collection.mjs";
import { UserActivity } from "../user.mjs";

/**
 * The Collection of User documents which exist within the active World.
 * This Collection is accessible within the Game object as game.users.
 * @see {@link User} The User entity
 * @see {@link UserDirectory} The UserDirectory sidebar directory
 */
export default class Users<TUser extends User = User> extends WorldCollection<TUser> {
    constructor(data?: foundry.documents.UserSource[]);

    /**
     * The User document of the currently connected user
     */
    current: TUser | null;

    protected override _initialize(data: UserSource[]): void;

    static override documentName: "User";

    /** Get the users with player roles */
    get players(): TUser[];

    /**
     * Get one User who is an active Gamemaster, or null if no active GM is available.
     * This can be useful for workflows which occur on all clients, but where only one user should take action.
     */
    get activeGM(): TUser | null;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    protected static _activateSocketListeners(socket: io.Socket): void;

    /**
     * Handle receipt of activity data from another User connected to the Game session
     * @param userId       The User id who generated the activity data
     * @param activityData The object of activity data
     */
    protected static _handleUserActivity(userId: string, activityData?: UserActivity): void;
}
