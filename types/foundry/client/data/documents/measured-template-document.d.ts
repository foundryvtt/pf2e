import type { CanvasBaseMeasuredTemplate } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side MeasuredTemplate document which extends the common BaseMeasuredTemplate document model.
     *
     * @see {@link Scene}                     The Scene document type which contains MeasuredTemplate documents
     * @see {@link MeasuredTemplateConfig}    The MeasuredTemplate configuration application
     */
    class MeasuredTemplateDocument<
        TParent extends Scene | null = Scene | null,
    > extends CanvasBaseMeasuredTemplate<TParent> {
        /* -------------------------------------------- */
        /*  Model Properties                            */
        /* -------------------------------------------- */

        /** A reference to the User who created the MeasuredTemplate document. */
        get author(): User;

        /** Rotation is an alias for direction */
        get rotation(): number;
    }

    interface MeasuredTemplateDocument<TParent extends Scene | null = Scene | null>
        extends CanvasBaseMeasuredTemplate<TParent> {
        _sheet: MeasuredTemplateConfig<this> | null;
        _object: MeasuredTemplate<this> | null;
    }
}
