declare module foundry {
    module documents {
        /**The MeasuredTemplate embedded document model. */
        class BaseMeasuredTemplate extends abstract.Document {
            static get schema(): typeof data.MeasuredTemplateData;

            static get metadata(): MeasuredTemplateMetadata;

            /** Is a user able to update or delete an existing MeasuredTemplate? */
            protected static _canModify(
                user: BaseUser,
                doc: BaseMeasuredTemplate,
                data: data.MeasuredTemplateData,
            ): boolean;
        }

        interface BaseMeasuredTemplate {
            readonly data: data.MeasuredTemplateData<this>;

            readonly parent: BaseScene | null;
        }

        interface MeasuredTemplateMetadata extends abstract.DocumentMetadata {
            name: 'MeasuredTemplate';
            collection: 'templates';
            label: 'DOCUMENT.MeasuredTemplate';
            isEmbedded: true;
            permissions: {
                create: 'TEMPLATE_CREATE';
                update: typeof BaseMeasuredTemplate['_canModify'];
                delete: typeof BaseMeasuredTemplate['_canModify'];
            };
        }
    }
}
