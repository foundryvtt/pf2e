import type { ActorPF2e } from "@actor";
import type {
    DatabaseCreateCallbackOptions,
    DatabaseDeleteCallbackOptions,
    DatabaseUpdateCallbackOptions,
} from "@common/abstract/_types.d.mts";
import type { EffectBadge, EffectBadgeFormulaSource, EffectBadgeValueSource } from "@item/abstract-effect/data.ts";
import { AbstractEffectPF2e } from "@item/abstract-effect/index.ts";
import { BadgeReevaluationEventType } from "@item/abstract-effect/types.ts";
import { reduceItemName } from "@item/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import type { RuleElement, RuleElementOptions } from "@module/rules/index.ts";
import { ErrorPF2e, sluggify } from "@util";
import * as R from "remeda";
import type { EffectFlags, EffectSource, EffectSystemData } from "./data.ts";

class EffectPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    override get badge(): EffectBadge | null {
        return this.system.badge;
    }

    get level(): number {
        return this.system.level.value;
    }

    get isExpired(): boolean {
        return this.system.expired;
    }

    /** Whether this effect emits an aura */
    get isAura(): boolean {
        return this.rules.some((r) => r.key === "Aura" && !r.ignored);
    }

    override get isIdentified(): boolean {
        return !this.system.unidentified;
    }

    /** Does this effect originate from an aura? */
    get fromAura(): boolean {
        return !!this.flags.pf2e.aura;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.system.expired = this.remainingDuration.expired;
    }

    /** Unless this effect is temporarily constructed, ignore rule elements if it is expired */
    override prepareRuleElements(options?: Omit<RuleElementOptions, "parent">): RuleElement[] {
        if (this.isExpired && this.actor?.items.has(this.id)) {
            for (const rule of this.system.rules) {
                rule.ignored = true;
            }
        }

        return super.prepareRuleElements(options);
    }

    /** Increases if this is a counter effect, otherwise ignored outright */
    async increase(): Promise<void> {
        const badge = this.system.badge;

        if (badge?.type === "counter" && !this.isExpired) {
            const shouldLoop = badge.loop && badge.value >= badge.max;
            const value = shouldLoop ? badge.min : badge.value + 1;
            await this.update({ system: { badge: { value } } });
        }
    }

    /** Decreases if this is a counter effect, otherwise deletes entirely */
    async decrease(): Promise<void> {
        if (this.system.badge?.type !== "counter" || this.isExpired) {
            await this.delete();
            return;
        }
        const value = this.system.badge.value - 1;
        await this.update({ system: { badge: { value } } });
    }

    /** Include a trimmed version of the "slug" roll option (e.g., effect:rage instead of effect:effect-rage) */
    override getRollOptions(prefix = this.type, options?: { includeGranter?: boolean }): string[] {
        const slug = this.slug ?? sluggify(this.name);
        const trimmedSlug = slug.replace(/^(?:spell-)?(?:effect|stance)-/, "");

        const rollOptions = super.getRollOptions(prefix, options);
        rollOptions.findSplice((o) => o === `${prefix}:${slug}`, `${prefix}:${trimmedSlug}`);

        return rollOptions;
    }

    /**
     * Evaluate a formula badge, sending its result to chat.
     * @returns The resulting value badge
     */
    async #evaluateFormulaBadge(
        badge: EffectBadgeFormulaSource,
        initialValue?: number,
    ): Promise<EffectBadgeValueSource> {
        const actor = this.actor;
        if (!actor) throw ErrorPF2e("A formula badge can only be evaluated if part of an embedded effect");
        const roll = await new Roll(badge.value, this.getRollData()).evaluate();
        const initial = initialValue ?? roll.total;
        const reevaluate = badge.reevaluate ? { event: badge.reevaluate, formula: badge.value, initial } : null;
        const token = actor.getActiveTokens(false, true).shift();
        const label = badge.labels ? badge.labels?.at(roll.total - 1)?.trim() : null;
        roll.toMessage({
            flavor: [reduceItemName(this.name), label ? `(${label})` : null].filter(R.isTruthy).join(" "),
            speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
        });

        return { type: "value", value: roll.total, labels: badge.labels, reevaluate };
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Set the start time and initiative roll of a newly created effect */
    protected override async _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (this.isOwned) {
            const initiative = this.origin?.combatant?.initiative ?? game.combat?.combatant?.initiative ?? null;
            this._source.system.start = { value: game.time.worldTime, initiative };
        }

        // If this is an immediate evaluation formula effect, pre-roll and change the badge type on creation
        const badge = data.system?.badge;
        if (this.actor && badge?.type === "formula" && badge.evaluate && badge.value !== undefined) {
            this._source.system.badge = await this.#evaluateFormulaBadge(badge as EffectBadgeFormulaSource);
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        const duration = changed.system?.duration;
        if (duration?.unit === "unlimited") {
            duration.expiry = null;
            duration.value = -1;
        } else if (typeof duration?.unit === "string" && !["unlimited", "encounter"].includes(duration.unit)) {
            duration.expiry ||= "turn-start";
            if (duration.value === -1) duration.value = 1;
        }

        // Run all badge change checks. As of V12, incoming data is not diffed, so we check the merged result
        if (changed.system?.badge) {
            const badgeSource = this._source.system.badge;
            const badgeChange = fu.mergeObject(changed.system.badge, badgeSource ?? {}, { overwrite: false });
            if (badgeChange.type === "counter") {
                // Clamp to the counter value, or delete if decremented to 0
                badgeChange.labels ??= null;
                const [minValue, maxValue] = badgeChange.labels
                    ? [1, Math.min(badgeChange.labels.length, badgeChange.max ?? Infinity)]
                    : [badgeChange.min ?? 1, badgeChange.max ?? Infinity];

                // Delete the item if it goes below the minimum value, but only if it is embedded
                if (typeof badgeChange.value === "number" && badgeChange.value < minValue && this.actor) {
                    await this.actor.deleteEmbeddedDocuments("Item", [this.id]);
                    return false;
                }

                badgeChange.value = Math.clamp(badgeChange.value ?? 0, minValue, maxValue);
            }

            // Delete certain counter props under certain conditions.
            if (badgeChange.type === "counter") {
                if (badgeChange.labels) {
                    badgeChange.min = null;
                    badgeChange.max = null;
                } else {
                    badgeChange.loop = false;
                }
            }
        }

        return super._preUpdate(changed, options, user);
    }

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
        if (this.actor) {
            game.pf2e.effectTracker.unregister(this as EffectPF2e<ActorPF2e>);
        }
        super._onDelete(options, userId);
    }

    /** If applicable, reevaluate this effect's badge */
    async onEncounterEvent(event: BadgeReevaluationEventType): Promise<void> {
        const badge = this.badge;
        if (badge?.type === "value" && badge.reevaluate?.event === event) {
            const newBadge = await this.#evaluateFormulaBadge(
                {
                    type: "formula",
                    value: badge.reevaluate.formula,
                    reevaluate: badge.reevaluate.event,
                    labels: badge.labels,
                },
                badge.reevaluate.initial ?? badge.value,
            );
            await this.update({ "system.badge": newBadge });
        }
    }
}

interface EffectPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    flags: EffectFlags;
    readonly _source: EffectSource;
    system: EffectSystemData;
}

export { EffectPF2e };
