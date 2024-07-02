import type * as ActorInstance from "@actor";
import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import type { EffectTrait } from "@item/abstract-effect/types.ts";
import type { ItemInstances } from "@item/types.ts";
import type { RollNotePF2e } from "@module/notes.ts";
import type { ItemAlteration } from "@module/rules/rule-element/item-alteration/alteration.ts";
import type { TokenDocumentPF2e } from "@scene";
import type { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr.ts";
import type { DamageRoll } from "@system/damage/roll.ts";
import type { DegreeOfSuccessString } from "@system/degree-of-success.ts";
import type { Predicate } from "@system/predication.ts";
import type {
    ACTOR_TYPES,
    ATTRIBUTE_ABBREVIATIONS,
    CORE_SKILL_SLUGS,
    MOVEMENT_TYPES,
    SAVE_TYPES,
    UNAFFECTED_TYPES,
} from "./values.ts";

type ActorType = (typeof ACTOR_TYPES)[number];

/** Used exclusively to resolve `ActorPF2e#isOfType` */
interface ActorInstances<TParent extends TokenDocumentPF2e | null> {
    army: ActorInstance.ArmyPF2e<TParent>;
    character: ActorInstance.CharacterPF2e<TParent>;
    creature: ActorInstance.CreaturePF2e<TParent>;
    familiar: ActorInstance.FamiliarPF2e<TParent>;
    hazard: ActorInstance.HazardPF2e<TParent>;
    loot: ActorInstance.LootPF2e<TParent>;
    party: ActorInstance.PartyPF2e<TParent>;
    npc: ActorInstance.NPCPF2e<TParent>;
    vehicle: ActorInstance.VehiclePF2e<TParent>;
}

type EmbeddedItemInstances<TParent extends ActorPF2e> = {
    [K in keyof ItemInstances<TParent>]: ItemInstances<TParent>[K][];
};
type AttributeString = SetElement<typeof ATTRIBUTE_ABBREVIATIONS>;

interface ActorDimensions {
    length: number;
    width: number;
    height: number;
}

type SkillSlug = SetElement<typeof CORE_SKILL_SLUGS>;

type ActorAlliance = "party" | "opposition" | null;

type SaveType = (typeof SAVE_TYPES)[number];

type DCSlug = "ac" | "armor" | "perception" | SaveType | SkillSlug;

type MovementType = (typeof MOVEMENT_TYPES)[number];

interface AuraData {
    slug: string;
    level: number | null;
    radius: number;
    traits: EffectTrait[];
    effects: AuraEffectData[];
    appearance: AuraAppearanceData;
}

interface AuraEffectData {
    uuid: string;
    affects: "allies" | "enemies" | "all";
    events: ("enter" | "turn-start" | "turn-end")[];
    save: {
        type: SaveType;
        dc: number;
    } | null;
    predicate: Predicate;
    removeOnExit: boolean;
    includesSelf: boolean;
    alterations: ItemAlteration[];
}

interface AuraAppearanceData {
    border: { color: number; alpha: number } | null;
    highlight: { color: number; alpha: number };
    texture: {
        src: ImageFilePath | VideoFilePath;
        alpha: number;
        scale: number;
        translation: { x: number; y: number } | null;
        loop: boolean;
        playbackRate: number;
    } | null;
}

/* -------------------------------------------- */
/*  Attack Rolls                                */
/* -------------------------------------------- */

interface ApplyDamageParams {
    damage: number | Rolled<DamageRoll>;
    token: TokenDocumentPF2e;
    /** The item used in the damaging action */
    item?: ItemPF2e<ActorPF2e> | null;
    skipIWR?: boolean;
    /** Predicate statements from the damage roll */
    rollOptions?: Set<string>;
    shieldBlockRequest?: boolean;
    breakdown?: string[];
    outcome?: DegreeOfSuccessString | null;
    notes?: RollNotePF2e[];
    /** Whether to treat to not adjust the damage any further. Skips IWR regardless of its setting if set */
    final?: boolean;
}

type ImmunityType = keyof typeof immunityTypes;
type WeaknessType = keyof typeof weaknessTypes;
type ResistanceType = keyof typeof resistanceTypes;
/** Damage types a creature or hazard is possibly unaffected by, outside the IWR framework */
type UnaffectedType = SetElement<typeof UNAFFECTED_TYPES>;
type IWRType = ImmunityType | WeaknessType | ResistanceType;

export type {
    ActorAlliance,
    ActorDimensions,
    ActorInstances,
    ActorType,
    ApplyDamageParams,
    AttributeString,
    AuraAppearanceData,
    AuraData,
    AuraEffectData,
    DCSlug,
    EmbeddedItemInstances,
    IWRType,
    ImmunityType,
    MovementType,
    ResistanceType,
    SaveType,
    SkillSlug,
    UnaffectedType,
    WeaknessType,
};
