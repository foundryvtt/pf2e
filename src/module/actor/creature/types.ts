import { ActorPF2e } from "@actor";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { MeleePF2e, SpellPF2e, WeaponPF2e } from "@item";
import { SpellcastingEntryData } from "@item/data";
import { SpellcastingEntryListData } from "@item/spellcasting-entry/data";
import { ModifierPF2e } from "@actor/modifiers";
import { TokenDocumentPF2e } from "@scene";
import { CheckDC } from "@system/degree-of-success";
import { CreaturePF2e } from ".";
import { SheetOptions } from "@module/sheet/helpers";
import { ALIGNMENTS, ALIGNMENT_TRAITS } from "./values";
import { TraitViewData } from "@actor/data/base";

type Alignment = SetElement<typeof ALIGNMENTS>;
type AlignmentTrait = SetElement<typeof ALIGNMENT_TRAITS>;

type AttackItem = WeaponPF2e | MeleePF2e | SpellPF2e;

interface StrikeSelf<A extends ActorPF2e = ActorPF2e, I extends AttackItem = AttackItem> {
    actor: A;
    token: TokenDocumentPF2e | null;
    /** The item used for the strike */
    item: I;
    /** Bonuses and penalties added at the time of a strike */
    modifiers: ModifierPF2e[];
}

interface AttackTarget {
    actor: ActorPF2e;
    token: TokenDocumentPF2e;
    distance: number;
}

/** Context for the attack or damage roll of a strike */
interface StrikeRollContext<A extends ActorPF2e, I extends AttackItem> {
    /** Roll options */
    options: string[];
    self: StrikeSelf<A, I>;
    target: AttackTarget | null;
    traits: TraitViewData[];
}

interface StrikeRollContextParams<T extends AttackItem> {
    item: T;
    /** Domains from which to draw roll options */
    domains?: string[];
    /** Whether the request is for display in a sheet view. If so, targets are not considered */
    viewOnly?: boolean;
}

interface AttackRollContext<A extends ActorPF2e, I extends AttackItem> extends StrikeRollContext<A, I> {
    dc: CheckDC | null;
}

interface GetReachParameters {
    action?: "interact" | "attack";
    weapon?: WeaponPF2e | MeleePF2e | null;
}

interface IsFlatFootedParams {
    /** The circumstance potentially imposing the flat-footed condition */
    dueTo: "flanking" | "surprise" | "hidden" | "undetected";
}

interface CreatureSheetData<TActor extends CreaturePF2e = CreaturePF2e> extends ActorSheetDataPF2e<TActor> {
    languages: SheetOptions;
    abilities: ConfigPF2e["PF2E"]["abilities"];
    skills: ConfigPF2e["PF2E"]["skills"];
    actorSizes: ConfigPF2e["PF2E"]["actorSizes"];
    alignments: { [K in Alignment]?: string };
    rarity: ConfigPF2e["PF2E"]["rarityTraits"];
    attitude: ConfigPF2e["PF2E"]["attitude"];
    pfsFactions: ConfigPF2e["PF2E"]["pfsFactions"];
}

type SpellcastingSheetData = SpellcastingEntryData & SpellcastingEntryListData;

export {
    Alignment,
    AlignmentTrait,
    AttackItem,
    AttackRollContext,
    AttackTarget,
    CreatureSheetData,
    GetReachParameters,
    IsFlatFootedParams,
    SpellcastingSheetData,
    StrikeRollContext,
    StrikeRollContextParams,
    StrikeSelf,
};
