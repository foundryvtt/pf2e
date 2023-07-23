import type { Document, DocumentMetadata } from "../abstract/module.d.ts";
import type { BaseCombat, BaseUser } from "./module.d.ts";

/** The Combat document model. */
export default class BaseCombatant<TParent extends BaseCombat | null> extends Document<TParent> {
    static override get metadata(): CombatantMetadata;

    name: string;
    flags: DocumentFlags;

    /** Is a user able to update an existing Combatant? */
    protected static _canUpdate(user: BaseUser, doc: BaseCombatant<BaseCombat | null>, data: CombatantSource): boolean;
}

export default interface BaseCombatant<TParent extends BaseCombat | null> extends CombatantSource, Document<TParent> {
    readonly _source: CombatantSource;
}

interface CombatantMetadata extends DocumentMetadata {
    name: "Combatant";
    collection: "combatants";
    label: "DOCUMENT.Combatant";
    isPrimary: true;
    permissions: {
        create: "PLAYER";
        update: (typeof BaseCombatant)["_canUpdate"];
        delete: "ASSISTANT";
    };
}

/**
 * The data schema for a Combat document.
 * @property _id              The _id which uniquely identifies this Combatant embedded document
 * @property [tokenId]        The _id of a Token associated with this Combatant
 * @property [name]           A customized name which replaces the name of the Token in the tracker
 * @property [img]            A customized image which replaces the Token image in the tracker
 * @property [initiative]     The initiative score for the Combatant which determines its turn order
 * @property [hidden=false]   Is this Combatant currently hidden?
 * @property [defeated=false] Has this Combatant been defeated?
 * @property [flags={}]       An object of optional key/value flags
 */
export interface CombatantSource {
    _id: string | null;
    actorId: string;
    sceneId: string;
    tokenId: string;
    img: VideoFilePath;
    initiative: number | null;
    hidden: boolean;
    defeated: boolean;
    flags: DocumentFlags;
}
