declare module foundry {
    module documents {
        /** The MeasuredTemplate embedded document model. */
        class BaseMeasuredTemplate extends abstract.Document {
            static override get schema(): typeof data.MeasuredTemplateData;

            static override get metadata(): MeasuredTemplateMetadata;

            override testUserPermission(
                user: documents.BaseUser,
                permission: DocumentOwnershipString | DocumentOwnershipLevel,
                { exact }?: { exact?: boolean }
            ): boolean;

            /** Is a user able to update or delete an existing MeasuredTemplate? */
            protected static _canModify(
                user: BaseUser,
                doc: BaseMeasuredTemplate,
                data: data.MeasuredTemplateData
            ): boolean;
        }

        interface BaseMeasuredTemplate {
            readonly data: data.MeasuredTemplateData<this>;

            readonly parent: BaseScene | null;

            readonly author: documents.BaseUser | undefined;

            readonly t: MeasuredTemplateType;

            width: number;

            distance: number;

            direction: number;
        }

        interface MeasuredTemplateMetadata extends abstract.DocumentMetadata {
            name: "MeasuredTemplate";
            collection: "templates";
            label: "DOCUMENT.MeasuredTemplate";
            isEmbedded: true;
            permissions: {
                create: "TEMPLATE_CREATE";
                update: (typeof BaseMeasuredTemplate)["_canModify"];
                delete: (typeof BaseMeasuredTemplate)["_canModify"];
            };
        }
    }
}
