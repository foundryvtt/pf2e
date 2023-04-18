import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseUser } from "./module.d.ts";

/**
 * The ChatMessage document model.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the document.
 * @property data The constructed data object for the document.
 */
export default class BaseChatMessage extends Document<null> {
    blind: boolean;
    content: string;
    flags: ChatMessageFlags;
    rolls: Rolled<Roll>[];
    speaker: ChatSpeakerData;
    type: ChatMessageType;
    whisper: string[];

    static override get metadata(): ChatMessageMetadata;

    /** Is a user able to create a new chat message? */
    protected static _canCreate(user: BaseUser, doc: BaseChatMessage): boolean;

    /** Is a user able to update an existing chat message? */
    protected static _canUpdate(user: BaseUser, doc: BaseChatMessage, data: ChatMessageSource): boolean;

    /** Is a user able to delete an existing chat message? */
    protected static _canDelete(user: BaseUser, doc: BaseChatMessage): boolean;

    static override createDocuments<TDocument extends Document<null>>(
        this: ConstructorOf<TDocument>,
        data?: (TDocument | PreCreate<TDocument["_source"]>)[],
        context?: ChatMessageModificationContext
    ): Promise<TDocument[]>;
}

export default interface BaseChatMessage extends Document<null> {
    readonly _source: ChatMessageSource;

    get documentName(): "ChatMessage";
}

export interface ChatMessageSource {
    _id: string;
    type: ChatMessageType;
    user: string;
    timestamp: string;
    flavor?: string;
    content: string;
    speaker: ChatSpeakerData;
    whisper: string[];
    blind: boolean;
    rolls: (string | RollJSON)[];
    sound: AudioFilePath;
    emote?: boolean;
    flags: ChatMessageFlags;
}

export interface ChatMessageFlags extends DocumentFlags {
    core?: {
        canPopout?: boolean;
        initiativeRoll?: boolean;
        RollTable?: string;
    };
}

/**
 * The data schema for an embedded Chat Speaker object.
 * @extends DocumentData
 * @memberof data
 * @see ChatMessageData
 *
 * @param data Initial data used to construct the data object
 * @param [document] The document to which this data object belongs
 *
 * @property [scene] The _id of the Scene where this message was created
 * @property [actor] The _id of the Actor who generated this message
 * @property [token] The _id of the Token who generated this message
 * @property [alias] An overridden alias name used instead of the Actor or Token name
 */
export interface ChatSpeakerData {
    scene?: string | null;
    actor?: string | null;
    token?: string | null;
    alias: string;
}

interface ChatMessageMetadata extends DocumentMetadata {
    name: "ChatMessage";
    collection: "messages";
    label: "DOCUMENT.ChatMessage";
    isPrimary: true;
    permissions: {
        create: (typeof BaseChatMessage)["_canCreate"];
        update: (typeof BaseChatMessage)["_canUpdate"];
        delete: (typeof BaseChatMessage)["_canDelete"];
    };
}

declare global {
    interface ChatMessageModificationContext extends DocumentModificationContext<null> {
        rollMode?: RollMode | "roll";
    }
}
