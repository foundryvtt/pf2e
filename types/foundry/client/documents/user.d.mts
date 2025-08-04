import { DatabaseDeleteCallbackOptions, DatabaseUpdateCallbackOptions } from "@common/abstract/_types.mjs";
import { UserPermission } from "@common/constants.mjs";
import Token from "../canvas/placeables/token.mjs";
import UserTargets from "../canvas/placeables/tokens/targets.mjs";
import { BaseUser, Macro, TokenDocument, UserUUID } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";

type BaseUserStatic = typeof BaseUser;
interface ClientBaseUserStatic extends BaseUserStatic, ClientDocumentStatic {}

declare const ClientBaseUser: {
    new (...args: any): BaseUser & ClientDocument<null>;
} & ClientBaseUserStatic;

interface ClientBaseUser extends InstanceType<typeof ClientBaseUser> {}

/**
 * The client-side User document which extends the common BaseUser model.
 * Each User document contains UserData which defines its data schema.
 *
 * @see {@link Users}       The world-level collection of User documents
 * @see {@link UserConfig} The User configuration application
 */
export default class User extends ClientBaseUser {
    /**
     * Track whether the user is currently active in the game
     */
    active: boolean;

    /**
     * Track references to the current set of Tokens which are targeted by the User
     */
    targets: UserTargets<Token>;

    /** Track the ID of the Scene that is currently being viewed by the User */
    viewedScene: string | null;

    /**
     * Track the Token documents that this User is currently moving.
     */
    readonly movingTokens: ReadonlySet<TokenDocument>;

    /** A flag for whether the current User is a Trusted Player */
    get isTrusted(): boolean;

    /** A flag for whether this User is the connected client */
    get isSelf(): boolean;

    /**
     * Is this User the active GM?
     */
    get isActiveGM(): boolean;

    /**
     * A localized label for this User's role.
     */
    get roleLabel(): string;

    /**
     * The timestamp of the last observed activity for the user.
     */
    get lastActivityTime(): number;

    set lastActivityTime(timestamp);

    override prepareDerivedData(): void;

    /* ---------------------------------------- */
    /*  User Methods                            */
    /* ---------------------------------------- */
    /**
     * Is this User the designated User among the Users that satisfy the given condition?
     * This function calls {@link foundry.documents.collections.Users#getDesignatedUser} and compares the designated User
     * to this User.
     * @example
     * // Is the current User the designated User to create Tokens?
     * const isDesignated = game.user.isDesignated(user => user.active && user.can("TOKEN_CREATE"));
     * @param condition The condition the Users must satisfy
     * @returns Is designated User?
     */
    isDesignated(condition: (user: this) => boolean): boolean;

    /**
     * Assign a Macro to a numbered hotbar slot between 1 and 50
     * @param macro      The Macro entity to assign
     * @param [slot]     A specific numbered hotbar slot to fill
     * @param [fromSlot] An optional origin slot from which the Macro is being shifted
     * @return A Promise which resolves once the User update is complete
     */
    assignHotbarMacro(
        macro: Macro | null,
        slot?: number | string,
        { fromSlot }?: { fromSlot?: number | undefined },
    ): Promise<this>;

    /**
     * Assign a specific boolean permission to this user.
     * Modifies the user permissions to grant or restrict access to a feature.
     *
     * @param permission The permission name from USER_PERMISSIONS
     * @param allowed    Whether to allow or restrict the permission
     */
    assignPermission(permission: UserPermission, allowed: boolean): Promise<this | undefined>;

    /**
     * Submit User activity data to the server for broadcast to other players.
     * This type of data is transient, persisting only for the duration of the session and not saved to any database.
     *
     * @param activityData An object of User activity data to submit to the server for broadcast.
     * @param activityData.cursor  The coordinates of the user's cursor
     * @param activityData.focus   Is the user pulling focus to the cursor coordinates?
     * @param activityData.ping    Is the user emitting a ping at the cursor coordinates?
     * @param activityData.ruler   Serialized Ruler coordinate data in JSON format
     * @param activityData.sceneId The id of the Scene currently being viewed by the User
     * @param activityData.targets An id of Token ids which are targeted by the User
     */
    broadcastActivity(activityData?: UserActivity): void;

    /**
     * Get an Array of Macro Entities on this User's Hotbar by page
     * @param page The hotbar page number
     */
    getHotbarMacros(page?: number): object[];

    /**
     * Update the set of Token targets for the user given an array of provided Token ids.
     * @param targetIds An array of Token ids which represents the new target set
     * @internal
     */
    _onUpdateTokenTargets(targetIds?: string[]): void;

    /**
     * Query this User.
     * @param queryName The query name (must be registered in `CONFIG.queries`)
     * @param queryData The query data (must be JSON-serializable)
     * @param queryOptions The query options
     * @param queryOptions.timeout The timeout in milliseconds
     * @returns The query result
     */
    query(queryName: string, queryData: object, queryOptions?: { timeout?: number }): Promise<unknown>;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;
}

export default interface User {
    get uuid(): UserUUID;
}

export interface UserActivity {
    cursor?: object;
    focus?: boolean;
    ping?: boolean;
    ruler?: string;
    sceneId?: string;
    target?: string[];
}

export {};
