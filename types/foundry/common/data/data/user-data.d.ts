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
            avatar: ImageFilePath;
            img: ImageFilePath;
            character: string | null;
            color: HexColorString;
            hotbar: Record<number, string>;
            name: string;
            password: string;
            role: UserRole;
            flags: Record<string, Record<string, unknown>>;
        }

        class UserData<
            TDocument extends documents.BaseUser = documents.BaseUser
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            character: documents.BaseActor | null;
        }

        interface UserData extends Omit<UserSource, "character"> {
            readonly _source: UserSource;
        }
    }
}
