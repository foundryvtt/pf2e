import Roll, { Rolled, RollJSON } from "@client/dice/roll.mjs";
import { DocumentConstructionContext } from "@common/_types.mjs";
import {
    DatabaseCreateCallbackOptions,
    DatabaseCreateOperation,
    DatabaseDeleteCallbackOptions,
    DatabaseUpdateCallbackOptions,
} from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import { RollMode } from "@common/constants.mjs";
import BaseChatMessage, { ChatMessageSource, ChatSpeakerData } from "@common/documents/chat-message.mjs";
import { Actor, BaseUser, Scene, TokenDocument, User } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";

interface ClientBaseChatMessageStatic extends Omit<typeof BaseChatMessage, "new">, ClientDocumentStatic {}

declare const ClientBaseChatMessage: {
    new <TUser extends User | null>(...args: any): BaseChatMessage<TUser> & ClientDocument<null>;
} & ClientBaseChatMessageStatic;

/**
 * The client-side ChatMessage document which extends the common BaseChatMessage abstraction.
 * Each ChatMessage document contains ChatMessageData which defines its data schema.
 */
declare class ChatMessage<TUser extends User | null = User | null> extends ClientBaseChatMessage<TUser> {
    rolls: Rolled<Roll>[];

    /** Is this ChatMessage currently displayed in the sidebar ChatLog? */
    logged: boolean;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Return the recommended String alias for this message.
     * The alias could be a Token name in the case of in-character messages or dice rolls.
     * Alternatively it could be a User name in the case of OOC chat or whispers.
     */
    get alias(): string;

    /** Is the current User the author of this message? */
    get isAuthor(): boolean;

    /**
     * Return whether the content of the message is visible to the current user.
     * For certain dice rolls, for example, the message itself may be visible while the content of that message is not.
     */
    get isContentVisible(): boolean;

    /**
     * Does this message contain dice rolls?
     */
    get isRoll(): boolean;

    /**
     * Return whether the ChatMessage is visible to the current User.
     * Messages may not be visible if they are private whispers.
     */
    override get visible(): boolean;

    /**
     * The Actor which represents the speaker of this message (if any).
     */
    get speakerActor(): Actor | null;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override prepareDerivedData(): void;

    /**
     * Transform a provided object of ChatMessage data by applying a certain rollMode to the data object.
     * @param chatData The object of ChatMessage data prior to applying a rollMode preference
     * @param rollMode The rollMode preference to apply to this message data
     * @returns The modified ChatMessage data with rollMode preferences applied
     */
    static applyRollMode<TData extends DeepPartial<ChatMessageSource>>(
        chatData: TData,
        rollMode: RollMode | "roll",
    ): TData;

    /**
     * Update the data of a ChatMessage instance to apply a requested rollMode
     * @param rollMode The rollMode preference to apply to this message data
     */
    applyRollMode(rollMode: RollMode | "roll"): void;

    /**
     * Attempt to determine who is the speaking character (and token) for a certain Chat Message
     * First assume that the currently controlled Token is the speaker
     *
     * @param scene The Scene in which the speaker resides
     * @param actor The Actor whom is speaking
     * @param token The Token whom is speaking
     * @param alias The name of the speaker to display
     * @returns The identified speaker data
     */
    static getSpeaker({
        scene,
        actor,
        token,
        alias,
    }?: {
        scene?: Scene | null;
        actor?: Actor | null;
        token?: TokenDocument | null;
        alias?: string;
    }): ChatSpeakerData;

    /**
     * Obtain an Actor instance which represents the speaker of this message (if any)
     * @param speaker The speaker data object
     */
    static getSpeakerActor(speaker: DeepPartial<ChatSpeakerData>): Actor | null;

    /** Obtain a data object used to evaluate any dice rolls associated with this particular chat message */
    getRollData(): object;

    /**
     * Given a string whisper target, return an Array of the user IDs which should be targeted for the whisper
     * @param name The target name of the whisper target
     * @return An array of User instances
     */
    static getWhisperRecipients(name: string): User[];

    /**
     * Render the HTML for the ChatMessage which should be added to the log
     * @param options Additional options passed to the Handlebars template.
     * @param options.canDelete Render a delete button. By default, this is true for GM users.
     * @param options.canClose Render a close button for dismissing chat card notifications.
     */
    renderHTML(options?: { canDelete?: boolean; canClose?: boolean }): Promise<HTMLElement>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void;

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    /** Export the content of the chat message into a standardized log format */
    export(): string;
}

declare namespace ChatMessage {
    function create<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        data: DeepPartial<TDocument["_source"] & { rolls: (string | RollJSON)[] }>,
        operation?: Partial<ChatMessageCreateOperation>,
    ): Promise<TDocument | undefined>;
    function create<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        data: DeepPartial<TDocument["_source"] & { rolls: (string | RollJSON)[] }>[],
        operation?: Partial<ChatMessageCreateOperation>,
    ): Promise<TDocument[]>;
    function create<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        data:
            | DeepPartial<TDocument["_source"] & { rolls: (string | RollJSON)[] }>
            | DeepPartial<TDocument["_source"] & { rolls: (string | RollJSON)[] }>[],
        operation?: Partial<ChatMessageCreateOperation>,
    ): Promise<TDocument[] | TDocument | undefined>;
}

export default ChatMessage;

export interface MessageConstructionContext extends DocumentConstructionContext<null> {
    rollMode?: RollMode | "roll";
}

export interface ChatMessageCreateOperation extends DatabaseCreateOperation<null> {
    rollMode?: RollMode | "roll";
}

export interface ChatMessageRenderData {
    message: ChatMessageSource;
    user: User;
    author: User;
    alias: string;
    borderColor?: string;
    cssClass: string;
    isWhisper: number;
    canDelete: boolean;
    whisperTo: string;
}

export {};
