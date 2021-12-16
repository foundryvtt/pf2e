export {};

declare global {
    module foundry {
        module abstract {
            /**
             * A schema entry which describes a field of DocumentData
             * @property type           An object which defines the data type of this field
             * @property required       Is this field required to have an assigned value? Default is false.
             * @property [nullable]     Can the field be populated by a null value? Default is true.
             * @property [default]      A static default value or a function which assigns a default value
             * @property [clean]        An optional cleaning function which sanitizes input data to this field
             * @property [validate]    A function which asserts that the value of this field is valid
             * @property [validationError] An error message which is displayed if validation fails
             * @property [isCollection] Is the field an embedded Document collection?
             */
            interface DocumentField {
                type: object;
                required: boolean;
                nullable?: boolean;
                default?: unknown;
                clean?: Function;
                validate?: (data: any) => boolean;
                validationError?: string;
                isCollection?: boolean;
            }

            /** The schema of a Document */
            type DocumentSchema = Record<string, DocumentField>;

            type DocumentSource = object;

            /**
             * An abstract pattern for a data object which is contained within every type of Document.
             * @param [data={}]  Initial data used to construct the data object
             * @param [document] The document to which this data object belongs
             */
            abstract class DocumentData<TDocument extends abstract.Document | null = abstract.Document | null> {
                constructor(data?: DocumentSource, document?: TDocument | null);

                /** An immutable reverse-reference to the Document to which this data belongs, possibly null. */
                readonly document: TDocument | null;

                /** The source data object. The contents of this object can be updated, but the object itself may not be replaced. */
                readonly _source: DocumentSource;

                /**
                 * The primary identifier for the Document to which this data object applies.
                 * This identifier is unique within the parent collection which contains the Document.
                 */
                _id: string /* | null */;

                /**
                 * Define the data schema for documents of this type.
                 * The schema is populated the first time it is accessed and cached for future reuse.
                 */
                static defineSchema(): DocumentSchema;

                /** Define the data schema for documents of this type. */
                static get schema(): DocumentSchema;

                static _schema?: DocumentSchema;

                /**
                 * Define the data schema for this document instance.
                 * @alias {DocumentData.schema}
                 */
                get schema(): DocumentSchema;

                /* ---------------------------------------- */
                /*  Data Initialization and Validation      */
                /* ---------------------------------------- */

                /** Initialize the source data object in-place */
                protected _initializeSource(data: object): this["_source"];

                /**
                 * Get the default value for a schema field, conditional on the provided data
                 * @param field The configured data field
                 * @param data The provided data object
                 * @returns The default value for the field
                 */
                protected static _getFieldDefaultValue(field: DocumentField, data: unknown): unknown;

                /** Initialize the instance by copying data from the source object to instance attributes. */
                protected _initialize(): void;

                /**
                 * Initialize the value for a given data type
                 * @param type The type of the data field
                 * @param value The un-initialized value
                 * @returns The initialized value
                 */
                protected _initializeType(type: string, value: unknown): unknown;

                /**
                 * Validate the data contained in the document to check for type and content
                 * This function throws an error if data within the document is not valid
                 *
                 * @param options            Optional parameters which customize how validation occurs.
                 * @param [options.changes]  Only validate the keys of an object that was changed.
                 * @param [options.children] Validate the data of child embedded documents? Default is true.
                 * @param [options.clean]    Apply field-specific cleaning functions to the provided value.
                 * @param [options.replace]  Replace any invalid values with valid defaults? Default is false.
                 * @param [options.strict]   If strict, will throw errors for any invalid data. Default is false.
                 * @return An indicator for whether or not the document contains valid data
                 */
                validate({
                    changes,
                    children,
                    clean,
                    replace,
                    strict,
                }?: {
                    changes?: boolean;
                    children?: boolean;
                    clean?: boolean;
                    replace?: boolean;
                    strict?: boolean;
                }): boolean;

                /**
                 * Jointly validate the overall document after each field has been individually validated.
                 * Throw an Error if any issue is encountered.
                 */
                protected _validateDocument(): void;

                /** Reset the state of this data instance back to mirror the contained source data, erasing any changes. */
                reset(): boolean;

                /**
                 * Update the data by applying a new data object. Data is compared against and merged with the existing data.
                 * Updating data which already exists is strict - it must pass validation or else the update is rejected.
                 * An object is returned which documents the set of changes which were applied to the original data.
                 * @see utils.mergeObject
                 * @param data New values with which to update the Data object
                 * @param options Options which determine how the new data is merged
                 * @returns The changed keys and values which are different than the previous data
                 */
                update(data?: DocumentUpdateData, options?: DocumentModificationContext): DeepPartial<this["_source"]>;

                /**
                 * Copy and transform the DocumentData into a plain object.
                 * Draw the values of the extracted object from the data source (by default) otherwise from its transformed values.
                 * @param [source=true] Draw values from the underlying data source rather than transformed values
                 * @returns The extracted primitive object
                 */
                toObject<D extends DocumentData>(this: D, source?: true): D["_source"];
                toObject<D extends DocumentData>(this: D, source: false): RawObject<D>;
                toObject<D extends DocumentData>(source?: boolean): D["_source"] | RawObject<D>;

                /**
                 * Extract the source data for the DocumentData into a simple object format that can be serialized.
                 * @returns The document source data expressed as a plain object
                 */
                toJSON(): this["_source"];

                /**
                 * Create a DocumentData instance using a provided serialized JSON string.
                 * @param json Serialized document data in string format
                 * @returns A constructed data instance
                 */
                static fromJSON<T extends DocumentData>(this: ConstructorOf<T>, json: string): T;
            }
        }
    }

    type RawObject<T extends foundry.abstract.DocumentData> = {
        [P in keyof T["_source"]]: T[P] extends foundry.abstract.EmbeddedCollection<infer U>
            ? RawObject<U["data"]>[]
            : T[P] extends foundry.abstract.DocumentData
            ? RawObject<T[P]>
            : T[P] extends foundry.abstract.DocumentData[]
            ? RawObject<T[P][number]>[]
            : T[P];
    };
}
