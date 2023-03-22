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
        class BaseAdventure extends abstract.Document<null> {
            static override get metadata(): AdventureMetadata;

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

            getUserLevel(user: BaseUser): DocumentOwnershipLevel;

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

        interface BaseAdventure extends abstract.Document<null> {
            readonly _source: AdventureSource;

            get documentName(): "Adventure";
        }

        interface AdventureMetadata extends abstract.DocumentMetadata {
            name: "Adventure";
            collection: "Adventures";
            label: "DOCUMENT.Adventure";
            isPrimary: true;
        }

        interface AdventureSource {
            _id: string;
            avatar: ImageFilePath;
            img: ImageFilePath;
            character: string | null;
            color: HexColorString;
            hotbar: Record<number, string>;
            name: string;
            password: string;
            role: UserRole;
            flags: DocumentFlags;
        }
    }
}
