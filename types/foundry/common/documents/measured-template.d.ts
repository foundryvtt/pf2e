import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseScene, BaseUser } from "./module.d.ts";

/** The MeasuredTemplate embedded document model. */
export default class BaseMeasuredTemplate<TParent extends BaseScene | null> extends Document<TParent> {
    static override get metadata(): MeasuredTemplateMetadata;

    readonly t: MeasuredTemplateType;
    width: number;
    distance: number;
    direction: number;

    override testUserPermission(
        user: BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean }
    ): boolean;

    /** Is a user able to update or delete an existing MeasuredTemplate? */
    protected static _canModify(
        user: BaseUser,
        doc: BaseMeasuredTemplate<BaseScene | null>,
        data: MeasuredTemplateSource
    ): boolean;
}

export default interface BaseMeasuredTemplate<TParent extends BaseScene | null>
    extends Document<TParent>,
        MeasuredTemplateSource {
    readonly _source: MeasuredTemplateSource;
}

/**
 * The data schema for a MeasuredTemplate embedded document.
 * @see BaseMeasuredTemplate
 *
 * @param data                   Initial data used to construct the data object
 * @param [document] The embedded document to which this data object belongs
 *
 * @property _id                   The _id which uniquely identifies this BaseMeasuredTemplate embedded document
 * @property [t=circle]            The value in CONST.MEASURED_TEMPLATE_TYPES which defines the geometry type of this template
 * @property [x=0]                 The x-coordinate position of the origin of the template effect
 * @property [y=0]                 The y-coordinate position of the origin of the template effect
 * @property [distance]            The distance of the template effect
 * @property [direction=0]         The angle of rotation for the measured template
 * @property [angle=360]           The angle of effect of the measured template, applies to cone types
 * @property [width]               The width of the measured template, applies to ray types
 * @property [borderColor=#000000] A color string used to tint the border of the template shape
 * @property [fillColor=#FF0000]   A color string used to tint the fill of the template shape
 * @property [texture]             A repeatable tiling texture used to add a texture fill to the template shape
 * @property [flags={}]            An object of optional key/value flags
 */
export interface MeasuredTemplateSource {
    _id: string | null;
    user: string;
    t: MeasuredTemplateType;
    x: number;
    y: number;
    distance: number;
    direction: number;
    angle: number;
    width: number;
    borderColor: HexColorString;
    fillColor: HexColorString;
    texture: ImageFilePath;
    flags: DocumentFlags;
}

interface MeasuredTemplateMetadata extends DocumentMetadata {
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
