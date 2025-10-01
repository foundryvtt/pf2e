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
        this.viewOnly = !!params.viewOnly;
        this.domains = params.domains;
        this.rollOptions = params.options;
        this.isAttack = ["attack", "attack-roll", "attack-damage"].some((d) => this.domains.includes(d));
        const origin = {
            actor: params.origin?.actor ?? params.origin?.token?.actor ?? null,
            statistic: params.origin?.statistic ?? null,
            token: (() => {
                // Use assigned token for fetch one, prioritizing controlled tokens
                if (params.origin?.token) return params.origin.token;
                const activeTokens = params.origin?.actor?.getActiveTokens(true, true) ?? [];
                return activeTokens.find((t) => t.object?.controlled) ?? activeTokens.shift() ?? null;
            })(),
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
        const opposingRole = selfRole === "origin" ? "target" : "origin";
        const distance =
            originToken?.object && targetToken?.object ? originToken.object.distanceTo(targetToken.object) : null;
        const rollingActor = await this.#cloneActor(selfRole, { distance });
        const rollerStatistic = this.#getClonedStatistic(rollingActor);
        const resolvedDomains = this.domains.includes("damage")
            ? this.domains
            : ((rollerStatistic instanceof StatisticModifier
                  ? rollerStatistic.domains
                  : rollerStatistic?.check.domains) ?? this.domains);
        const itemClone =
            rollerStatistic && "item" in rollerStatistic ? rollerStatistic.item : this.#cloneItem(rollingActor);
        const itemOptions = itemClone?.getRollOptions("item") ?? [];

        // Modify this weapon from AdjustStrike rule elements
        if (rollerStatistic instanceof StatisticModifier && itemClone?.isOfType("weapon")) {
            PCAttackTraitHelpers.adjustWeapon(itemClone);
        }

        const distanceOption = Number.isInteger(distance) ? `${opposingRole}:distance:${distance}` : null;
        const rangeIncrement = itemClone ? getRangeIncrement(itemClone, distance) : null;
        const rangeIncrementOption =
            rangeIncrement && Number.isInteger(distance) ? `${opposingRole}:range-increment:${rangeIncrement}` : null;

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
                .filter(R.isNonNullish),
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
            return R.unique(traits);
        })();

        const opposingActor = await this.#cloneActor(opposingRole, { other: rollingActor, distance });
        const originIsSelf = selfRole === "origin";
        if (opposingActor) {
            rollOptions.add(opposingRole);
            for (const option of opposingActor.getSelfRollOptions(opposingRole)) {
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
        { other = null, distance = null }: { other?: ActorPF2e | null; distance?: number | null } = {},
    ): Promise<ActorPF2e | null> {
        const unresolved = this.unresolved;
        const uncloned = unresolved[which];
        const opposingRole = which === "origin" ? "target" : "origin";
        const opposingActor = other ?? unresolved[opposingRole]?.actor;
        if (!uncloned?.actor || !opposingActor) return uncloned?.actor ?? null;

        const item = this.item;
        const itemOptions = item?.getRollOptions("item") ?? [];
        const distanceOption = Number.isInteger(distance) ? `${opposingRole}:distance:${distance}` : null;

        // Extract origin and target marks
        const markOptions = (() => {
            const originActor = unresolved.origin?.actor;
            const originUuid = unresolved.origin?.token?.uuid;
            const targetActor = unresolved.target?.actor;
            const targetUuid = unresolved.target?.token?.uuid;
            const originMark = originUuid ? (targetActor?.synthetics.tokenMarks.get(originUuid) ?? []) : [];
            const targetMark = targetUuid ? (originActor?.synthetics.tokenMarks.get(targetUuid) ?? []) : [];
            const [originPrefix, targetPrefix] = which === "target" ? ["origin", "self"] : ["self", "target"];
            return [
                ...originMark.map((mark) => `${originPrefix}:mark:${mark}`),
                ...targetMark.map((mark) => `${targetPrefix}:mark:${mark}`),
            ];
        })();

        // Get ephemeral effects from the target that affect this actor while attacking
        const ephemeralEffects = await extractEphemeralEffects({
            affects: which,
            origin: unresolved.origin?.actor ?? null,
            target: unresolved.target?.actor ?? null,
            item,
            domains: this.domains,
            options: [...this.rollOptions, itemOptions, markOptions, distanceOption ?? []].flat(),
        });

        // Add an epehemeral effect from flanking
        const isFlankingAttack = this.isFlankingAttack;
        if (which === "target" && isFlankingAttack && isOffGuardFromFlanking(uncloned.actor, opposingActor)) {
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
            ? uncloned.actor.alliance === opposingActor.alliance
                ? `${opposingRole}:ally`
                : `${opposingRole}:enemy`
            : null;

        return uncloned.actor.getContextualClone(
            [
                this.rollOptions.values().toArray(),
                opposingRole,
                allyOrEnemyOption,
                opposingActor.getSelfRollOptions(opposingRole),
                distanceOption,
                markOptions,
                isFlankingAttack ? `${perspectivePrefix}:flanking` : null,
                actionOptions,
                which === "target" ? itemOptions : null,
            ]
                .flat()
                .filter(R.isNonNull),
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

    /** Attempts to retrieve the current statistic from the cloned actor if it exists */
    #getClonedStatistic(clonedActor: ActorPF2e | null): Statistic | StrikeData | null {
        const unresolvedRoller = this.unresolved[this.rollerRole];
        const unresolvedStatistic = unresolvedRoller?.statistic ?? null;
        if (this.viewOnly) return unresolvedStatistic;

        const strikeActions = clonedActor?.system.actions ?? [];
        const unclonedItem = this.item;

        if (unresolvedStatistic instanceof StatisticModifier) {
            const matchingStrike = strikeActions.find((action): action is StrikeData => {
                // Find the matching weapon or melee item
                const hasNameMatch =
                    unclonedItem?.name === action.item.name || unclonedItem?._source.name === action.item._source.name;
                if (!hasNameMatch || unclonedItem?.id !== action.item.id) return false;
                if (unclonedItem.isOfType("melee") && action.item.isOfType("melee")) return true;

                // Discriminate between melee/thrown usages by checking that both are either melee or ranged
                return (
                    action.type === "strike" &&
                    unclonedItem.isOfType("weapon") &&
                    action.item.isOfType("weapon") &&
                    unclonedItem.isMelee === action.item.isMelee &&
                    unclonedItem.isThrown === action.item.isThrown
                );
            });
            return matchingStrike ?? unresolvedStatistic;
        }

        // If this actor isn't actually a clone, return the normal statistic
        if (!unresolvedStatistic || !clonedActor || unresolvedRoller?.actor === clonedActor) {
            return unresolvedStatistic;
        }

        // Note: we may need to eventually handle heirarchies by finding the first available parent and then applying diffs
        // For now we simply return the original if we detect a deviation
        const clonedStatistic = clonedActor.getStatistic(unresolvedStatistic.slug);
        const initialHeirarchy = this.#getStatisticHierarchy(unresolvedStatistic);
        const clonedHeirarchy = this.#getStatisticHierarchy(clonedStatistic);
        if (!R.isDeepEqual(initialHeirarchy, clonedHeirarchy)) {
            return unresolvedStatistic;
        }

        return clonedStatistic ?? unresolvedStatistic;
    }

    /** Returns a statistic's inheritance hierarchy as a list of slugs */
    #getStatisticHierarchy(statistic: Statistic | null) {
        const results: string[] = [];
        let current: Statistic | null = statistic;
        while (current) {
            results.push(current.slug);
            current = current.base;
        }
        return results.reverse();
    }
}

export { RollContext };
