declare module foundry {
    module data {
        /**
         * The data schema of a stack of multiple Cards.
         * Each stack can represent a Deck, a Hand, or a Pile.
         */
        interface CardsSource<> {
            /** The _id which uniquely identifies this stack of Cards document */
            _id: string;
            /** The text name of this stack */
            name: string;
            /** The type of this stack, in BaseCards.metadata.types */
            type: string;
            /** A text description of this stack */
            description: string;
            /** An image or video which is used to represent the stack of cards */
            img: VideoFilePath;
            /** Game system data which is defined by the system template.json model */
            data: object;
            /** A collection of Card documents which currently belong to this stack */
            cards: object;
            /** The visible width of this stack */
            width: number;
            /** The visible height of this stack */
            height: number;
            /** The angle of rotation of this stack */
            rotation: string;
            /** Whether or not to publicly display the number of cards in this stack */
            displayCount?: boolean;
            /** The _id of a Folder which contains this document */
            folder?: string | null;
            /** The sort order of this stack relative to others in its parent collection */
            sort: number;
            /** An object which configures user permissions to this stack */
            ownership: Record<string, DocumentOwnershipLevel>;
            /** An object of optional key/value flags */
            flags: Record<string, Record<string, unknown>>;
        }

        interface CardsData<TDocument extends documents.BaseCards = documents.BaseCards>
            extends abstract.DocumentData<TDocument> {
            /** The default icon used for a cards stack that does not have a custom image set */
            DEFAULT_ICON: ImageFilePath;
        }

        interface CardsData<TDocument extends documents.BaseCards = documents.BaseCards> extends CardsSource {
            readonly _source: CardsSource;
        }
    }
}
