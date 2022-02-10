declare module foundry {
    module documents {
        /** The Macro document model. */
        class BaseMacro extends abstract.Document {
            static override get schema(): typeof data.MacroData;

            static override get metadata(): MacroMetadata;

            protected override _preCreate(
                data: PreDocumentId<foundry.data.MacroSource>,
                options: DocumentModificationContext,
                user: BaseUser
            ): Promise<void>;

            /** Is a user able to update an existing Macro document? */
            protected static _canUpdate(user: BaseUser, doc: BaseMacro, data: data.MacroData): boolean;

            /** Is a user able to delete an existing Macro document? */
            protected static _canDelete(user: BaseUser, doc: BaseMacro): boolean;
        }

        interface BaseMacro {
            readonly data: data.MacroData<this>;

            readonly parent: null;

            get documentName(): typeof BaseMacro["metadata"]["name"];
        }

        interface MacroMetadata extends abstract.DocumentMetadata {
            name: "Macro";
            collection: "macros";
            label: "DOCUMENT.Macro";
            isPrimary: true;
            types: ["script", "chat"];
            permissions: {
                create: "PLAYER";
                update: typeof BaseMacro["_canUpdate"];
                delete: typeof BaseMacro["_canDelete"];
            };
        }
    }
}

declare type MacroType = typeof CONST.MACRO_TYPES[keyof typeof CONST.MACRO_TYPES];
