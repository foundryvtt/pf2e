declare type UserRole = keyof typeof CONST.USER_ROLES_NAMES;
declare type UserRoleName = keyof typeof CONST.USER_ROLES;

declare module foundry {
    module data {
        /**
         * The data schema for a User document
         * @see BaseUser
         *
         * @param data Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         */
        interface UserSource {
            _id: string;
            avatar: ImagePath;
            img: ImagePath;
            character: string | null;
            color: string;
            hotbar: Record<number, string>;
            name: string;
            password: string;
            role: UserRole;
            flags: Record<string, unknown>;
        }

        class UserData<
            TDocument extends documents.BaseUser = documents.BaseUser,
        > extends abstract.DocumentData<TDocument> {
            /** @override */
            static defineSchema(): abstract.DocumentSchema;
        }

        interface UserData extends Omit<UserSource, '_id' | 'character'> {
            _source: UserSource;
            character: documents.BaseActor | null;
        }
    }
}
