import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type { CombatantSource } from "./combatant.d.ts";
import type { BaseCombatant, BaseUser } from "./module.d.ts";

/** The Combat document model. */
export default class BaseCombat extends Document<null> {
    static override get metadata(): CombatMetadata;

    flags: DocumentFlags;

    /** A reference to the Collection of Combatant instances in the Combat document, indexed by id. */
    readonly combatants: EmbeddedCollection<BaseCombatant<this>>;

    /** Is a user able to update an existing Combat? */
    protected static _canUpdate(user: BaseUser, doc: BaseCombat, data: CombatSource): boolean;
}

export default interface BaseCombat extends Document<null> {
    readonly _source: CombatSource;

    get documentName(): "Combat";
}

interface CombatMetadata extends DocumentMetadata {
    name: "Combat";
    collection: "combats";
    label: "DOCUMENT.Combat";
    embedded: {
        Combatant: "combatants";
    };
    isPrimary: true;
    permissions: {
        create: "ASSISTANT";
        update: (typeof BaseCombat)["_canUpdate"];
        delete: "ASSISTANT";
    };
}

/**
 * The data schema for a Combat document.
 * @property _id            The _id which uniquely identifies this Combat document
 * @property scene          The _id of a Scene within which this Combat occurs
 * @property combatants     A Collection of Combatant embedded Documents
 * @property [active=false] Is the Combat encounter currently active?
 * @property [round=0]      The current round of the Combat encounter
 * @property [turn=0]       The current turn in the Combat round
 * @property [sort=0]       The current sort order of this Combat relative to others in the same Scene
 * @property [flags={}]     An object of optional key/value flags
 */
interface CombatSource {
    _id: string;
    scene: string;
    combatants: CombatantSource[];
    active: boolean;
    round: number;
    turn: number;
    sort: number;
    flags: DocumentFlags;
}
