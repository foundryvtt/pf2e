import {
    DocumentOwnershipLevel,
    ImageFilePath,
    UserAction,
    UserPermission,
    UserRole,
    UserRoleName,
} from "@common/constants.mjs";
import Document, { DocumentMetadata } from "../abstract/document.mjs";
import * as fields from "../data/fields.mjs";
import { BaseActor } from "./_module.mjs";

/**
 * The base User document, which is extended by both the server and client.
 * This base User provides shared functionality which is consistent for both sides of the application.
 * Each client who connects to a Foundry Virtual Tabletop session assumes the identity of one (and only one) User.
 *
 * @param data Initial data from which to construct the document.
 * @property   data The constructed data object for the document.
 */
export default class BaseUser<TCharacter extends BaseActor<null> = BaseActor<null>> extends Document<
    null,
    UserSchema<TCharacter>
> {
    static override get metadata(): UserMetadata;

    static override defineSchema(): UserSchema<BaseActor<null>>;

    /* ---------------------------------------- */
    /*  Permissions                             */
    /* ---------------------------------------- */

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

    getUserLevel(user: this): DocumentOwnershipLevel;

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
    extends Document<null, UserSchema<TCharacter>>,
        fields.ModelPropsFromSchema<UserSchema<TCharacter>> {
    get documentName(): UserMetadata["name"];
}

interface UserMetadata extends DocumentMetadata {
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
