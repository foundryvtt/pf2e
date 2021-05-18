/**
 * The Collection of User documents which exist within the active World.
 * This Collection is accessible within the Game object as game.users.
 * @extends {WorldCollection}
 *
 * @see {@link User} The User entity
 * @see {@link UserDirectory} The UserDirectory sidebar directory
 */
declare class Users<UserType extends User> extends WorldCollection<UserType> {
    get documentName(): 'User';

    /** The User entity of the currently connected user */
    current: UserType | null;

    /**
     * Initialize the Map object and all its contained entities
     * @param data
     * @override
     */
    protected _initialize(data: foundry.data.UserSource[]): void;

    /** @override */
    static documentName: 'User';

    /**
     * Get the users with player roles
     */
    get players(): UserType[];

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    /**
     * Handle receipt of activity data from another User connected to the Game session
     * @param userId        The User id who generated the activity data
     * @param activityData  The object of activity data
     */
    static _handleUserActivity(userId: string, activityData?: object): void;
}
