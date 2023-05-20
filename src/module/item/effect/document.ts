import { ActorPF2e } from "@actor";
import { AbstractEffectPF2e } from "@item/abstract-effect/index.ts";
import { EffectBadge } from "@item/abstract-effect/data.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { RuleElementOptions, RuleElementPF2e } from "@module/rules/index.ts";
import { UserPF2e } from "@module/user/index.ts";
import { isObject, objectHasKey, sluggify } from "@util";
import { EffectFlags, EffectSource, EffectSystemData } from "./data.ts";

class EffectPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    static DURATION_UNITS: Readonly<Record<string, number>> = {
        rounds: 6,
        minutes: 60,
        hours: 3600,
        days: 86400,
    };

    override get badge(): EffectBadge | null {
        return this.system.badge;
    }

    get level(): number {
        return this.system.level.value;
    }

    get isExpired(): boolean {
        return this.system.expired;
    }

    get totalDuration(): number {
        const { duration } = this.system;
        if (["unlimited", "encounter"].includes(duration.unit)) {
            return Infinity;
        } else {
            return duration.value * (EffectPF2e.DURATION_UNITS[duration.unit] ?? 0);
        }
    }

    get remainingDuration(): { expired: boolean; remaining: number } {
        const duration = this.totalDuration;
        if (this.system.duration.unit === "encounter") {
            const isExpired = this.system.expired;
            return { expired: isExpired, remaining: isExpired ? 0 : Infinity };
        } else if (duration === Infinity) {
            return { expired: false, remaining: Infinity };
        } else {
            const start = this.system.start.value;
            const remaining = start + duration - game.time.worldTime;
            const result = { remaining, expired: remaining <= 0 };
            const { combatant } = game.combat ?? {};
            if (remaining === 0 && combatant) {
                const startInitiative = this.system.start.initiative ?? 0;
                const currentInitiative = combatant.initiative ?? 0;
                const isEffectTurnStart =
                    startInitiative === currentInitiative && combatant.actor === (this.origin ?? this.actor);
                result.expired = isEffectTurnStart
                    ? this.system.duration.expiry === "turn-start"
                    : currentInitiative < startInitiative;
            }

            return result;
        }
    }

    /** Whether this effect emits an aura */
    get isAura(): boolean {
        return this.rules.some((r) => r.key === "Aura");
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

        const { system } = this;
        if (["unlimited", "encounter"].includes(system.duration.unit)) {
            system.duration.expiry = null;
        } else {
            system.duration.expiry ||= "turn-start";
        }
        system.expired = this.remainingDuration.expired;

        const badge = this.system.badge;
        if (badge?.type === "counter") {
            const max = badge.labels?.length ?? Infinity;
            badge.value = Math.clamped(badge.value, 1, max);
            badge.label = badge.labels?.at(badge.value - 1)?.trim() || null;
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
            const max = badge.labels?.length ?? Infinity;
            if (badge.value >= max) return;

            const value = badge.value + 1;
            await this.update({ system: { badge: { value } } });
        }
    }

    /** Decreases if this is a counter effect, otherwise deletes entirely */
    async decrease(): Promise<void> {
        if (this.system.badge?.type !== "counter" || this.system.badge.value === 1 || this.isExpired) {
            await this.delete();
            return;
        }

        const value = this.system.badge.value - 1;
        await this.update({ system: { badge: { value } } });
    }

    /** Include a trimmed version of the "slug" roll option (e.g., effect:rage instead of effect:effect-rage) */
    override getRollOptions(prefix = this.type): string[] {
        const slug = this.slug ?? sluggify(this.name);
        const trimmedSlug = slug.replace(/^(?:spell-)?(?:effect|stance)-/, "");

        const options = super.getRollOptions(prefix);
        options.findSplice((o) => o === `${prefix}:${slug}`, `${prefix}:${trimmedSlug}`);

        return options;
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Set the start time and initiative roll of a newly created effect */
    protected override async _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        if (this.isOwned) {
            const initiative = this.origin?.combatant?.initiative ?? game.combat?.combatant?.initiative ?? null;
            this.updateSource({
                "system.start": {
                    value: game.time.worldTime,
                    initiative,
                },
            });
        }

        // If this is an immediate evaluation formula effect, pre-roll and change the badge type on creation
        const badge = data.system.badge;
        if (this.actor && badge?.type === "formula" && badge.evaluate) {
            const roll = await new Roll(badge.value, this.getRollData()).evaluate({ async: true });
            this._source.system.badge = { type: "value", value: roll.total };
            const speaker = ChatMessagePF2e.getSpeaker({ actor: this.actor, token: this.actor.token });
            roll.toMessage({ flavor: this.name, speaker });
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        const duration = changed.system?.duration;
        if (duration?.unit === "unlimited") {
            duration.expiry = null;
        } else if (typeof duration?.unit === "string" && !["unlimited", "encounter"].includes(duration.unit)) {
            duration.expiry ||= "turn-start";
            if (duration.value === -1) duration.value = 1;
        }

        // If the badge type changes, reset the value
        const badge = changed.system?.badge;
        if (isObject<EffectBadge>(badge) && badge?.type && !objectHasKey(badge, "value")) {
            badge.value = 1;
        }

        return super._preUpdate(changed, options, user);
    }

    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        if (this.actor) {
            game.pf2e.effectTracker.unregister(this as EffectPF2e<ActorPF2e>);
        }
        super._onDelete(options, userId);
    }
}

interface EffectPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    flags: EffectFlags;
    readonly _source: EffectSource;
    system: EffectSystemData;
}

export { EffectPF2e };
