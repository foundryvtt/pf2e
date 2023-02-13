declare module foundry {
    module documents {
        /** The Drawing embedded document model. */
        class BaseDrawing extends abstract.Document {
            static override get schema(): typeof data.DrawingData;

            static override get metadata(): DrawingMetadata;

            /** Is a user able to update or delete an existing Drawing document? */
            protected static _canModify(user: BaseUser, doc: BaseDrawing, data: data.DrawingData): boolean;
        }

        interface BaseDrawing {
            readonly data: data.DrawingData<this>;

            readonly parent: BaseScene | null;
        }

        interface DrawingMetadata extends abstract.DocumentMetadata {
            name: "Drawing";
            collection: "drawings";
            label: "DOCUMENT.Drawing";
            isEmbedded: true;
            permissions: {
                create: "TEMPLATE_CREATE";
                update: (typeof BaseDrawing)["_canModify"];
                delete: (typeof BaseDrawing)["_canModify"];
            };
        }
    }
}
