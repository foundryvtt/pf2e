declare module foundry {
    module documents {
        /** The Macro document model. */
        class BaseMacro extends abstract.Document<null> {
            static override get metadata(): MacroMetadata;

            protected override _preCreate(
                data: PreDocumentId<MacroSource>,
                options: DocumentModificationContext<null>,
                user: BaseUser
            ): Promise<void>;

            /** Is a user able to update an existing Macro document? */
            protected static _canUpdate(user: BaseUser, doc: BaseMacro, data: MacroSource): boolean;

            /** Is a user able to delete an existing Macro document? */
            protected static _canDelete(user: BaseUser, doc: BaseMacro): boolean;
        }

        interface BaseMacro extends abstract.Document<null> {
            readonly _source: MacroSource;

            get documentName(): (typeof BaseMacro)["metadata"]["name"];
        }

        interface MacroSource {
            _id: string;
            name: string;
            type: "chat" | "script";
            img: ImageFilePath;
            actorIds: string[];
            author: string;
            command: string;
            scope: string;
            folder?: string | null;
            sort: number;
            ownership: Record<string, DocumentOwnershipLevel>;
            flags: DocumentFlags;
        }

        interface MacroMetadata extends abstract.DocumentMetadata {
            name: "Macro";
            collection: "macros";
            label: "DOCUMENT.Macro";
            isPrimary: true;
            types: ["script", "chat"];
            permissions: {
                create: "PLAYER";
                update: (typeof BaseMacro)["_canUpdate"];
                delete: (typeof BaseMacro)["_canDelete"];
            };
        }
    }
}
