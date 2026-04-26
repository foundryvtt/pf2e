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
    _id: fields.DocumentIdField;
    type: fields.DocumentTypeField<string, string, true, false, true, BaseChatMessage>;
    system: fields.TypeDataField;
    style: fields.NumberField<ChatMessageStyle, ChatMessageStyle, true, true, true>;
    author: fields.ForeignDocumentField<BaseUser, true, false, true>;
    timestamp: fields.NumberField<number, number, true, false, true>;
    flavor: fields.HTMLField;
    content: fields.HTMLField;
    speaker: fields.SchemaField<ChatSpeakerSchema>;
    whisper: fields.ArrayField<fields.ForeignDocumentField<string>>;
    blind: fields.BooleanField;
    rolls: fields.ArrayField<fields.JSONField<Roll, true>>;
    sound: fields.FilePathField<AudioFilePath>;
    emote: fields.BooleanField;
    flags: fields.DocumentFlagsField;
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
    scene: fields.ForeignDocumentField<string>;
    actor: fields.ForeignDocumentField<string>;
    token: fields.ForeignDocumentField<string>;
    alias: fields.StringField<string, string, false, false, true>;
};

export type ChatSpeakerData = fields.SourceFromSchema<ChatSpeakerSchema>;

export type ChatMessageSource = fields.SourceFromSchema<ChatMessageSchema>;
