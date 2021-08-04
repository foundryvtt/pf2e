declare module foundry {
    module data {
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
        interface MeasuredTemplateSource extends abstract.DocumentSource {
            _id: string;
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
            texture: ImagePath;
            flags: Record<string, unknown>;
        }

        class MeasuredTemplateData<
            TDocument extends documents.BaseMeasuredTemplate = documents.BaseMeasuredTemplate
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            protected override _initialize(): void;

            protected override _validateDocument(): void;
        }

        interface MeasuredTemplateData extends MeasuredTemplateSource {
            readonly _source: MeasuredTemplateSource;
        }
    }
}

declare type MeasuredTemplateType = typeof CONST.MEASURED_TEMPLATE_TYPES[keyof typeof CONST.MEASURED_TEMPLATE_TYPES];
