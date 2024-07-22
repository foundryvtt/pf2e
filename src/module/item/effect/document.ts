import type { ActorPF2e } from "@actor";
import type { BadgeReevaluationEventType, EffectBadge } from "@item/abstract-effect/data.ts";
import { AbstractEffectPF2e, EffectBadgeFormulaSource, EffectBadgeValueSource } from "@item/abstract-effect/index.ts";
import { reduceItemName } from "@item/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import type { RuleElementOptions, RuleElementPF2e } from "@module/rules/index.ts";
import type { UserPF2e } from "@module/user/index.ts";
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

        const system = this.system;
        if (["unlimited", "encounter"].includes(system.duration.unit)) {
            system.duration.expiry = null;
        } else {
            system.duration.expiry ||= "turn-start";
        }
        system.expired = this.remainingDuration.expired;

        const badge = system.badge;
        if (badge) {
            if (badge.type === "formula") {
                badge.label = null;
            } else {
                if (badge.type === "counter") badge.loop ??= false;
                badge.min = badge.labels ? 1 : badge.min ?? 1;
                badge.max = badge.labels?.length ?? badge.max ?? Infinity;
                badge.value = Math.clamp(badge.value, badge.min, badge.max);
                badge.label = badge.labels?.at(badge.value - 1)?.trim() || null;
            }

            if (badge.type === "value" && badge.reevaluate) {
                badge.reevaluate.initial ??= badge.value;
            }
        }
    }

    /** Unless this effect is temporarily constructed, ignore rule elements if it is expired */
    override prepareRuleElements(options?: RuleElementOptions): RuleElementPF2e[] {
        const autoExpireEffects = game.settings.get("pf2e", "automation.effectExpiration");
        if (autoExpireEffects && this.isExpired && this.actor?.items.has(this.id)) {
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
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (this.isOwned) {
            const initiative = this.origin?.combatant?.initiative ?? game.combat?.combatant?.initiative ?? null;
            this._source.system.start = { value: game.time.worldTime, initiative };
        }

        // If this is an immediate evaluation formula effect, pre-roll and change the badge type on creation
        const badge = data.system.badge;
        if (this.actor && badge?.type === "formula" && badge.evaluate) {
            this._source.system.badge = await this.#evaluateFormulaBadge(badge);
        }

        return super._preCreate(data, operation, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<EffectSource>,
        operation: DatabaseUpdateOperation<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        const duration = changed.system?.duration;
        if (duration?.unit === "unlimited") {
            duration.expiry = null;
        } else if (typeof duration?.unit === "string" && !["unlimited", "encounter"].includes(duration.unit)) {
            duration.expiry ||= "turn-start";
            if (duration.value === -1) duration.value = 1;
        }

        // Run all badge change checks. As of V12, incoming data is not diffed, so we check the merged result
        if (changed.system?.badge) {
            const badgeSource = this._source.system.badge;
            const badgeChange = fu.mergeObject(changed.system.badge, badgeSource ?? {}, { overwrite: false });
            const badgeTypeChanged = badgeChange.type !== badgeSource?.type;
            if (badgeTypeChanged) {
                // If the badge type changes, reset the value and min/max
                badgeChange.value = 1;
            } else if (badgeChange.type === "counter") {
                // Clamp to the counter value, or delete if decremented to 0
                const labels = badgeChange.labels;
                const [minValue, maxValue] = labels
                    ? [1, Math.min(labels.length, badgeChange.max ?? Infinity)]
                    : [badgeChange.min ?? 1, badgeChange.max ?? Infinity];

                // Delete the item if it goes below the minimum value, but only if it is embedded
                if (typeof badgeChange.value === "number" && badgeChange.value < minValue && this.actor) {
                    await this.actor.deleteEmbeddedDocuments("Item", [this.id]);
                    return false;
                }

                badgeChange.value = Math.clamp(badgeChange.value, minValue, maxValue);
            }

            // Delete min/max under certain conditions.
            if (badgeTypeChanged || badgeChange.labels || badgeChange.min === null) {
                delete badgeChange.min;
                if (badgeSource) fu.mergeObject(badgeChange, { "-=min": null });
            }
            if (badgeTypeChanged || badgeChange.labels || badgeChange.max === null) {
                delete badgeChange.max;
                if (badgeSource) fu.mergeObject(badgeChange, { "-=max": null });
            }

            // remove loop when type changes or labels are removed
            if ("loop" in badgeChange && (!badgeChange.labels || badgeTypeChanged)) {
                delete badgeChange.loop;
                if (badgeSource) fu.mergeObject(badgeChange, { "-=loop": null });
            }
        }

        return super._preUpdate(changed, operation, user);
    }

    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void {
        if (this.actor) {
            game.pf2e.effectTracker.unregister(this as EffectPF2e<ActorPF2e>);
        }
        super._onDelete(operation, userId);
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
