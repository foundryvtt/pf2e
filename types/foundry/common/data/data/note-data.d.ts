declare module foundry {
    module data {
        /**
         * The data schema for a Note embedded document.
         * @see BaseNote
         *
         * @param data Initial data used to construct the data object
         * @param [document] The embedded document to which this data object belongs
         *
         * @property _id                  The _id which uniquely identifies this BaseNote embedded document
         * @property [entryId=null]       The _id of a JournalEntry document which this Note represents
         * @property [x=0]                The x-coordinate position of the center of the note icon
         * @property [y=0]                The y-coordinate position of the center of the note icon
         * @property [icon]               An image icon path used to represent this note
         * @property [iconSize=40]        The pixel size of the map note icon
         * @property [iconTint]           An optional color string used to tint the map note icon
         * @property [text]               Optional text which overrides the title of the linked Journal Entry
         * @property [fontFamily=Signika] The font family used to display the text label on this note
         * @property [fontSize=36]        The font size used to display the text label on this note
         * @property [textAnchor=1]       A value in CONST.TEXT_ANCHOR_POINTS which defines where the text label anchors
         *                                to the note icon.
         * @property [textColor=#FFFFFF]  The string that defines the color with which the note text is rendered
         * @property [flags={}]           An object of optional key/value flags
         */
        interface NoteSource {
            _id: string;
            entryId: string | null;
            x: number;
            y: number;
            icon: ImagePath;
            iconSize: number;
            iconTint: HexColorString;
            text: string;
            fontFamily: string;
            fontSize: number;
            textAnchor: number;
            textColor: HexColorString;
            flags: Record<string, unknown>;
        }

        class NoteData<
            TDocument extends documents.BaseNote = documents.BaseNote,
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface NoteData extends NoteSource {
            readonly _source: NoteSource;
        }
    }
}
