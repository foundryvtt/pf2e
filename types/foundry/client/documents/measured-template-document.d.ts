import { MeasuredTemplateDocumentConstructor } from "./constructors";

declare global {
    /**
     * The client-side MeasuredTemplate embedded document which extends the common BaseMeasuredTemplate abstraction.
     * Each MeasuredTemplate document contains MeasuredTemplateData which defines its data schema.
     */
    class MeasuredTemplateDocument extends MeasuredTemplateDocumentConstructor {
        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** A reference to the User who created the MeasuredTemplate document. */
        get author(): User | undefined;

        /** A flag for whether the current User has full ownership over the MeasuredTemplate document. */
        override get isOwner(): boolean;
    }

    interface MeasuredTemplateDocument {
        readonly parent: Scene | null;

        _sheet: MeasuredTemplateConfig | null;

        readonly _object: MeasuredTemplate<MeasuredTemplateDocument> | null;
    }
}
