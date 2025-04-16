import MeasuredTemplate from "../canvas/placeables/template.mjs";
import { BaseMeasuredTemplate, Scene, User } from "./_module.mjs";
import { CanvasDocument } from "./abstract/canvas-document.mjs";

declare const CanvasBaseMeasuredTemplate: new <TParent extends Scene | null>(
    ...args: any
) => InstanceType<typeof BaseMeasuredTemplate<TParent>> & InstanceType<typeof CanvasDocument<TParent>>;

interface CanvasBaseMeasuredTemplate<TParent extends Scene | null>
    extends InstanceType<typeof CanvasBaseMeasuredTemplate<TParent>> {}

/**
 * The client-side MeasuredTemplate document which extends the common BaseMeasuredTemplate document model.
 *
 * @see {@link Scene}                     The Scene document type which contains MeasuredTemplate documents
 * @see {@link MeasuredTemplateConfig}    The MeasuredTemplate configuration application
 */
export default class MeasuredTemplateDocument<
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

export default interface MeasuredTemplateDocument<TParent extends Scene | null = Scene | null>
    extends CanvasBaseMeasuredTemplate<TParent> {
    _sheet: MeasuredTemplateConfig<this> | null;
    _object: MeasuredTemplate<this> | null;
}

export {};
