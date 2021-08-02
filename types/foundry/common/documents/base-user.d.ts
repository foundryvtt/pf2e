declare module foundry {
    module documents {
        /**
         * The base User document, which is extended by both the server and client.
         * This base User provides shared functionality which is consistent for both sides of the application.
         * Each client who connects to a Foundry Virtual Tabletop session assumes the identity of one (and only one) User.
         *
         * @param data                 Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseUser extends abstract.Document {
            constructor(data: PreCreate<data.UserSource>, context?: DocumentConstructionContext);

            readonly role: UserRole;

            static override get schema(): typeof data.UserData;

            static override get metadata(): UserMetadata;

            /* ---------------------------------------- */
            /*  Permissions                             */
            /* ---------------------------------------- */

            /** Test whether the User has a GAMEMASTER or ASSISTANT role in this World? */
            get isGM(): boolean;

            /**
             * Test whether the User is able to perform a certain permission action.
             * The provided permission string may pertain to an explicit permission setting or a named user role.
             * Alternatively, Gamemaster users are assumed to be allowed to take all actions.
             *
             * @param action The action to test
             * @return Does the user have the ability to perform this action?
             */
            can(action: UserAction): boolean;

            getUserLevel(user: this): PermissionLevel;

            /**
             * Test whether the User has at least a specific permission
             * @param permission The permission name from USER_PERMISSIONS to test
             * @return Does the user have at least this permission
             */
            hasPermission(permission: UserPermission): boolean;

            /**
             * Test whether the User has at least the permission level of a certain role
             * @param role The role name from USER_ROLES to test
             * @param [exact] Require the role match to be exact
             * @return Does the user have at this role level (or greater)?
             */
            hasRole(role: UserRole | UserRoleName, { exact }?: { exact: boolean }): boolean;
        }

        interface BaseUser {
            readonly data: data.UserData<this>;

            readonly parent: null;
        }

        interface UserMetadata extends abstract.DocumentMetadata {
            name: "User";
            collection: "users";
            label: "DOCUMENT.User";
            isPrimary: true;
        }
    }
}
