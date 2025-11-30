import type { ActorPF2e } from "@actor";
import type { DatabaseUpdateOperation } from "@common/abstract/_module.d.mts";
import type { ItemPF2e } from "@item";
import { AbstractEffectPF2e, EffectBadge } from "@item/abstract-effect/index.ts";
import { reduceItemName } from "@item/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { RuleElement, RuleElementOptions } from "@module/rules/index.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import { DamageCategorization } from "@system/damage/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { Grouping } from "@system/damage/terms.ts";
import { PERSISTENT_DAMAGE_IMAGES } from "@system/damage/values.ts";
import { DegreeOfSuccess } from "@system/degree-of-success.ts";
import { Statistic } from "@system/statistic/index.ts";
import { ErrorPF2e, createHTMLElement } from "@util";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";
import { ConditionSource, ConditionSystemData, PersistentDamageData } from "./data.ts";
import { ConditionKey, ConditionSlug } from "./types.ts";

class ConditionPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    declare active: boolean;

    override get badge(): EffectBadge | null {
        if (this.system.persistent) {
            return { type: "formula", value: this.system.persistent.formula, label: null, reevaluate: null };
        } else if (typeof this.system.value.value === "number") {
            return { type: "counter", min: 0, max: Infinity, label: null, value: this.system.value.value };
        }

        return null;
    }

    /** Retrieve this condition's origin from its granting effect, if any */
    override get origin(): ActorPF2e | null {
        const grantingItem = this.actor?.items.get(this.flags.pf2e.grantedBy?.id ?? "");
        return grantingItem?.isOfType("affliction", "effect") ? grantingItem.origin : super.origin;
    }

    /** A key that can be used in place of slug for condition types that are split up (persistent damage) */
    get key(): ConditionKey {
        return this.system.persistent ? `persistent-damage-${this.system.persistent.damageType}` : this.slug;
    }

    get appliedBy(): ItemPF2e<ActorPF2e> | null {
        const appliedById = this.system.references.parent?.id ?? this.flags.pf2e.grantedBy?.id ?? "";
        return this.actor?.items.get(appliedById) ?? this.actor?.conditions.get(appliedById) ?? null;
    }

    get value(): number | null {
        return this.system.value.value;
    }

    /** Is this condition locked in place by another? */
    override get isLocked(): boolean {
        const parentId = this.system.references.parent?.id ?? "";
        if (this.actor?.items.has(parentId) || this.actor?.conditions.has(parentId) || super.isLocked) {
            return true;
        }

        const granterId = this.flags.pf2e.grantedBy?.id ?? "";
        const granter = this.actor?.items.get(granterId) ?? this.actor?.conditions.get(granterId);
        const grants = Object.values(granter?.flags.pf2e.itemGrants ?? {});
        return grants.find((g) => g.id === this.id)?.onDelete === "restrict";
    }

    /** Is the condition found in the token HUD menu? */
    get isInHUD(): boolean {
        return this.slug in CONFIG.PF2E.statusEffects.conditions;
    }

    /** Create a textual breakdown of what applied this condition */
    get breakdown(): string | null {
        const actor = this.actor;
        if (!this.active || !actor) return null;

        const granters = !this.appliedBy
            ? []
            : R.unique(
                  actor.conditions
                      .bySlug(this.slug)
                      .map((condition) => {
                          const appliedBy = condition.appliedBy;
                          return !appliedBy?.isOfType("condition") || appliedBy?.active ? appliedBy : null;
                      })
                      .filter(R.isNonNull),
              );

        const list = granters
            .map((p) => reduceItemName(p.name))
            .sort((a, b) => a.localeCompare(b, game.i18n.lang))
            .join(", ");

        return list ? game.i18n.format("PF2E.EffectPanel.AppliedBy", { "condition-list": list }) : null;
    }

    /**
     * Whether this condition is in-memory rather than stored in an actor's `items` collection and cannot be updated or
     * deleted
     */
    get readonly(): boolean {
        return this.actor && this.id ? !this.actor.items.has(this.id) : false;
    }

    /** Include damage type and possibly category for persistent-damage conditions */
    override getRollOptions(prefix = this.type, options?: { includeGranter?: boolean }): string[] {
        const rollOptions = super.getRollOptions(prefix, options);
        if (this.system.persistent) {
            const { damageType } = this.system.persistent;
            rollOptions.push(`damage:type:${damageType}`, `${prefix}:damage:type:${damageType}`);
            const category = DamageCategorization.fromDamageType(damageType);
            if (category) rollOptions.push(`damage:category:${category}`, `${prefix}:damage:category:${category}`);
        }

        return rollOptions;
    }

    override async increase(this: ConditionPF2e<ActorPF2e>): Promise<void> {
        await this.actor?.increaseCondition(this);
    }

    override async decrease(this: ConditionPF2e<ActorPF2e>): Promise<void> {
        await this.actor?.decreaseCondition(this);
    }

    /**
     * Runs condition end of turn events on this actor
     * @todo convert to onEncounterEvent()
     */
    async onEndTurn(options: { token?: TokenDocumentPF2e | null } = {}): Promise<void> {
        const actor = this.actor;
        const token = options?.token ?? actor?.token;
        if (!this.active || !actor) return;

        if (this.system.persistent) {
            const roll = this.system.persistent.damage.clone();
            const flavor = await (async (): Promise<string> => {
                const traits = this.system.traits.value;
                if (traits.length === 0) {
                    return createHTMLElement("strong", { children: [this.name] }).outerHTML;
                }
                return fa.handlebars.renderTemplate(`${SYSTEM_ROOT}/templates/chat/action/flavor.hbs`, {
                    action: { title: this.name },
                    traits: traits.map((t) => traitSlugToObject(t, CONFIG.PF2E.effectTraits)),
                });
            })();
            await roll.toMessage(
                {
                    flags: { pf2e: { origin: { uuid: this.uuid } } },
                    flavor,
                    speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
                },
                { rollMode: "roll" },
            );
        }
    }

    /** Rolls recovery for this condition if it is persistent damage */
    async rollRecovery(): Promise<void> {
        if (!this.actor) return;

        if (this.system.persistent) {
            const { dc, damageType } = this.system.persistent;
            const result = await new Statistic(this.actor, {
                slug: "pd-recovery",
                label: game.i18n.format("PF2E.Item.Condition.PersistentDamage.Chat.RecoverLabel", {
                    name: this.name,
                }),
                check: { type: "flat-check" },
                domains: [],
            }).roll({ dc: { value: dc }, extraRollOptions: this.getRollOptions("item"), skipDialog: true });

            if ((result?.degreeOfSuccess ?? 0) >= DegreeOfSuccess.SUCCESS) {
                this.actor.decreaseCondition(`persistent-damage-${damageType}`);
            }
        }
    }

    /** Ensure value.isValued and value.value are in sync */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.active = true;

        const systemData = this.system;
        systemData.value.value = systemData.value.isValued ? Number(systemData.value.value) || 1 : null;

        // Append numeric badge value to condition name, set item image according to configured style
        if (this.isEmbedded && typeof this.badge?.value === "number") {
            this.name = `${this.name} ${this.badge.value}`;
        }
        const folder = CONFIG.PF2E.statusEffects.iconDir;
        this.img = `${folder}${this.slug}.webp`;

        if (systemData.persistent) {
            const { formula, damageType } = systemData.persistent;

            const fullFormula = `(${formula})[persistent,${damageType}]`;
            const critRule = game.settings.get("pf2e", "critRule") === "doubledamage" ? "double-damage" : "double-dice";
            // If this damage came from a critical hit, create the evaluatable persistent damage as also having been so
            const degreeOfSuccess = systemData.persistent.criticalHit ? 3 : null;
            const roll = new DamageRoll(fullFormula, {}, { evaluatePersistent: true, critRule, degreeOfSuccess });
            const dc = game.user.isGM && systemData.persistent.dc !== 15 ? systemData.persistent.dc : null;

            const localizationKey = `PF2E.Item.Condition.PersistentDamage.${dc !== null ? "NameWithDC" : "Name"}`;
            const headTerm = roll.instances.at(0)?.head;
            const shortFormula = headTerm instanceof Grouping ? headTerm.term.expression : headTerm?.expression;

            this.name = shortFormula
                ? game.i18n.format(localizationKey, {
                      formula: shortFormula,
                      damageType: game.i18n.localize(CONFIG.PF2E.damageRollFlavors[damageType] ?? damageType),
                      dc,
                  })
                : this.name;

            systemData.persistent.damage = roll;
            systemData.persistent.expectedValue = roll.expectedValue;
            this.img = PERSISTENT_DAMAGE_IMAGES[damageType] ?? this.img;
        }
    }

    override prepareSiblingData(this: ConditionPF2e<ActorPF2e>): void {
        if (!this.actor) throw ErrorPF2e("prepareSiblingData may only be called from an embedded item");

        // Inactive conditions shouldn't deactivate others
        if (!this.active) return;

        const deactivate = (condition: ConditionPF2e<ActorPF2e>): void => {
            condition.active = false;
            condition.system.references.overriddenBy.push({ id: this.id, type: "condition" as const });
            // This is only needed if a late-arriving (typically in-memory) condition needs to deactivate
            // already-processed condition in the actor's items collection
            for (const rule of condition.rules) {
                rule.ignored = true;
            }
        };

        const conditions = this.actor.conditions.active;

        const ofSameType = conditions.filter((c) => c !== this && c.key === this.key);
        for (const other of ofSameType) {
            const otherIsGTE = other.value === this.value || (other.value && this.value && other.value >= this.value);
            if (other.slug === "persistent-damage") {
                const thisValue = this.system.persistent?.expectedValue ?? 0;
                const otherValue = other.system.persistent?.expectedValue ?? 0;
                if (thisValue >= otherValue) deactivate(other);
            } else if (otherIsGTE && this.inMemoryOnly) {
                // Defer to other, gte condition if this one is in-memory-only
                return deactivate(this);
            } else if (this.value === other.value && (!this.isLocked || other.isLocked)) {
                // Deactivate other, equal-valued conditions if this condition isn't locked or both are locked
                deactivate(other);
            } else if (!otherIsGTE) {
                // Deactivate other conditions of lower values
                deactivate(other);
            }
        }

        // Deactivate conditions naturally overridden by this one
        if (this.system.overrides.length > 0) {
            const overridden = conditions.filter((c) => c.active && this.system.overrides.includes(c.key));
            for (const condition of overridden) {
                deactivate(condition);
            }
        }
    }

    /** Log self in parent's conditions map */
    override prepareActorData(): void {
        super.prepareActorData();
        if (!this.actor) return;

        if (this.active && this.system.persistent) {
            const { damageType } = this.system.persistent;
            this.actor.rollOptions.all[`self:condition:persistent-damage:${damageType}`] = true;
        }
    }

    /** Withhold all rule elements if this condition is inactive */
    override prepareRuleElements(options?: Omit<RuleElementOptions, "parent">): RuleElement[] {
        return this.active ? super.prepareRuleElements(options) : [];
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: ConditionUpdateOperation<TParent>,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        operation.conditionValue = this.value;
        return super._preUpdate(changed, operation, user);
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: ConditionUpdateOperation<TParent>,
        userId: string,
    ): void {
        super._onUpdate(changed, operation, userId);

        if (!game.user.isGM && !this.actor?.hasPlayerOwner && game.settings.get("pf2e", "metagame_secretCondition")) {
            return;
        }

        const [priorValue, newValue] = [operation.conditionValue, this.value];
        const valueChanged = !!priorValue && !!newValue && priorValue !== newValue;

        /* Show floaty text only for unlinked conditions */
        if (valueChanged && !this.system.references.parent?.id) {
            const change = newValue > priorValue ? { create: this } : { delete: this };
            this.actor?.getActiveTokens().shift()?.showFloatyText(change);
        }

        game.pf2e.StatusEffects.refresh();
    }
}

interface ConditionPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    readonly _source: ConditionSource;
    system: ConditionSystemData;

    get slug(): ConditionSlug;
}

interface PersistentDamagePF2e<TParent extends ActorPF2e | null> extends ConditionPF2e<TParent> {
    system: ConditionSystemData & { persistent: PersistentDamageData };
}

interface ConditionUpdateOperation<TParent extends ActorPF2e | null> extends DatabaseUpdateOperation<TParent> {
    conditionValue?: number | null;
}

export { ConditionPF2e };
export type { ConditionUpdateOperation, PersistentDamagePF2e };
