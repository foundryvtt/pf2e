import DocumentSheetV2 from "@client/applications/api/document-sheet.mjs";
import { ImageFilePath } from "@common/constants.mjs";
import { CardsSource } from "@common/documents/cards.mjs";
import { BaseCards } from "./_module.mjs";
import ClientDocumentMixin from "./abstract/client-document.mjs";
import Card from "./card.mjs";

/**
 * The client-side Cards document which extends the common BaseCards model.
 * Each Cards document contains CardsData which defines its data schema.
 *
 * @see {@link CardStacks}  The world-level collection of Cards documents
 * @see {@link CardsConfig} The Cards configuration application
 */
export default class Cards extends ClientDocumentMixin(BaseCards) {
    /** Provide a thumbnail image path used to represent this document. */
    get thumbnail(): ImageFilePath;

    /** The Card documents within this stack which are available to be drawn. */
    get availableCards(): Card<this>[];

    /** The Card documents which belong to this stack but have already been drawn. */
    get drawnCards(): Card<this>[];

    /** Returns the localized Label for the type of Card Stack this is */
    get typeLabel(): string;

    /** Can this Cards document be cloned in a duplicate workflow? */
    get canClone(): boolean;
}

export default interface Cards {
    readonly _source: CardsSource;

    get sheet(): DocumentSheetV2;
}

export {};
