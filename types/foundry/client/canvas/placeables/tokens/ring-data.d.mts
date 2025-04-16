import DataModel from "@common/abstract/data.mjs";
import * as fields from "@common/data/fields.mjs";

/**
 * A special subclass of DataField used to reference a class definition.
 */
declare class ClassReferenceField extends fields.DataField {
    constructor(options: fields.DataFieldOptions<object, true, false, boolean>);

    static override get _defaults(): fields.DataFieldOptions<object, true, false, boolean>;

    protected override _validateType(value: unknown): void;

    getInitialValue(data?: object): fields.MaybeSchemaProp<object, true, false, boolean>;
}

/**
 * Dynamic Ring configuration data model.
 * @property {string} id                        The id of this Token Ring configuration.
 * @property {string} label                     The label of this Token Ring configuration.
 * @property {string} spritesheet               The spritesheet path which provides token ring frames for various
 *                                              sized creatures.
 * @property {Record<string, string>} [effects] Registered special effects which can be applied to a token ring.
 * @property {Object} framework
 * @property {typeof TokenRing} [framework.ringClass=TokenRing] The manager class responsible for rendering token rings.
 * @property {typeof PrimaryBaseSamplerShader} [framework.shaderClass=TokenRingSamplerShader]  The shader class used to
 *                                              render the TokenRing.
 */
export default class DynamicRingData extends DataModel<null, DynamicRingSchema> {
    static override defineSchema(): DynamicRingSchema;
}

export default interface DynamicRingData
    extends DataModel<null, DynamicRingSchema>,
        ModelPropsFromSchema<DynamicRingSchema> {}

type DynamicRingSchema = {
    id: fields.StringField<string, string, false, false, true>;
    label: fields.StringField<string, string, false, false, true>;
    spritesheet: fields.FilePathField<FilePath, FilePath, true, true, false>;
    effects: fields.ObjectField<
        {
            RING_PULSE: string;
            RING_GRADIENT: string;
            BKG_WAVE: string;
            INVISIBILITY: string;
            COLOR_OVER_SUBJECT: string;
        },
        {
            RING_PULSE: string;
            RING_GRADIENT: string;
            BKG_WAVE: string;
            INVISIBILITY: string;
            COLOR_OVER_SUBJECT: string;
        },
        true,
        false,
        true
    >;
    framework: fields.SchemaField<
        { ringClass: ClassReferenceField; shaderClass: ClassReferenceField },
        SourceFromSchema<{ ringClass: ClassReferenceField; shaderClass: ClassReferenceField }>,
        ModelPropsFromSchema<{ ringClass: ClassReferenceField; shaderClass: ClassReferenceField }>,
        true,
        false,
        true
    >;
};
