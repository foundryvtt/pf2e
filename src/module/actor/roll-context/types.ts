import type { ActorPF2e } from "@actor";
import type { StrikeData } from "@actor/data/base.ts";
import type { Modifier } from "@actor/modifiers.ts";
import type { ItemPF2e } from "@item";
import type { AbilityTrait } from "@item/ability/types.ts";
import type { CheckContextChatFlag } from "@module/chat-message/data.ts";
import type { TokenDocumentPF2e } from "@scene";
import type { CheckDC, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import type { Statistic } from "@system/statistic/statistic.ts";

interface OpposingActorConstructorData<
    TActor extends ActorPF2e | null = ActorPF2e | null,
    TStatistic extends Statistic | StrikeData | null = Statistic | StrikeData | null,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> {
    actor?: TActor;
    /** The statistic used for the roll */
    statistic?: TStatistic | null;
    token?: TokenDocumentPF2e | null;
    item?: TItem;
}

interface OpposingActorData<
    TActor extends ActorPF2e | null,
    TStatistic extends Statistic | StrikeData | null,
    TItem extends ItemPF2e<ActorPF2e> | null,
> extends Required<OpposingActorConstructorData<TActor, TStatistic, TItem>> {}

interface UnresolvedOpposingActors<
    TStatistic extends Statistic | StrikeData | null,
    TItem extends ItemPF2e<ActorPF2e> | null,
> {
    origin: OpposingActorData<ActorPF2e | null, TStatistic | null, TItem | null> | null;
    target: OpposingActorData<ActorPF2e | null, TStatistic | null, TItem | null> | null;
}

interface RollOrigin<
    TActor extends ActorPF2e | null = ActorPF2e | null,
    TStatistic extends Statistic | StrikeData | null = Statistic | StrikeData | null,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> {
    actor: TActor;
    token: TokenDocumentPF2e | null;
    /** The statistic in use if the origin is rolling */
    statistic: TStatistic | null;
    /** Whether the origin is also the roller: usually the case unless a saving throw */
    self: boolean;
    /** The item used for the strike */
    item: TItem;
    /** Bonuses and penalties added at the time of a check */
    modifiers: Modifier[];
}

interface RollTarget {
    actor: ActorPF2e | null;
    token: TokenDocumentPF2e | null;
    /** The statistic in use if the target is rolling */
    statistic: Statistic | null;
    /** Whether the target is also the roller: usually not the case unless a saving throw */
    self: boolean;
    item: ItemPF2e<ActorPF2e> | null;
    distance: number | null;
    rangeIncrement: number | null;
}

/** Context for the attack or damage roll of a strike */
interface RollContextData<
    TActor extends ActorPF2e | null = ActorPF2e | null,
    TStatistic extends Statistic | StrikeData | null = Statistic | StrikeData | null,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> {
    /** Roll option domains */
    domains: string[];
    /** Roll options */
    options: Set<string>;
    origin: RollOrigin<TActor, TStatistic, TItem> | null;
    target: RollTarget | null;
    traits: AbilityTrait[];
}

interface CheckContextData<
    TActor extends ActorPF2e = ActorPF2e,
    TStatistic extends Statistic | StrikeData = Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> extends RollContextData<TActor, TStatistic, TItem> {
    dc: CheckDC | null;
}

interface BaseConstructorParams<
    TSelf extends ActorPF2e,
    TStatistic extends Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null,
> {
    /** An origin actor and token: required for most checks, optional for saving throws */
    origin?: OpposingActorConstructorData<TSelf | ActorPF2e | null, TStatistic | null, TItem | null> | null;
    /** A targeted actor and token: may not be applicable if the action doesn't take targets */
    target?: OpposingActorConstructorData<TSelf | ActorPF2e | null, TStatistic | null, TItem | null> | null;
    /** Domains from which to draw roll options */
    domains: string[];
    /** Initial roll options for the strike */
    options: Set<string>;
    /** Whether the request is for display in a sheet view. If so, targets are not considered */
    viewOnly?: boolean;
    /** Action traits associated with the roll */
    traits?: AbilityTrait[];
}

interface ConstructorParamsSelfIsOrigin<
    TSelf extends ActorPF2e = ActorPF2e,
    TStatistic extends Statistic | StrikeData = Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> extends BaseConstructorParams<TSelf, TStatistic, TItem> {
    origin: OpposingActorConstructorData<TSelf, TStatistic, TItem>;
    target?: OpposingActorConstructorData<ActorPF2e | null, null, null> | null;
}

interface ConstructorParamsSelfIsTarget<
    TSelf extends ActorPF2e = ActorPF2e,
    TStatistic extends Statistic | StrikeData = Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> extends BaseConstructorParams<TSelf, TStatistic, TItem> {
    origin?: OpposingActorConstructorData<ActorPF2e | null, null, TItem> | null;
    target: OpposingActorConstructorData<TSelf, TStatistic, null>;
}

type RollContextConstructorParams<
    TSelf extends ActorPF2e = ActorPF2e,
    TStatistic extends Statistic | StrikeData = Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> = ConstructorParamsSelfIsOrigin<TSelf, TStatistic, TItem> | ConstructorParamsSelfIsTarget<TSelf, TStatistic, TItem>;

type CheckContextConstructorParams<
    TSelf extends ActorPF2e = ActorPF2e,
    TStatistic extends Statistic | StrikeData = Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> = RollContextConstructorParams<TSelf, TStatistic, TItem> & {
    against?: string | null;
};

type DamageContextConstructorParams<
    TSelf extends ActorPF2e = ActorPF2e,
    TStatistic extends Statistic | StrikeData = Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null = ItemPF2e<ActorPF2e> | null,
> = RollContextConstructorParams<TSelf, TStatistic, TItem> & {
    /** The context object of the preceding check roll */
    checkContext: Maybe<CheckContextChatFlag>;
    /**
     * An outcome of a preceding check roll:
     * This may be different than what is in the context object if the user rolled damage despite a failure
     */
    outcome: Maybe<DegreeOfSuccessString>;
};

export type {
    CheckContextConstructorParams,
    CheckContextData,
    DamageContextConstructorParams,
    RollContextConstructorParams,
    RollContextData,
    RollOrigin,
    RollTarget,
    UnresolvedOpposingActors,
};
