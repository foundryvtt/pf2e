import type { ActorPF2e } from "@actor";
import type { DatabaseCreateCallbackOptions, DatabaseDeleteCallbackOptions } from "@common/abstract/_types.d.mts";
import { ItemPF2e } from "@item";
import type { AbstractEffectSource } from "@item/base/data/index.ts";
import type { ShowFloatyEffectParams } from "@module/canvas/token/object.ts";
import { TokenDocumentPF2e } from "@scene";
import { ErrorPF2e, sluggify } from "@util";
import type { AbstractEffectSystemData, EffectBadge } from "./data.ts";
import { calculateRemainingDuration } from "./helpers.ts";
import type { EffectTrait } from "./types.ts";
import { DURATION_UNITS } from "./values.ts";

/** Base effect type for all PF2e effects including conditions and afflictions */
abstract class AbstractEffectPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    /** A normalized version of the slug that shows in roll options, removing certain prefixes */
    declare rollOptionSlug: string;

    static override get validTraits(): Record<EffectTrait, string> {
        return CONFIG.PF2E.effectTraits;
    }

    abstract get badge(): EffectBadge | null;

    /** Get the actor from which this effect originated */
    get origin(): ActorPF2e | null {
        const originUUID = this.system.context?.origin.actor;
        if (!originUUID || originUUID === this.actor?.uuid) return this.actor;
        if (originUUID.startsWith("Compendium.")) return null;
        // Acquire a synthetic actor with some caution: `TokenDocument#delta` is a getter that lazily constructs the
        // actor, and it may be in the middle of construction presently.
        if (originUUID.startsWith("Scene.")) {
            const tokenUUID = originUUID.replace(/\.Actor\..+$/, "");
            const tokenDoc = fromUuidSync(tokenUUID);
            if (!(tokenDoc instanceof TokenDocumentPF2e)) return null;
            const descriptor = Object.getOwnPropertyDescriptor(tokenDoc, "delta");
            return descriptor?.value instanceof ActorDelta ? (descriptor.value.syntheticActor ?? null) : null;
        }

        return fromUuidSync<ActorPF2e>(originUUID);
    }

    get traits(): Set<EffectTrait> {
        return new Set(this.system.traits.value);
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

    get totalDuration(): number {
        const { duration } = this.system;
        if (["unlimited", "encounter"].includes(duration.unit)) {
            return Infinity;
        } else {
            return duration.value * (DURATION_UNITS[duration.unit] ?? 0);
        }
    }

    get remainingDuration(): { expired: boolean; remaining: number } {
        return calculateRemainingDuration(this, this.system.duration);
    }

    abstract increase(): Promise<void>;
    abstract decrease(): Promise<void>;

    override getRollOptions(prefix: string, options?: { includeGranter?: boolean }): string[] {
        const context = this.system.context;
        const originRollOptions = ((): string[] => {
            const existingOptions = context?.origin.rollOptions.map((o) => `${prefix}:${o}`);
            if (existingOptions?.length) return existingOptions;

            const origin = this.origin;
            // Safety check: this effect's owning actor may be getting initialized during game setup and before its origin
            // has been initialized
            const originIsInitialized = !!origin?.flags?.pf2e?.rollOptions;
            // If this effect came from another actor, get that actor's roll options as well
            return originIsInitialized ? (origin.getSelfRollOptions("origin").map((o) => `${prefix}:${o}`) ?? []) : [];
        })();
        if (originRollOptions.length > 0) {
            originRollOptions.push(`${prefix}:origin`);
            if (originRollOptions.some((o) => o.startsWith(`${prefix}:origin:item:`))) {
                originRollOptions.push(`${prefix}:origin:item`);
            }
        }

        const grantingItem = this.grantedBy?.getRollOptions(`${prefix}:granter`) ?? [];
        const badge = this.badge;
        const rollContext = {
            degree: context?.roll?.degreeOfSuccess,
            total: context?.roll?.total,
        };

        return [
            ...super.getRollOptions(prefix, options),
            ...grantingItem,
            ...Object.entries({
                [`badge:type:${badge?.type}`]: !!badge,
                [`badge:value:${badge?.value}`]: !!badge,
                [`context:check:outcome:${rollContext.degree}`]: typeof rollContext.degree === "number",
                [`context:check:total:${rollContext.total}`]: typeof rollContext.total === "number",
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
                    i instanceof AbstractEffectPF2e && i.rollOptionSlug === this.rollOptionSlug,
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
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        data.system ??= {};
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

    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void {
        super._onCreate(data, options, userId);
        this.handleChange({ create: this });
    }

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
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
    readonly _source: AbstractEffectSource;
    system: AbstractEffectSystemData;
}

export { AbstractEffectPF2e };
