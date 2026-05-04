import Roll from "@client/dice/roll.mjs";
import { AudioFilePath, ChatMessageStyle, DocumentOwnershipNumber } from "@common/constants.mjs";
import { DocumentFlags } from "@common/data/_module.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseUser from "./user.mjs";

/**
 * The ChatMessage Document.
 * Defines the DataSchema and common behaviors for a ChatMessage which are shared between both client and server.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class BaseChatMessage<TUser extends BaseUser | null = BaseUser | null> extends Document<
    null,
    ChatMessageSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<ChatMessageMetadata>;

    static override defineSchema(): ChatMessageSchema;

    override getUserLevel(user: BaseUser): DocumentOwnershipNumber;
}

export default interface BaseChatMessage<TUser extends BaseUser | null = BaseUser | null>
    extends Document<null, ChatMessageSchema>, Omit<fields.ModelPropsFromSchema<ChatMessageSchema>, "author"> {
    get documentName(): ChatMessageMetadata["name"];

    author: TUser;
}

interface ChatMessageMetadata extends DocumentClassMetadata {
    name: "ChatMessage";
    collection: "messages";
    label: "DOCUMENT.ChatMessage";
    labelPlural: "DOCUMENT.ChatMessages";
    hasTypeData: true;
    baseTypeAllowed: true;
    isPrimary: true;
}

declare type ChatMessageSchema = {
    /** The _id which uniquely identifies this ChatMessage document */
    _id: fields.DocumentIdField;
    /** An ChatMessage subtype which configures the system data model applied */
    type: fields.DocumentTypeField<string, string, true, false, true, BaseChatMessage>;
    /** They system data object which is defined by the system data model */
    system: fields.TypeDataField;
    /** The message style from CONST.CHAT_MESSAGE_STYLES */
    style: fields.NumberField<ChatMessageStyle, ChatMessageStyle, true, true, true>;
    /** The User Document who generated this message */
    author: fields.ForeignDocumentField<BaseUser, true, false, true>;
    /** The timestamp at which point this message was generated */
    timestamp: fields.NumberField<number, number, true, false, true>;
    /** An optional flavor text message which summarizes this message */
    flavor: fields.HTMLField;
    /** The HTML content of this chat message */
    content: fields.HTMLField;
    /** A ChatSpeakerData object which describes the origin of the ChatMessage */
    speaker: fields.SchemaField<ChatSpeakerSchema>;
    /** An array of User _id values to whome this message is privately whispered */
    whisper: fields.ArrayField<fields.ForeignDocumentField<string>>;
    /** Is this message sent blindly where the creating User cannot see it? */
    blind: fields.BooleanField;
    /** Serialized content of any Roll instances attached to the ChatMessage */
    rolls: fields.ArrayField<fields.JSONField<Roll, true>>;
    /** The audio file path which plays when this message is received */
    sound: fields.FilePathField<AudioFilePath>;
    /** IS this message syled as an emote? */
    emote: fields.BooleanField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type ChatMessageFlags = DocumentFlags & {
    core?: {
        canPopout?: boolean;
        initiativeRoll?: boolean;
        RollTable?: string;
    };
};

declare type ChatSpeakerSchema = {
    /** The _id of the Scene where this message was created */
    scene: fields.ForeignDocumentField<string>;
    /** The _id of Actor who generated this message */
    actor: fields.ForeignDocumentField<string>;
    /** The _id of Token who generated this message */
    token: fields.ForeignDocumentField<string>;
    /** An overriden alias name used instead of the Actor or Token name */
    alias: fields.StringField<string, string, false, false, true>;
};

export type ChatSpeakerData = fields.SourceFromSchema<ChatSpeakerSchema>;

export type ChatMessageSource = fields.SourceFromSchema<ChatMessageSchema>;
