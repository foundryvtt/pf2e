import { UserConstructor } from './constructors';

declare global {
    /**
     * The client-side User document which extends the common BaseUser abstraction.
     * Each User document contains UserData which defines its data schema.
     * @see {@link data.UserData}               The User data schema
     * @see {@link documents.Users}             The world-level collection of User documents
     * @see {@link applications.UserConfig}     The User configuration application
     */
    class User<TActor extends Actor = Actor> extends UserConstructor {
        /** @override */
        constructor(data: PreCreate<foundry.data.UserSource>, context?: DocumentConstructionContext<User>);

        /** Track whether the user is currently active in the game */
        active: boolean;

        /** Track references to the current set of Tokens which are targeted by the User */
        targets: Set<NonNullable<NonNullable<TActor['parent']>['_object']>>;

        /** Track the ID of the Scene that is currently being viewed by the User */
        viewedScene: string | null;

        /* ---------------------------------------- */
        /*  User Properties                         */
        /* ---------------------------------------- */

        /** Return the User avatar icon or the controlled actor's image */
        get avatar(): string;

        /** Return the Actor instance of the user's impersonated character (or undefined) */
        get character(): TActor | undefined;

        /** A convenience shortcut for the permissions object of the current User */
        get permissions(): Record<string, PermissionLevel>;

        /** A flag for whether the current User is a Trusted Player */
        get isTrusted(): boolean;

        /** A flag for whether this User is the connected client */
        get isSelf(): boolean;

        /**
         * Assign a Macro to a numbered hotbar slot between 1 and 50
         * @param macro      The Macro entity to assign
         * @param [slot]     A specific numbered hotbar slot to fill
         * @param [fromSlot] An optional origin slot from which the Macro is being shifted
         * @return A Promise which resolves once the User update is complete
         */
        assignHotbarMacro(
            macro: Macro | null,
            slot?: number | string,
            { fromSlot }?: { fromSlot: number },
        ): Promise<this>;

        /**
         * Assign a specific boolean permission to this user.
         * Modifies the user permissions to grant or restrict access to a feature.
         *
         * @param permission The permission name from USER_PERMISSIONS
         * @param allowed    Whether to allow or restrict the permission
         */
        assignPermission(permission: UserPermission, allowed: boolean): Promise<this | undefined>;

        /**
         * Submit User activity data to the server for broadcast to other players.
         * This type of data is transient, persisting only for the duration of the session and not saved to any database.
         *
         * @param activityData An object of User activity data to submit to the server for broadcast.
         * @param activityData.cursor  The coordinates of the user's cursor
         * @param activityData.focus   Is the user pulling focus to the cursor coordinates?
         * @param activityData.ping    Is the user emitting a ping at the cursor coordinates?
         * @param activityData.ruler   Serialized Ruler coordinate data in JSON format
         * @param activityData.sceneId The id of the Scene currently being viewed by the User
         * @param activityData.targets An id of Token ids which are targeted by the User
         */
        broadcastActivity(activityData?: UserActivity): void;

        /**
         * Get an Array of Macro Entities on this User's Hotbar by page
         * @param page The hotbar page number
         */
        getHotbarMacros(page?: number): object[];

        /**
         * Update the set of Token targets for the user given an array of provided Token ids.
         * @param targetIds An array of Token ids which represents the new target set
         */
        updateTokenTargets(targetIds?: string[]): void;

        protected override _onUpdate(
            changed: DeepPartial<this['data']['_source']>,
            options: DocumentModificationContext,
            userId: string,
        ): void;

        protected override _onDelete(options: DocumentModificationContext, userId: string): void;
    }

    interface UserActivity {
        cursor?: object;
        focus?: boolean;
        ping?: boolean;
        ruler?: string;
        sceneId?: string;
        target?: string[];
    }
}
