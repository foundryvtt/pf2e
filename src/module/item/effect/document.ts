import { AbstractEffectPF2e } from "@item/abstract-effect";
import { EffectBadge } from "@item/abstract-effect/data";
import { RuleElementOptions, RuleElementPF2e } from "@module/rules";
import { UserPF2e } from "@module/user";
import { isObject, objectHasKey, sluggify } from "@util";
import { EffectData } from "./data";

class EffectPF2e extends AbstractEffectPF2e {
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
            const start = this.system.start?.value ?? 0;
            const remaining = start + duration - game.time.worldTime;
            const result = { remaining, expired: remaining <= 0 };
            if (
                result.remaining === 0 &&
                ui.combat !== undefined &&
                game.combat?.active &&
                game.combat.combatant &&
                game.combat.turns.length > game.combat.turn
            ) {
                const initiative = game.combat.combatant.initiative ?? 0;
                if (initiative === this.system.start.initiative) {
                    result.expired = this.system.duration.expiry !== "turn-end";
                } else {
                    result.expired = initiative < (this.system.start.initiative ?? 0);
                }
            }
            return result;
        }
    }

    override get unidentified(): boolean {
        return this.system.unidentified ?? false;
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
        if (this.system.badge?.type === "counter" && !this.isExpired) {
            const value = this.system.badge.value + 1;
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
        const delimitedPrefix = prefix ? `${prefix}:` : "";
        const trimmedSlug = slug.replace(/^(?:spell-)?(?:effect|stance)-/, "");

        const options = super.getRollOptions(prefix);
        options.findSplice((o) => o === `${delimitedPrefix}${slug}`, `${delimitedPrefix}${trimmedSlug}`);

        return options;
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Set the start time and initiative roll of a newly created effect */
    protected override async _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        if (this.isOwned) {
            const initiative =
                game.combat && game.combat.turns.length > game.combat.turn
                    ? game.combat?.turns[game.combat.turn]?.initiative ?? null
                    : null;
            this.updateSource({
                "system.start": {
                    value: game.time.worldTime,
                    initiative,
                },
            });
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<this>,
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

    /** Show floaty text when this effect is created on an actor */
    protected override _onCreate(
        data: this["_source"],
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);

        if (!this.flags.pf2e.aura || game.combat?.started) {
            this.actor?.getActiveTokens().shift()?.showFloatyText({ create: this });
        }
    }

    /** Show floaty text when this effect is deleted from an actor */
    protected override _onDelete(options: DocumentModificationContext, userId: string): void {
        if (this.actor) {
            game.pf2e.effectTracker.unregister(this as Embedded<EffectPF2e>);
        }
        super._onDelete(options, userId);

        if (!this.flags.pf2e.aura || game.combat?.started) {
            this.actor?.getActiveTokens().shift()?.showFloatyText({ delete: this });
        }
    }
}

interface EffectPF2e {
    readonly data: EffectData;
}

export { EffectPF2e };
