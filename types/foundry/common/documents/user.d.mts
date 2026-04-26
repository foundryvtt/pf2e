import {
    DocumentOwnershipNumber,
    ImageFilePath,
    UserAction,
    UserPermission,
    UserRole,
    UserRoleName,
} from "@common/constants.mjs";
import Document from "../abstract/document.mjs";
import * as fields from "../data/fields.mjs";
import { BaseActor } from "./_module.mjs";
import { DocumentClassMetadata } from "@common/abstract/_module.mjs";

/**
 * The User Document.
 * Defines the DataSchema and common behaviors for a User which are shared between both client and server.
 */
export default class BaseUser<TCharacter extends BaseActor<null> = BaseActor<null>> extends Document<
    null,
    UserSchema<TCharacter>
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<UserMetadata>;

    static override LOCALIZATION_PREFIXES: string[];

    static override defineSchema(): UserSchema<BaseActor<null>>;

    /* -------------------------------------------- */
    /*  Model Properties                            */
    /* -------------------------------------------- */

    /** A convenience test for whether this User has the NONE role. */
    get isBanned(): boolean;

    /** Test whether the User has a GAMEMASTER or ASSISTANT role in this World? */
    get isGM(): boolean;

    /**
     * Test whether the User is able to perform a certain permission action.
     * The provided permission string may pertain to an explicit permission setting or a named user role.
     * Alternatively, Gamemaster users are assumed to be allowed to take all actions.
     *
     * @param action The action to test
     * @return Does the user have the ability to perform this action?
     */
    can(action: UserAction | UserPermission): boolean;

    override getUserLevel(user: this): DocumentOwnershipNumber;

    /**
     * Test whether the User has at least a specific permission
     * @param permission The permission name from USER_PERMISSIONS to test
     * @return Does the user have at least this permission
     */
    hasPermission(permission: UserPermission): boolean;

    /**
     * Test whether the User has at least the permission level of a certain role
     * @param role The role name from USER_ROLES to test
     * @param [exact] Require the role match to be exact
     * @return Does the user have at this role level (or greater)?
     */
    hasRole(role: UserRole | UserRoleName, { exact }?: { exact: boolean }): boolean;
}

export default interface BaseUser<TCharacter extends BaseActor<null> = BaseActor<null>>
    extends Document<null, UserSchema<TCharacter>>, fields.ModelPropsFromSchema<UserSchema<TCharacter>> {
    get documentName(): UserMetadata["name"];
}

interface UserMetadata extends DocumentClassMetadata {
    name: "User";
    collection: "users";
    label: "DOCUMENT.User";
    labelPlural: "DOCUMENT.Users";
}

type UserSchema<TActor extends BaseActor<null>> = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    role: fields.NumberField<UserRole, UserRole, true, false, true>;
    password: fields.StringField<string, string, true, false, true>;
    passwordSalt: fields.StringField<string>;
    avatar: fields.FilePathField<ImageFilePath>;
    character: fields.ForeignDocumentField<TActor>;
    color: fields.ColorField<true, false, true>;
    pronouns: fields.StringField<string, string, true, false, true>;
    hotbar: fields.ObjectField<Record<number, string>>;
    permissions: fields.ObjectField<Record<string, boolean>>;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type UserSource = fields.SourceFromSchema<UserSchema<BaseActor<null>>>;
