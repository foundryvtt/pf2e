import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type { BaseCard, BaseUser } from "./module.d.ts";

/** The base Cards definition which defines common behavior of an Cards document shared by both client and server. */
export default class BaseCards extends Document<null> {
    static override get metadata(): DocumentMetadata;

    name: string;

    /** The sub-type of Card. */
    readonly type: string;

    /** Is a User able to create a new embedded Card document within this parent? */
    protected static _canCreate(user: BaseUser, doc: BaseCards, data: object): boolean;

    /** Is a user able to update an existing Card? */
    protected static _canUpdate(user: BaseUser, doc: BaseCards, data: object): boolean;

    readonly cards: EmbeddedCollection<BaseCard<this>>;

    override testUserPermission(
        user: BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean }
    ): boolean;
}

export default interface BaseCards extends Document<null> {
    readonly _source: CardsSource;

    get documentName(): "Cards";
}

/**
 * The data schema of a stack of multiple Cards.
 * Each stack can represent a Deck, a Hand, or a Pile.
 */
interface CardsSource {
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
