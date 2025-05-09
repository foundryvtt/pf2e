import { ChatMessageCreateOperation } from "@common/documents/chat-message.mjs";
import { BaseCard, CardFaceData, Cards, ChatMessage } from "./_module.mjs";
import { ClientDocument } from "./abstract/client-document.mjs";

declare const ClientBaseCard: new <TParent extends Cards | null>(
    ...args: any
) => BaseCard<TParent> & ClientDocument<TParent>;

/**
 * The client-side Card document which extends the common BaseCard document model.
 * @mixes ClientDocumentMixin
 *
 * @see {@link Cards}                    The Cards document type which contains Card embedded documents
 * @see {@link CardConfig}               The Card configuration application
 */
export default class Card<TParent extends Cards | null> extends ClientBaseCard<TParent> {
    /** The current card face */
    get currentFace(): CardFaceData | null;

    /** The image of the currently displayed card face or back */
    get img(): this["img"];

    /** A reference to the source Cards document which defines this Card. */
    get source(): Cards | null;

    /**
     * A convenience property for whether the Card is within its source Cards stack. Cards in decks are always
     * considered home.
     */
    get isHome(): boolean;

    /** Whether to display the face of this card? */
    get showFace(): boolean;

    /**
     * Does this Card have a next face available to flip to?
     * @type {boolean}
     */
    get hasNextFace(): boolean;

    /**
     * Does this Card have a previous face available to flip to?
     * @type {boolean}
     */
    get hasPreviousFace(): boolean;

    /* -------------------------------------------- */
    /*  Core Methods                                */
    /* -------------------------------------------- */

    override prepareDerivedData(): void;

    /* -------------------------------------------- */
    /*  API Methods                                 */
    /* -------------------------------------------- */

    /**
     * Flip this card to some other face. A specific face may be requested, otherwise:
     * If the card currently displays a face the card is flipped to the back.
     * If the card currently displays the back it is flipped to the first face.
     * @param [face] A specific face to flip the card to
     * @returns A reference to this card after the flip operation is complete
     */
    flip(face: number | null): Promise<this>;

    /**
     * Pass this Card to some other Cards document.
     * @param {Cards} to                A new Cards document this card should be passed to
     * @param {object} [options={}]     Options which modify the pass operation
     * @param {object} [options.updateData={}]  Modifications to make to the Card as part of the pass operation,
     *                                  for example the displayed face
     * @returns {Promise<Card>}         A reference to this card after it has been passed to another parent document
     */
    pass(to: Cards, options?: { updateData?: Record<string, unknown> }): Promise<Card<Cards> | undefined>;

    /**
     * @alias Card#pass
     * @see Card#pass
     */
    play(to: Cards, options?: { updateData?: Record<string, unknown> }): Promise<Card<Cards> | undefined>;

    /**
     * @alias Card#pass
     * @see Card#pass
     */
    discard(to: Cards, options?: { updateData?: Record<string, unknown> }): Promise<Card<Cards> | undefined>;

    /**
     * Recall this Card to its original Cards parent.
     * @param {object} [options={}]   Options which modify the recall operation
     * @returns {Promise<Card>}       A reference to the recalled card belonging to its original parent
     */
    recall(options?: Record<string, unknown>): Promise<Card<Cards | null>>;

    /**
     * Create a chat message which displays this Card.
     * @param {object} [messageData={}] Additional data which becomes part of the created ChatMessageData
     * @param {object} [options={}]     Options which modify the message creation operation
     * @returns {Promise<ChatMessage>}  The created chat message
     */
    toMessage(
        messageData?: DeepPartial<foundry.documents.ChatMessageSource>,
        options?: ChatMessageCreateOperation,
    ): Promise<ChatMessage | undefined>;
}

export {};
