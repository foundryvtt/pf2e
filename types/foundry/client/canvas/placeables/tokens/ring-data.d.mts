import DataModel from "@common/abstract/data.mjs";
import { FilePath } from "@common/constants.mjs";
import { DataFieldOptions } from "@common/data/_module.mjs";
import * as fields from "@common/data/fields.mjs";

/**
 * A special subclass of DataField used to reference a class definition.
 */
declare class ClassReferenceField extends fields.DataField {
    constructor(options: DataFieldOptions<object, true, false, boolean>);

    static override get _defaults(): DataFieldOptions<object, true, false, boolean>;

    protected override _validateType(value: unknown): void;

    getInitialValue(data?: object): fields.MaybeSchemaProp<object, true, false, boolean>;
}

/**
 * Dynamic Ring configuration data model.
 */
export default class DynamicRingData extends DataModel<null, DynamicRingSchema> {
    static override defineSchema(): DynamicRingSchema;
}

export default interface DynamicRingData
    extends DataModel<null, DynamicRingSchema>,
        fields.ModelPropsFromSchema<DynamicRingSchema> {}

type DynamicRingSchema = {
    /** The id of this Token Ring configuration. */
    id: fields.StringField<string, string, false, false, true>;
    /** The label of this Token Ring configuration. */
    label: fields.StringField<string, string, false, false, true>;
    /** The spritesheet path which provides token ring frames for various sized creatures. */
    spritesheet: fields.FilePathField<FilePath, FilePath, true, true, false>;
    /** Registered special effects which can be applied to a token ring. */
    effects: fields.ObjectField<RingEffectData, RingEffectData, true, false, true>;
    /** The manager class responsible for rendering token rings. */
    framework: fields.SchemaField<
        { ringClass: ClassReferenceField; shaderClass: ClassReferenceField },
        fields.SourceFromSchema<{ ringClass: ClassReferenceField; shaderClass: ClassReferenceField }>,
        fields.ModelPropsFromSchema<{ ringClass: ClassReferenceField; shaderClass: ClassReferenceField }>,
        true,
        false,
        true
    >;
};

interface RingEffectData {
    RING_PULSE: string;
    RING_GRADIENT: string;
    BKG_WAVE: string;
    INVISIBILITY: string;
    COLOR_OVER_SUBJECT: string;
}

export {};
