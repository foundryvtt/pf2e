declare module foundry {
    module documents {
        /** The base Cards definition which defines common behavior of an Cards document shared by both client and server. */
        class BaseCards extends abstract.Document {
            static override get schema(): ConstructorOf<abstract.DocumentData>;

            static override get metadata(): abstract.DocumentMetadata;

            /** The sub-type of Card. */
            get type(): string;

            /** Is a User able to create a new embedded Card document within this parent? */
            protected static _canCreate(user: BaseUser, doc: BaseCards, data: object): boolean;

            /** Is a user able to update an existing Card? */
            protected static _canUpdate(user: BaseUser, doc: BaseCards, data: object): boolean;

            override testUserPermission(
                user: BaseUser,
                permission: DocumentOwnershipString | DocumentOwnershipLevel,
                { exact }?: { exact?: boolean }
            ): boolean;
        }

        interface BaseCards extends abstract.Document {
            readonly data: data.CardsData<this>;

            get documentName(): "Cards";
        }
    }
}
