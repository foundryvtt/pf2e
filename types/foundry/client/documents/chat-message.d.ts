import type { ClientBaseChatMessage } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side ChatMessage document which extends the common BaseChatMessage abstraction.
     * Each ChatMessage document contains ChatMessageData which defines its data schema.
     * @see {@link data.ChatMessageData} The ChatMessage data schema
     * @see {@link documents.Messages} The world-level collection of ChatMessage documents
     */
    class ChatMessage extends ClientBaseChatMessage {
        constructor(data: PreCreate<foundry.documents.ChatMessageSource>, context?: DocumentConstructionContext<null>);

        flavor: string;

        _rollExpanded: boolean;

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

        /** Test whether the chat message contains a dice roll */
        get isRoll(): boolean;

        /**
         * Return whether the ChatMessage is visible to the current User.
         * Messages may not be visible if they are private whispers.
         */
        override get visible(): boolean;

        /** The User who created the chat message. */
        get user(): User | undefined;

        override prepareData(): void;

        /**
         * Transform a provided object of ChatMessage data by applying a certain rollMode to the data object.
         * @param chatData The object of ChatMessage data prior to applying a rollMode preference
         * @param rollMode The rollMode preference to apply to this message data
         * @returns The modified ChatMessage data with rollMode preferences applied
         */
        static applyRollMode(chatData: ChatMessage["_source"], rollMode: RollMode): ChatMessage["_source"];

        /**
         * Update the data of a ChatMessage instance to apply a requested rollMode
         * @param rollMode The rollMode preference to apply to this message data
         */
        applyRollMode(rollMode: RollMode): void;

        /**
         * Attempt to determine who is the speaking character (and token) for a certain Chat Message
         * First assume that the currently controlled Token is the speaker
         *
         * @param [scene] The Scene in which the speaker resides
         * @param [actor] The Actor whom is speaking
         * @param [token] The Token whom is speaking
         * @param [alias] The name of the speaker to display
         * @returns The identified speaker data
         */
        static getSpeaker({
            scene,
            actor,
            token,
            alias,
        }?: {
            scene?: Scene | null;
            actor?: Actor<TokenDocument<Scene | null> | null> | null;
            token?: TokenDocument<Scene | null> | null;
            alias?: string;
        }): foundry.documents.ChatSpeakerData;

        /** A helper to prepare the speaker object based on a target Token */
        protected static _getSpeakerFromToken({ token, alias }: { token: Token; alias?: string }): {
            scene: string;
            token: string;
            actor: string | null;
            alias: string;
        };
        /**
         * A helper to prepare the speaker object based on a target Actor
         * @private
         */
        protected static _getSpeakerFromActor({
            scene,
            actor,
            alias,
        }: {
            scene?: Scene;
            actor: Actor<TokenDocument<Scene | null> | null>;
            alias?: string;
        }): {
            scene: string | null;
            actor: string;
            token: null;
            alias: string;
        };

        /** A helper to prepare the speaker object based on a target User */
        protected static _getSpeakerFromUser({
            scene,
            user,
            alias,
        }: {
            scene?: Scene | null;
            user: User;
            alias?: string;
        }): {
            scene: string | null;
            actor: null;
            token: null;
            alias: string;
        };

        /**
         * Obtain an Actor instance which represents the speaker of this message (if any)
         * @param speaker The speaker data object
         */
        static getSpeakerActor(
            speaker: DeepPartial<foundry.documents.ChatSpeakerData>
        ): Actor<TokenDocument<Scene | null> | null> | null;

        /** Obtain a data object used to evaluate any dice rolls associated with this particular chat message */
        getRollData(): object;

        /**
         * Given a string whisper target, return an Array of the user IDs which should be targeted for the whisper
         * @param name The target name of the whisper target
         * @return An array of User instances
         */
        static getWhisperRecipients(name: string): User[];

        /** Render the HTML for the ChatMessage which should be added to the log */
        getHTML(): Promise<JQuery>;

        /**
         * Render the inner HTML content for ROLL type messages.
         * @param messageData      The chat message data used to render the message HTML
         */
        protected _renderRollContent: (messageData: ChatMessageRenderData) => Promise<void>;

        protected override _preUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DocumentModificationContext<null>,
            user: User
        ): Promise<void>;

        protected override _onCreate(
            data: this["_source"],
            options: DocumentModificationContext<null>,
            userId: string
        ): void;

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DocumentModificationContext<null>,
            userId: string
        ): void;

        protected override _onDelete(options: DocumentModificationContext<null>, userId: string): void;

        /** Export the content of the chat message into a standardized log format */
        export(): string;
    }

    namespace ChatMessage {
        function create<TDocument extends ChatMessage>(
            this: ConstructorOf<TDocument>,
            data: PreCreate<TDocument["_source"]>[],
            context?: ChatMessageModificationContext
        ): Promise<TDocument[]>;
        function create<T extends ChatMessage>(
            this: ConstructorOf<T>,
            data: PreCreate<T["_source"]>,
            context?: ChatMessageModificationContext
        ): Promise<T | undefined>;
        function create<T extends ChatMessage>(
            this: ConstructorOf<T>,
            data: PreCreate<T["_source"]>[] | PreCreate<T["_source"]>,
            context?: ChatMessageModificationContext
        ): Promise<T[] | T | undefined>;
    }

    interface ChatMessageRenderData {
        message: RawObject<ChatMessage>;
        user: User;
        author: User;
        alias: string;
        borderColor?: string;
        cssClass: string;
        isWhisper: number;
        canDelete: boolean;
        whisperTo: string;
    }
}
