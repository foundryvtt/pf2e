declare class Messages extends Collection<ChatMessage> {
    entities: ChatMessage[];

    /**
     * Elements of the Messages collection are instances of the ChatMessage class
     */
    get object(): ChatMessage;

    values(): IterableIterator<ChatMessage>;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers
    /* -------------------------------------------- */

    /**
     * If requested, dispatch a Chat Bubble UI for the newly created message
     * @param response  The created ChatMessage response
     */
    protected _sayBubble(response: object): void;

    /**
     * Handle export of the chat log to a text file
     */
    protected export(): void;

    /**
     * Allow for bulk deletion of all chat messages, confirm first with a yes/no dialog.
     * @see {@link Dialog.confirm}
     */
    flush(): Promise<any>;
}

declare interface ChatMessageData extends BaseEntityData {
    type: number;
    blind?: boolean;
    content: string;
    flavor?: string;
    sound?: string;
    speaker: {
        actor?: string;
        token?: string;
        alias: string;
    };
    roll?: Roll | string;
    user: string;
    whisper?: string[] | User[];
}

/**
 * The Chat Message class is a type of :class:`Entity` which represents individual messages in the chat log.
 *
 */
declare class ChatMessage<ActorType extends Actor = Actor> extends Entity {
    data: ChatMessageData;
    /**
     * Get a reference to the user who sent the chat message
     */
    user: User<ActorType>;

    /**
     * If the Message contains a dice roll, store it here
     */
    protected _roll: any;

    /**
     * Configure the attributes of the ChatMessage Entity
     */
    static get config(): {
        baseEntity: ChatMessage;
        collection: Messages;
        embeddedEntities: any;
    };

    /* -------------------------------------------- */
    /*  Properties and Attributes
    /* -------------------------------------------- */

    /**
     * Return the recommended String alias for this message.
     * The alias could be a Token name in the case of in-character messages or dice rolls.
     * Alternatively it could be a User name in the case of OOC chat or whispers.
     */
    get alias(): string;
    /**
     * Return whether the ChatMessage is visible to the current user Messages may not be visible if they are private whispers
     */
    get visible(): boolean;

    /**
     * Is the current User the author of this message?
     */
    get isAuthor(): boolean;

    /**
     * Test whether the chat message contains a dice roll
     */
    get isRoll(): boolean;

    /**
     * Return whether the message contains a visible dice roll.
     */
    get isRollVisible(): boolean | null;

    /**
     * Return the Roll instance contained in this chat message, if one is present
     */
    get roll(): Roll;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers
	/* -------------------------------------------- */

    /**
     * Preprocess the data object used to create a new Chat Message to automatically convert some Objects to the
     * data format expected by the database handler.
     */
    protected static _preprocessCreateData(data: object): any;

    /* -------------------------------------------- */
    /*  Saving and Loading
	/* -------------------------------------------- */

    /**
     * Export the content of the chat message into a standardized log format
     */
    export(): string;

    /**
     * Given a string whisper target, return an Array of the user IDs which should be targeted for the whisper
     *
     * @param name	The target name of the whisper target
     * @return		An array of User instances
     */
    static getWhisperRecipients(name: string): User[];

    /**
     * Given a string whisper target, return an Array of the user IDs which should be targeted for the whisper
     * @param name  The target name of the whisper target
     * @returns     An array of user IDs (or possibly none)
     */
    static getWhisperIDs(name: string): string[];

    /**
     * Attempt to determine who is the speaking character (and token) for a certain Chat Message First assume that the currently controlled Token is the speaker
     * @returns  The identified speaker data
     */
    static getSpeaker({
        scene,
        actor,
        token,
        alias,
    }?: {
        scene?: Scene;
        actor?: Actor;
        token?: Token;
        alias?: string;
    }): {
        scene: string | null;
        actor: string | null;
        token: string | null;
        alias: string;
    };

    /**
     * A helper to prepare the speaker object based on a target Token
     */
    protected static _getSpeakerFromToken({
        token,
        alias,
    }?: {
        token?: Token;
        alias?: string;
    }): { scene: string | null; token: string; actor: string | null; alias: string };

    /**
     * A helper to prepare the speaker object based on a target Actor
     */
    protected static _getSpeakerFromActor({
        scene,
        actor,
        alias,
    }?: {
        scene?: Scene;
        actor?: Token;
        alias?: string;
    }): { scene: string | null; token: null; actor: string; alias: string };

    /**
     * A helper to prepare the speaker object based on a target User
     */
    protected static _getSpeakerFromUser({
        scene,
        user,
        alias,
    }?: {
        scene?: Scene;
        user?: User;
        alias?: string;
    }): { scene: string | null; token: null; actor: null; alias: string };

    /* -------------------------------------------- */
    /*  Roll Data Preparation                       */
    /* -------------------------------------------- */

    /**
     * Obtain a data object used to evaluate any dice rolls associated with this particular chat message
     */
    getRollData(): any;

    /**
     * Obtain an Actor instance which represents the speaker of this message (if any)
     * @param speaker	The speaker data object
     */
    static getSpeakerActor<S extends Scene, T extends Token>(speaker: { scene: S; token: T }): T['actor'] | null;
    static getSpeakerActor<A extends Actor>(speaker: { actor: A }): A | null;
}
