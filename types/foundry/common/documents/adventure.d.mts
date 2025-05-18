import {
    DocumentOwnershipLevel,
    ImageFilePath,
    UserAction,
    UserPermission,
    UserRole,
    UserRoleName,
} from "@common/constants.mjs";
import { Document, DocumentMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import * as documents from "./_module.mjs";

/**
 * The Document definition for an Adventure.
 * Defines the DataSchema and common behaviors for an Adventure which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Actor
 * @param context Construction context options
 */
export default class BaseAdventure extends Document<null, AdventureSchema> {
    static override get metadata(): AdventureMetadata;

    static override defineSchema(): AdventureSchema;

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
    can(action: UserAction): boolean;

    getUserLevel(user: documents.BaseUser): DocumentOwnershipLevel;

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

export default interface BaseAdventure
    extends Document<null, AdventureSchema>,
        fields.ModelPropsFromSchema<AdventureSchema> {
    get documentName(): AdventureMetadata["name"];
}

interface AdventureMetadata extends DocumentMetadata {
    name: "Adventure";
    collection: "Adventures";
    label: "DOCUMENT.Adventure";
    isPrimary: true;
}

type AdventureSchema = {
    /** The _id which uniquely identifies this Adventure document */
    _id: fields.DocumentIdField;
    /** The human-readable name of the Adventure */
    name: fields.StringField<string, string, true, false, false>;
    /** The human-readable name of the Adventure*/
    img: fields.FilePathField<ImageFilePath>;
    /** A string caption displayed under the primary image banner */
    caption: fields.HTMLField;
    /** An HTML text description for the adventure */
    description: fields.HTMLField;
    /** An array of Actor documents which are included in the adventure */
    actors: fields.SetField<fields.EmbeddedDataField<documents.BaseActor<null>>>;
    /** An array of Combat documents which are included in the adventure */
    combats: fields.SetField<fields.EmbeddedDataField<documents.BaseCombat>>;
    /** An array of Item documents which are included in the adventure */
    items: fields.SetField<fields.EmbeddedDataField<documents.BaseItem<null>>>;
    /** An array of JournalEntry documents which are included in the adventure */
    journal: fields.SetField<fields.EmbeddedDataField<documents.BaseJournalEntry>>;
    /** An array of Scene documents which are included in the adventure */
    scenes: fields.SetField<fields.EmbeddedDataField<documents.BaseScene>>;
    /** An array of RollTable documents which are included in the adventure */
    tables: fields.SetField<fields.EmbeddedDataField<documents.BaseRollTable>>;
    /** An array of Macro documents which are included in the adventure */
    macros: fields.SetField<fields.EmbeddedDataField<documents.BaseMacro>>;
    /** An array of Cards documents which are included in the adventure */
    cards: fields.SetField<fields.EmbeddedDataField<documents.BaseCards>>;
    /** An array of Playlist documents which are included in the adventure */
    playlists: fields.SetField<fields.EmbeddedDataField<documents.BasePlaylist>>;
    /** An array of Folder documents which are included in the adventure */
    folders: fields.SetField<fields.EmbeddedDataField<documents.BaseFolder>>;
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    /** The sort order of this adventure relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type AdventureSource = fields.SourceFromSchema<AdventureSchema>;
