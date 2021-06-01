export {};

declare global {
    module foundry {
        module data {
            module fields {
                /* ---------------------------------------- */
                /*  Standard Data Types                     */
                /* ---------------------------------------- */

                /** A required boolean field which may be used in a Document. */
                const BOOLEAN_FIELD: {
                    type: typeof Boolean;
                    required: true;
                    default: false;
                };

                /** A standard string color field which may be used in a Document. */
                const COLOR_FIELD: {
                    type: typeof String;
                    required: false;
                    nullable: true;
                    validate: typeof foundry.data.validators.isColorString;
                    validationError: '{name} {field} "{value}" is not a valid hexadecimal color string';
                };

                /** A standard string field for an image file path which may be used in a Document. */
                const IMAGE_FIELD: {
                    type: typeof String;
                    required: false;
                    nullable: true;
                    validate: typeof foundry.data.validators.hasImageExtension;
                    validationError: '{name} {field} "{value}" does not have a valid image file extension';
                };

                /** A standard string field for a video or image file path may be used in a Document. */
                const VIDEO_FIELD: {
                    type: typeof String;
                    required: false;
                    nullable: true;
                    validate: (src: string) => boolean;
                    validationError: '{name} {field} "{value}" does not have a valid image or video file extension';
                };

                /** A standard string field for an audio file path which may be used in a Document. */
                const AUDIO_FIELD: {
                    type: typeof String;
                    required: false;
                    nullable: true;
                    validate: (src: string | null) => boolean;
                    validationError: '{name} {field} "{value}" does not have a valid audio file extension';
                };

                /** A standard integer field which may be used in a Document. */
                const INTEGER_FIELD: {
                    type: typeof Number;
                    required: false;
                    validate: (value: unknown) => boolean;
                    validationError: '{name} {field} "{value}" does not have an integer value';
                };

                /**
                 * A string field which contains serialized JSON data that may be used in a Document.
                 */
                const JSON_FIELD: {
                    type: typeof String;
                    required: false;
                    clean: (s: string) => string;
                    validate: (value: unknown) => boolean;
                    validationError: '{name} {field} "{value}" is not a valid JSON string';
                };

                /** A non-negative integer field which may be used in a Document. */
                const NONNEGATIVE_INTEGER_FIELD: {
                    type: typeof Number;
                    required: false;
                    validate: (n: unknown) => boolean;
                    validationError: '{name} {field} "{value}" does not have an non-negative integer value';
                };

                /** A non-negative integer field which may be used in a Document. */
                const POSITIVE_INTEGER_FIELD: {
                    type: typeof Number;
                    required: false;
                    validate: (n: unknown) => boolean;
                    validationError: '{name} {field} "{value}" does not have an non-negative integer value';
                };

                /** A template for a required inner-object field which may be used in a Document. */
                const OBJECT_FIELD: {
                    type: typeof Object;
                    default: {};
                    required: true;
                };

                /** An optional string field which may be included by a Document. */
                const STRING_FIELD: {
                    type: typeof String;
                    required: false;
                    nullable: false;
                };

                /** An optional numeric field which may be included in a Document. */
                const NUMERIC_FIELD: {
                    type: typeof Number;
                    required: false;
                    nullable: true;
                };

                /** A required numeric field which may be included in a Document and may not be null. */
                const REQUIRED_NUMBER: {
                    type: typeof Number;
                    required: true;
                    nullable: false;
                    default: 0;
                };

                /** A required numeric field which must be a positive finite value that may be included in a Document. */
                const REQUIRED_POSITIVE_NUMBER: {
                    type: typeof Number;
                    required: true;
                    nullable: false;
                    validate: (n: unknown) => boolean;
                    validationError: '{name} {field} "{value}" is not a positive number';
                };

                /** A required numeric field which represents an angle of rotation in degrees between 0 and 360. */
                const ANGLE_FIELD: {
                    type: typeof Number;
                    required: true;
                    nullable: false;
                    default: 360;
                    clean: (n: number) => number;
                    validate: (n: number) => boolean;
                    validationError: '{name} {field} "{value}" is not a number between 0 and 360';
                };

                /** A required numeric field which represents a uniform number between 0 and 1. */
                const ALPHA_FIELD: {
                    type: typeof Number;
                    required: true;
                    nullable: false;
                    default: number;
                    validate: (n: number) => boolean;
                    validationError: '{name} {field} "{value}" is not a number between 0 and 1';
                };

                /** A string field which requires a non-blank value and may not be null. */
                const REQUIRED_STRING: {
                    type: typeof String;
                    required: true;
                    nullable: false;
                    clean: <T>(v: T) => T extends string ? string : undefined;
                };

                /** A string field which is required, but may be left blank as an empty string. */
                const BLANK_STRING: {
                    type: typeof String;
                    required: true;
                    nullable: false;
                    clean: (v: unknown) => string;
                    default: '';
                };

                /** A field used for integer sorting of a Document relative to its siblings */
                const INTEGER_SORT_FIELD: {
                    type: typeof Number;
                    required: true;
                    default: 0;
                    validate: (value: unknown) => boolean;
                    validationError: '{name} {field} "{value}" is not an integer';
                };

                /** A numeric timestamp field which may be used in a Document. */
                const TIMESTAMP_FIELD: {
                    type: typeof Number;
                    required: false;
                    default: typeof Date['now'];
                    nullable: false;
                };

                /* ---------------------------------------- */
                /*  Special Document Fields                 */
                /* ---------------------------------------- */

                /**
                 * Validate that the ID of a Document object is either null (not yet saved) or a valid string.
                 * @param id The _id to test
                 * @returns Is it valid?
                 */
                function _validateId(id: string | null): boolean;

                /** The standard identifier for a Document. */
                const DOCUMENT_ID: {
                    type: typeof String;
                    required: true;
                    default: null;
                    nullable: false;
                    validate: typeof _validateId;
                    validationError: '{name} {field} "{value}" is not a valid document ID string';
                };

                /** The standard permissions object which may be included by a Document. */
                const DOCUMENT_PERMISSIONS: {
                    type: typeof Object;
                    required: true;
                    nullable: false;
                    default: { default: typeof CONST.ENTITY_PERMISSIONS.NONE };
                    validate: typeof _validatePermissions;
                    validationError: '{name} {field} "{value}" is not a mapping of user IDs and document permission levels';
                };

                /**
                 * Validate the structure of the permissions object: all keys are valid IDs and all values are permission levels
                 * @param perms The provided permissions object
                 * @returns Is the object valid?
                 */
                function _validatePermissions(perms: Record<string, unknown>): perms is Record<string, PermissionLevel>;

                /* ---------------------------------------- */
                /*  Dynamic Fields                          */
                /* ---------------------------------------- */

                /** Create a foreign key field which references a primary Document id */
                function foreignDocumentField<T extends ForeignDocumentFieldOptions>(
                    options: T,
                ): ForeignDocumentField<T>;

                /**
                 * Create a special field which contains a Collection of embedded Documents
                 * @param The Document class definition
                 * @param [options={}] Additional field options
                 */
                function embeddedCollectionField(
                    document: ConstructorOf<foundry.abstract.Document>,
                    options?: { required?: boolean; default?: ConstructorOf<foundry.abstract.Document> },
                ): foundry.abstract.DocumentField;

                /** Return a document field which is a modification of a static field type */
                function field(
                    field: foundry.abstract.DocumentField,
                    options?: Record<string, unknown>,
                ): foundry.abstract.DocumentField;

                /** Generic interfaces returned by the above "dynamic field" functions */
                interface ForeignDocumentField<
                    TOptions extends ForeignDocumentFieldOptions = ForeignDocumentFieldOptions,
                > {
                    type: typeof String;
                    required: TOptions['required'] extends true ? true : false;
                    nullable: TOptions['nullable'] extends false ? false : true;
                    default: TOptions['default'] extends abstract.Document ? TOptions['default'] : null;
                    clean: <T extends any>(d: T) => T extends TOptions['type'] ? T : null;
                    validate: typeof _validateId;
                    validationError: '`{name} {field} "{value}" is not a valid ${options.type.documentName} id`';
                }
            }
        }
    }

    type AudioPath = `${string}.${AudioFileExtension}`;
    type HexColorString = `#${string}`;
    type GridType = typeof CONST.GRID_TYPES[keyof typeof CONST.GRID_TYPES];
    type ImagePath = `${string}.${ImageFileExtension}`;
    type VideoPath = `${string}.${VideoFileExtension}` | ImagePath;
}

interface ForeignDocumentFieldOptions {
    type: typeof foundry.abstract.Document;
    required?: boolean;
    nullable?: boolean;
    default?: typeof foundry.abstract.Document;
}

type ImageFileExtension = typeof CONST.IMAGE_FILE_EXTENSIONS[number];
type VideoFileExtension = typeof CONST.VIDEO_FILE_EXTENSIONS[number];
type AudioFileExtension = typeof CONST.AUDIO_FILE_EXTENSIONS[number];
