declare module foundry {
    module data {
        /**
         * The data schema for a Folder document.
         *
         * @param data Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property _id           The _id which uniquely identifies this Folder document
         * @property name          The name of this Folder
         * @property type          The document type which this Folder contains, from CONST.FOLDER_DOCUMENT_TYPES
         * @property [description] An HTML description of the contents of this folder
         * @property [parent]      The _id of a parent Folder which contains this Folder
         * @property [sorting=a]   The sorting mode used to organize documents within this Folder, in ["a", "m"]
         * @property [sort]        The numeric sort value which orders this Folder relative to its siblings
         * @property [color]        A color string used for the background color of this Folder
         * @property [flags={}]    An object of optional key/value flags
         */
        interface FolderSource extends abstract.DocumentSource {
            _id: string;
            name: string;
            type: FolderDocumentType;
            description: string;
            parent: string | null;
            sorting: "a" | "m";
            sort: number;
            color: HexColorString;
            flags: Record<string, unknown>;
        }

        class FolderData<
            TDocument extends documents.BaseFolder = documents.BaseFolder
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            static SORTING_MODES: ["a", "m"];
        }

        interface FolderData extends FolderSource {
            readonly _source: FolderSource;
        }
    }
}
