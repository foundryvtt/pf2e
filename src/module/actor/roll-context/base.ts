import type { ActorPF2e } from "@actor";
import { PCAttackTraitHelpers } from "@actor/character/helpers.ts";
import type { StrikeData } from "@actor/data/base.ts";
import { getRangeIncrement, isOffGuardFromFlanking } from "@actor/helpers.ts";
import { StatisticModifier } from "@actor/modifiers.ts";
import type { ItemPF2e } from "@item";
import type { AbilityTrait } from "@item/ability/types.ts";
import { getPropertyRuneStrikeAdjustments } from "@item/physical/runes.ts";
import { extractEphemeralEffects } from "@module/rules/helpers.ts";
import type { Statistic } from "@system/statistic/statistic.ts";
import * as R from "remeda";
import type { RollContextConstructorParams, UnresolvedOpposingActors } from "./types.ts";
import { RollContextData, RollOrigin, RollTarget } from "./types.ts";

/** Resolve a roll context by cloning a pair of actors and feeding them with mutual roll options. */
abstract class RollContext<
    TSelf extends ActorPF2e,
    TStatistic extends Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null,
> {
    /** Origin and target data provided directly by the caller */
    protected unresolved: Readonly<UnresolvedOpposingActors<TStatistic, TItem>>;

    domains: string[];

    /** Initial roll options for the context */
    rollOptions: Set<string>;

    traits: AbilityTrait[];

    /** Whether this is a one-sided roll context for generating sheet-display data */
    viewOnly: boolean;

    /** Whether this roll is associated with an attack action */
    isAttack: boolean;

    /** Whether this roll is associated with a melee attack */
    isMeleeAttack: boolean;

    constructor(params: RollContextConstructorParams<TSelf, TStatistic, TItem>) {
        const origin = {
            actor: params.origin?.actor ?? params.origin?.token?.actor ?? null,
            statistic: params.origin?.statistic ?? null,
            token: params.origin?.token ?? params.origin?.actor?.getActiveTokens(true, true).shift() ?? null,
            item: params.origin?.item?.actor === params.origin?.actor ? (params.origin?.item ?? null) : null,
        };
        const targetActor = params.target?.actor ?? params.target?.token?.actor;
        const target =
            !params.viewOnly && targetActor
                ? {
                      actor: targetActor,
                      statistic: params.target?.statistic ?? null,
                      token: params.target?.token ?? targetActor?.getActiveTokens(true, true).shift() ?? null,
                      item: params.origin?.item ? null : (params.target?.item ?? null),
                  }
                : null;
        this.unresolved = { origin, target };
        this.domains = params.domains;
        this.rollOptions = params.options;
        this.viewOnly = !!params.viewOnly;
        this.isAttack = ["attack", "attack-roll", "attack-damage"].some((d) => this.domains.includes(d));

        const item = this.item;

        this.traits = params.traits ?? [];
        if (this.traits.length === 0 && item?.isOfType("action", "spell")) {
            this.traits = [...item.system.traits.value];
        }

        this.isMeleeAttack = this.isAttack && !!(item?.isOfType("action", "melee", "spell", "weapon") && item.isMelee);
    }

    /** The item in use for this roll */
    get item(): TItem | null {
        return this.unresolved.origin?.item ?? this.unresolved.target?.item ?? null;
    }

    get rollerRole(): "origin" | "target" {
        return this.unresolved.origin?.statistic ? "origin" : "target";
    }

    get isFlankingAttack(): boolean {
        if (this.viewOnly) return false;

        const unresolved = this.unresolved;
        const originToken = unresolved.origin?.token?.object;
        const targetToken = unresolved.target?.token?.object;
        if (!originToken || !targetToken || !this.isMeleeAttack) {
            return false;
        }

        const reach = unresolved.origin?.item?.isOfType("action", "weapon", "melee")
            ? unresolved.origin.actor?.getReach({ action: "attack", weapon: unresolved.origin.item })
            : unresolved.origin?.actor?.getReach({ action: "attack" });

        return typeof reach === "number" && originToken.isFlanking(targetToken, { reach });
    }

    async resolve(): Promise<RollContextData<TSelf, TStatistic, TItem>>;
    async resolve(): Promise<RollContextData> {
        const unresolved = this.unresolved;
        const [originToken, targetToken] = [unresolved.origin?.token ?? null, unresolved.target?.token ?? null];

        // Calculate distance and range increment, set as a roll option

        const selfRole = this.rollerRole;
        const opposerRole = selfRole === "origin" ? "target" : "origin";
        const rollingActor = await this.#cloneActor(selfRole);
        const rollerStatistic = this.#getClonedStatistic(rollingActor);
        const resolvedDomains = ((): string[] => {
            if (this.domains.includes("damage")) {
                return this.domains;
            } else {
                return (
                    (rollerStatistic instanceof StatisticModifier
                        ? rollerStatistic.domains
                        : rollerStatistic?.check.domains) ?? this.domains
                );
            }
        })();

        const itemClone =
            rollerStatistic && "item" in rollerStatistic ? rollerStatistic.item : this.#cloneItem(rollingActor);
        const itemOptions = itemClone?.getRollOptions("item") ?? [];

        // Modify this weapon from AdjustStrike rule elements
        if (rollerStatistic instanceof StatisticModifier && itemClone?.isOfType("weapon")) {
            PCAttackTraitHelpers.adjustWeapon(itemClone);
        }

        const distance =
            originToken?.object && targetToken?.object ? originToken.object.distanceTo(targetToken.object) : null;
        const distanceOption = Number.isInteger(distance) ? `${opposerRole}:distance:${distance}` : null;

        const rangeIncrement = itemClone ? getRangeIncrement(itemClone, distance) : null;
        const rangeIncrementOption =
            rangeIncrement && Number.isInteger(distance) ? `${opposerRole}:range-increment:${rangeIncrement}` : null;

        const rollOptions = new Set(
            [
                ...this.rollOptions,
                rollingActor?.getRollOptions(resolvedDomains),
                distanceOption,
                rangeIncrementOption,
                selfRole === "origin" ? this.traits.map((t) => `self:action:trait:${t}`) : [],
                itemOptions,
                // Backward compatibility for predication looking for an "attack" trait by its lonesome
                this.isAttack ? "attack" : null,
            ]
                .flat()
                .filter(R.isTruthy)
                .sort(),
        );

        const actionTraits = ((): AbilityTrait[] => {
            const traits = this.traits;
            if (itemClone?.isOfType("weapon", "melee")) {
                const strikeAdjustments = [
                    rollingActor?.synthetics.strikeAdjustments,
                    getPropertyRuneStrikeAdjustments(itemClone.system.runes.property),
                ]
                    .flat()
                    .filter(R.isTruthy);
                for (const adjustment of strikeAdjustments) {
                    adjustment.adjustTraits?.(itemClone, traits);
                }
            }

            return R.unique(traits).sort();
        })();

        const opposingActor = await this.#cloneActor(opposerRole, { other: rollingActor });
        const originIsSelf = selfRole === "origin";
        if (opposingActor) {
            rollOptions.add(opposerRole);
            for (const option of opposingActor.getSelfRollOptions(opposerRole)) {
                rollOptions.add(option);
            }
        }

        const originActor = originIsSelf ? rollingActor : opposingActor;
        const originIsRoller = originActor === rollingActor;
        const origin: RollOrigin | null = originActor
            ? {
                  actor: originActor,
                  token: originToken,
                  statistic: originIsRoller ? rollerStatistic : null,
                  item: originIsRoller ? itemClone : null,
                  self: originIsSelf,
                  modifiers: [],
              }
            : null;

        const targetActor = originIsSelf ? opposingActor : rollingActor;
        const target: RollTarget | null = targetActor
            ? {
                  actor: targetActor,
                  token: targetToken,
                  statistic: !originIsRoller && rollerStatistic && "check" in rollerStatistic ? rollerStatistic : null,
                  item: originIsRoller ? null : itemClone,
                  distance,
                  self: !originIsSelf,
                  rangeIncrement,
              }
            : null;

        return {
            domains: resolvedDomains,
            options: rollOptions,
            origin,
            target,
            traits: actionTraits,
        };
    }

    async #cloneActor(
        which: "origin" | "target",
        { other = null }: { other?: ActorPF2e | null } = {},
    ): Promise<ActorPF2e | null> {
        const unresolved = this.unresolved;
        const uncloned = unresolved[which];
        const opposingAlias = which === "origin" ? "target" : "origin";
        const otherActor = other ?? unresolved[opposingAlias]?.actor;
        if (!uncloned?.actor || !otherActor) {
            return uncloned?.actor ?? null;
        }

        const item = this.item;
        const itemOptions = item?.getRollOptions("item") ?? [];

        // Extract origin and target marks
        const markOptions = (() => {
            const originActor = unresolved.origin?.actor;
            const originUuid = unresolved.origin?.token?.uuid;
            const targetActor = unresolved.target?.actor;
            const targetUuid = unresolved.target?.token?.uuid;

            const originMark = originUuid ? targetActor?.synthetics.tokenMarks.get(originUuid) : null;
            const targetMark = targetUuid ? originActor?.synthetics.tokenMarks.get(targetUuid) : null;

            return [
                originMark ? `origin:mark:${originMark}` : null,
                targetMark ? `target:mark:${targetMark}` : null,
            ].filter(R.isTruthy);
        })();

        // Get ephemeral effects from the target that affect this actor while attacking
        const ephemeralEffects = await extractEphemeralEffects({
            affects: which,
            origin: unresolved.origin?.actor ?? null,
            target: unresolved.target?.actor ?? null,
            item,
            domains: this.domains,
            options: [...this.rollOptions, ...itemOptions, ...markOptions],
        });

        // Add an epehemeral effect from flanking
        const isFlankingAttack = this.isFlankingAttack;
        if (which === "target" && isFlankingAttack && isOffGuardFromFlanking(uncloned.actor, otherActor)) {
            const name = game.i18n.localize("PF2E.Item.Condition.Flanked");
            const condition = game.pf2e.ConditionManager.getCondition("off-guard", { name });
            ephemeralEffects.push(condition.toObject());
        }

        const perspectivePrefix = which === "origin" ? (this.rollerRole === "origin" ? "self" : "target") : "origin";
        // Don't consider this an action if the item in question is a passive action (or feat-action)
        const actionOptions =
            item?.isOfType("action", "feat") && !item.actionCost
                ? []
                : this.traits.map((t) => `${perspectivePrefix}:action:trait:${t}`);
        // Set a roll option of the form `${"target" | "origin"}:${"ally" | "enemy"}`
        const allyOrEnemyOption = uncloned.actor.alliance
            ? uncloned.actor.alliance === otherActor.alliance
                ? `${opposingAlias}:ally`
                : `${opposingAlias}:enemy`
            : null;

        return uncloned.actor.getContextualClone(
            [
                ...Array.from(this.rollOptions),
                opposingAlias,
                allyOrEnemyOption,
                ...otherActor.getSelfRollOptions(opposingAlias),
                ...markOptions,
                isFlankingAttack ? `${perspectivePrefix}:flanking` : null,
                ...actionOptions,
                ...(which === "target" ? itemOptions : []),
            ].filter(R.isNonNull),
            ephemeralEffects,
        );
    }

    #cloneItem(originActor: ActorPF2e | null): ItemPF2e<ActorPF2e> | null {
        const unresolved = this.unresolved;
        const unclonedItem = this.item;

        // 1. Simplest case: no context clone, so used the item passed to this method
        if ([unresolved.origin?.actor, unresolved.target?.actor].some((a) => a === unclonedItem?.actor)) {
            return unclonedItem;
        }

        // 2. Get the item from the statistic if it's stored therein
        const originStatistic = unresolved.origin?.statistic;
        if (
            originStatistic &&
            "item" in originStatistic &&
            originStatistic.item?.isOfType("action", "melee", "spell", "weapon")
        ) {
            return originStatistic.item;
        }

        // 3. Get the item directly from the context clone
        const maybeItemClone = unresolved.origin?.statistic ? originActor?.items.get(unclonedItem?.id ?? "") : null;
        if (maybeItemClone?.isOfType("melee", "weapon")) return maybeItemClone;

        // 4 Give up :(
        return unclonedItem;
    }

    #getClonedStatistic(clonedActor: ActorPF2e | null): Statistic | StrikeData | null {
        const unresolvedRoller = this.unresolved[this.rollerRole];
        if (this.viewOnly) return unresolvedRoller?.statistic ?? null;

        const strikeActions = clonedActor?.system.actions ?? [];
        const unclonedItem = this.item;

        return unresolvedRoller?.statistic instanceof StatisticModifier
            ? (strikeActions.find((action): boolean => {
                  // Find the matching weapon or melee item
                  if (unclonedItem?.id !== action.item.id || unclonedItem.name !== action.item.name) return false;
                  if (unclonedItem.isOfType("melee") && action.item.isOfType("melee")) return true;

                  // Discriminate between melee/thrown usages by checking that both are either melee or ranged
                  return (
                      unclonedItem.isOfType("weapon") &&
                      action.item.isOfType("weapon") &&
                      unclonedItem.isMelee === action.item.isMelee
                  );
              }) ??
                  unresolvedRoller?.statistic ??
                  null)
            : (unresolvedRoller?.statistic ?? null);
    }
}

export { RollContext };
