import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { AfflictionSource, AfflictionSystemData } from "@item/affliction/data.ts";
import { ConditionSource, ConditionSystemData } from "@item/condition/data.ts";
import { EffectSource, EffectSystemData } from "@item/effect/data.ts";
import { ShowFloatyEffectParams } from "@module/canvas/token/object.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { ErrorPF2e, sluggify } from "@util";
import { EffectBadge } from "./data.ts";
import { DURATION_UNITS } from "./values.ts";
import type { UserPF2e } from "@module/user/document.ts";

/** Base effect type for all PF2e effects including conditions and afflictions */
abstract class AbstractEffectPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    /** A normalized version of the slug that shows in roll options, removing certain prefixes */
    declare rollOptionSlug: string;

    abstract get badge(): EffectBadge | null;

    abstract increase(): Promise<void>;
    abstract decrease(): Promise<void>;

    /** Get the actor from which this effect originated */
    get origin(): ActorPF2e | null {
        const requiresActorConstructed = !!(this.actor?._id && this.actor.isToken);
        const requiresCanvasReady = !!this.system.context?.origin.actor.startsWith("Scene");
        if ((requiresActorConstructed && !this.actor?.constructed) || (requiresCanvasReady && !canvas.ready)) {
            return null;
        }

        const actorOrToken: unknown = this.system.context?.origin.actor
            ? fromUuidSync(this.system.context.origin.actor)
            : this.actor;

        return actorOrToken instanceof ActorPF2e
            ? actorOrToken
            : actorOrToken instanceof TokenDocumentPF2e
            ? actorOrToken.actor
            : this.actor;
    }

    /** If false, the AbstractEffect should be hidden from the user unless they are a GM */
    get isIdentified(): boolean {
        return true;
    }

    get isLocked(): boolean {
        return false;
    }

    /** Whether this effect originated from a spell */
    get fromSpell(): boolean {
        return this.system.fromSpell;
    }

    override getRollOptions(prefix = this.type): string[] {
        const { origin } = this;
        // Safety check: this effect's owning actor may be getting initialized during game setup and before its origin
        // has been initialized
        const originIsInitialized = !!origin?.flags?.pf2e?.rollOptions;
        // If this effect came from another actor, get that actor's roll options as well
        const originRollOptions = originIsInitialized
            ? origin.getSelfRollOptions("origin").map((o) => `${prefix}:${o}`) ?? []
            : [];
        const { badge } = this;
        const itemOrigin = this.grantedBy?.getRollOptions(`${prefix}:granter`) ?? [];

        return [
            ...super.getRollOptions(prefix),
            ...itemOrigin,
            ...Object.entries({
                [`badge:type:${badge?.type}`]: !!badge,
                [`badge:value:${badge?.value}`]: !!badge,
                "from-spell": this.fromSpell,
            })
                .filter(([, isTrue]) => isTrue)
                .map(([key]) => `${prefix}:${key}`),
            ...originRollOptions,
        ];
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const slug = this.slug ?? sluggify(this.name);
        this.rollOptionSlug = slug.replace(/^(?:[a-z]+-)?(?:effect|stance)-/, "");
        this.system.fromSpell ??= false;
    }

    /** Set a self roll option for this effect */
    override prepareActorData(): void {
        const actor = this.actor;
        if (!actor) throw ErrorPF2e("prepareActorData called from unembedded item");

        actor.rollOptions.all[`self:${this.type}:${this.rollOptionSlug}`] = true;

        // Add the badge value to roll options but only if it is a number and the highest value
        const badge = this.badge;
        if (typeof badge?.value === "number") {
            const otherEffects = actor.items.filter(
                (i): i is AbstractEffectPF2e<ActorPF2e> =>
                    i instanceof AbstractEffectPF2e && i.rollOptionSlug === this.rollOptionSlug
            );
            const values = otherEffects
                .map((effect) => effect.badge?.value)
                .filter((value): value is number => typeof value === "number");
            if (badge.value >= Math.max(...values)) {
                actor.rollOptions.all[`self:${this.type}:${this.rollOptionSlug}:${badge.value}`] = true;
            }
        }
    }

    /** Log whether this effect originated from a spell */
    protected override _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<boolean | void> {
        data.system.fromSpell ??= ((): boolean => {
            const slug = this.slug ?? sluggify(this.name);
            if (slug.startsWith("spell-effect-")) return true;
            const originItem = fromUuidSync(this.system.context?.origin.item ?? "");
            return (
                originItem instanceof ItemPF2e &&
                (originItem.isOfType("spell") ||
                    (originItem.isOfType("affliction", "condition", "effect") && originItem.fromSpell))
            );
        })();

        return super._preCreate(data, options, user);
    }

    protected override _onCreate(
        data: this["_source"],
        options: DocumentModificationContext<TParent>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);
        this.handleChange({ create: this });
    }

    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        super._onDelete(options, userId);
        this.handleChange({ delete: { name: this._source.name } });
    }

    /** Attempts to show floaty text and update condition automation, depending on settings */
    private handleChange(change: ShowFloatyEffectParams) {
        const skipFloatyText =
            this.isOfType("condition") &&
            !game.user.isGM &&
            !this.actor?.hasPlayerOwner &&
            game.settings.get("pf2e", "metagame_secretCondition");
        const auraNotInCombat = this.flags.pf2e.aura && !game.combat?.started;
        const identified = game.user.isGM || this.isIdentified;

        if (skipFloatyText || !identified || auraNotInCombat) return;

        /* Show floaty text only for unlinked effects */
        if (!this.isLocked) {
            this.actor?.getActiveTokens().shift()?.showFloatyText(change);
        }

        if (this.isOfType("condition")) {
            for (const token of this.actor?.getActiveTokens() ?? []) {
                token._onApplyStatusEffect(this.rollOptionSlug, false);
            }
        }

        game.pf2e.StatusEffects.refresh();
    }
}

interface AbstractEffectPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: AfflictionSource | ConditionSource | EffectSource;
    system: AfflictionSystemData | ConditionSystemData | EffectSystemData;
}

abstract class AbstractEffectWithDurationPF2e<
    TParent extends ActorPF2e | null = ActorPF2e | null
> extends AbstractEffectPF2e<TParent> {
    get isExpired(): boolean {
        return this.system.expired;
    }

    get totalDuration(): number {
        const { duration } = this.system;
        if (["unlimited", "encounter"].includes(duration.unit)) {
            return Infinity;
        } else {
            return duration.value * (DURATION_UNITS[duration.unit] ?? 0);
        }
    }

    get remainingDuration(): { expired: boolean; remaining: number } {
        const duration = this.totalDuration;
        const { unit, expiry } = this.system.duration;
        if (unit === "encounter") {
            const isExpired = this.system.expired;
            return { expired: isExpired, remaining: isExpired ? 0 : Infinity };
        } else if (duration === Infinity) {
            return { expired: false, remaining: Infinity };
        } else {
            const start = this.system.start.value;
            const { combatant } = game.combat ?? {};

            // Prevent effects that expire at end of current turn from expiring immediately outside of encounters
            const addend = !combatant && duration === 0 && unit === "rounds" && expiry === "turn-end" ? 1 : 0;
            const remaining = start + duration + addend - game.time.worldTime;
            const result = { remaining, expired: remaining <= 0 };

            if (remaining === 0 && combatant?.actor) {
                const startInitiative = this.system.start.initiative ?? 0;
                const currentInitiative = combatant.initiative ?? 0;

                // A familiar won't be represented in the encounter tracker: use the master in its place
                const fightyActor = this.actor?.isOfType("familiar") ? this.actor.master ?? this.actor : this.actor;
                const isEffectTurnStart =
                    startInitiative === currentInitiative && combatant.actor === (this.origin ?? fightyActor);

                result.expired = isEffectTurnStart ? expiry === "turn-start" : currentInitiative < startInitiative;
            }

            return result;
        }
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.expired = this.remainingDuration.expired;
    }

    /** Set the start time and initiative roll of a newly created effect */
    protected override async _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<boolean | void> {
        if (this.isOwned) {
            const initiative = this.origin?.combatant?.initiative ?? game.combat?.combatant?.initiative ?? null;
            this._source.system.start = { value: game.time.worldTime, initiative };
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<boolean | void> {
        const duration = changed.system?.duration;
        if (duration?.unit === "unlimited") {
            duration.expiry = null;
        } else if (typeof duration?.unit === "string" && !["unlimited", "encounter"].includes(duration.unit)) {
            duration.expiry ||= "turn-start";
            if (duration.value === -1) duration.value = 1;
        }

        return super._preUpdate(changed, options, user);
    }
}

interface AbstractEffectWithDurationPF2e<TParent extends ActorPF2e | null = ActorPF2e | null>
    extends AbstractEffectPF2e<TParent> {
    system: AfflictionSystemData | EffectSystemData;
    readonly _source: AfflictionSource | EffectSource;
}

export { AbstractEffectPF2e, AbstractEffectWithDurationPF2e };
