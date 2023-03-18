import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { AbstractEffectPF2e, EffectBadge } from "@item/abstract-effect";
import { ChatMessagePF2e } from "@module/chat-message";
import { RuleElementOptions, RuleElementPF2e } from "@module/rules";
import { UserPF2e } from "@module/user";
import { TokenDocumentPF2e } from "@scene";
import { DamageCategorization } from "@system/damage/helpers";
import { DamageRoll } from "@system/damage/roll";
import { PERSISTENT_DAMAGE_IMAGES } from "@system/damage/values";
import { DegreeOfSuccess } from "@system/degree-of-success";
import { Statistic } from "@system/statistic";
import { ErrorPF2e } from "@util";
import { ConditionKey, ConditionSlug, ConditionSource, ConditionSystemData, PersistentDamageData } from "./data";

class ConditionPF2e extends AbstractEffectPF2e {
    active!: boolean;

    override get badge(): EffectBadge | null {
        if (this.system.persistent) {
            return { type: "formula", value: this.system.persistent.formula };
        }

        return this.system.value.value ? { type: "counter", value: this.system.value.value } : null;
    }

    /** Retrieve this condition's origin from its granting effect, if any */
    override get origin(): ActorPF2e | null {
        const grantingItem = this.actor?.items.get(this.flags.pf2e.grantedBy?.id ?? "");
        return grantingItem?.isOfType("affliction", "effect") ? grantingItem.origin : null;
    }

    /** A key that can be used in place of slug for condition types that are split up (persistent damage) */
    get key(): ConditionKey {
        return this.system.persistent ? `persistent-damage-${this.system.persistent.damageType}` : this.slug;
    }

    get appliedBy(): ItemPF2e | null {
        return this.actor?.items.get(this.system.references.parent?.id ?? this.flags.pf2e.grantedBy?.id ?? "") ?? null;
    }

    get value(): number | null {
        return this.system.value.value;
    }

    /** Is this condition locked in place by another? */
    override get isLocked(): boolean {
        if (this.system.references.parent?.id || super.isLocked) return true;

        const granter = this.actor?.items.get(this.flags.pf2e.grantedBy?.id ?? "");
        const grants = Object.values(granter?.flags.pf2e.itemGrants ?? {});
        return grants.find((g) => g.id === this.id)?.onDelete === "restrict";
    }

    /** Is the condition found in the token HUD menu? */
    get isInHUD(): boolean {
        return this.slug in CONFIG.PF2E.statusEffects.conditions;
    }

    /** Include damage type and possibly category for persistent-damage conditions */
    override getRollOptions(prefix = this.type): string[] {
        const options = super.getRollOptions(prefix);
        if (this.system.persistent) {
            const { damageType } = this.system.persistent;
            options.push(`damage:type:${damageType}`);
            const category = DamageCategorization.fromDamageType(damageType);
            if (category) options.push(`damage:category:${category}`);
        }

        return options;
    }

    override async increase(): Promise<void> {
        await this.actor?.increaseCondition(this as Embedded<ConditionPF2e>);
    }

    override async decrease(): Promise<void> {
        await this.actor?.decreaseCondition(this as Embedded<ConditionPF2e>);
    }

    async onEndTurn(options: { token?: TokenDocumentPF2e | null } = {}): Promise<void> {
        const actor = this.actor;
        const token = options?.token ?? actor?.token;
        if (!this.active || !actor) return;

        if (this.system.persistent) {
            const roll = await this.system.persistent.damage.clone().evaluate({ async: true });
            roll.toMessage(
                {
                    speaker: ChatMessagePF2e.getSpeaker({ actor: actor, token }),
                    flavor: `<strong>${this.name}</strong>`,
                },
                { rollMode: "roll" }
            );
        }
    }

    /** Rolls recovery for this condition if it is persistent damage */
    async rollRecovery(): Promise<void> {
        if (!this.actor) return;

        if (this.system.persistent) {
            const { dc, damageType } = this.system.persistent;
            const result = await new Statistic(this.actor, {
                slug: "recovery",
                label: game.i18n.format("PF2E.Item.Condition.PersistentDamage.Chat.RecoverLabel", {
                    name: this.name,
                }),
                check: { type: "flat-check" },
                domains: [],
            }).roll({ dc: { value: dc }, skipDialog: true });

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
        if (typeof this.badge?.value === "number") {
            this.name = `${this.name} ${this.badge.value}`;
        }
        const folder = CONFIG.PF2E.statusEffects.iconDir;
        this.img = `${folder}${this.slug}.webp`;

        if (systemData.persistent) {
            const { formula, damageType } = systemData.persistent;

            const fullFormula = `(${formula})[persistent,${damageType}]`;
            const critRule = game.settings.get("pf2e", "critRule") === "doubledamage" ? "double-damage" : "double-dice";
            const roll = new DamageRoll(fullFormula, {}, { evaluatePersistent: true, critRule });

            const dc = game.user.isGM && systemData.persistent.dc !== 15 ? systemData.persistent.dc : null;

            const localizationKey = `PF2E.Item.Condition.PersistentDamage.${dc !== null ? "NameWithDC" : "Name"}`;
            this.name = game.i18n.format(localizationKey, {
                formula,
                damageType: game.i18n.localize(CONFIG.PF2E.damageRollFlavors[damageType] ?? damageType),
                dc,
            });

            systemData.persistent.damage = roll;
            systemData.persistent.expectedValue = roll.expectedValue;
            this.img = PERSISTENT_DAMAGE_IMAGES[damageType] ?? this.img;
        }
    }

    override prepareSiblingData(): void {
        if (!this.actor) throw ErrorPF2e("prepareSiblingData may only be called from an embedded item");

        // Inactive conditions shouldn't deactivate others
        if (!this.active) return;

        const deactivate = (condition: ConditionPF2e): void => {
            condition.active = false;
            condition.system.references.overriddenBy.push({ id: this.id, type: "condition" as const });
        };

        const conditions = this.actor.itemTypes.condition;

        // Deactivate conditions naturally overridden by this one
        if (this.system.overrides.length > 0) {
            const overridden = conditions.filter((c) => this.system.overrides.includes(c.key));
            for (const condition of overridden) {
                deactivate(condition);
            }
        }

        const ofSameType = conditions.filter((c) => c !== this && c.key === this.key);
        for (const condition of ofSameType) {
            if (condition.slug === "persistent-damage") {
                const thisValue = this.system.persistent?.expectedValue ?? 0;
                const otherValue = condition.system.persistent?.expectedValue ?? 0;
                if (thisValue >= otherValue) {
                    deactivate(condition);
                }
            } else if (this.value === condition.value && (!this.isLocked || condition.isLocked)) {
                // Deactivate other equal valued conditions if this condition isn't locked or both are locked
                deactivate(condition);
            } else if (this.value && condition.value && this.value > condition.value) {
                // Deactivate other conditions with a lower or equal value
                deactivate(condition);
            }
        }
    }

    /** Log self in parent's conditions map */
    override prepareActorData(): void {
        super.prepareActorData();

        if (this.active) {
            this.actor?.conditions.set(this.slug, this);
        }
    }

    /** Withhold all rule elements if this condition is inactive */
    override prepareRuleElements(options?: RuleElementOptions): RuleElementPF2e[] {
        return this.active ? super.prepareRuleElements(options) : [];
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: ConditionModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        options.conditionValue = this.value;
        return super._preUpdate(changed, options, user);
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: ConditionModificationContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        if (!game.user.isGM && !this.actor?.hasPlayerOwner && game.settings.get("pf2e", "metagame_secretCondition")) {
            return;
        }

        const [priorValue, newValue] = [options.conditionValue, this.value];
        const valueChanged = !!priorValue && !!newValue && priorValue !== newValue;

        /* Show floaty text only for unlinked conditions */
        if (valueChanged && !this.system.references.parent?.id) {
            const change = newValue > priorValue ? { create: this } : { delete: this };
            this.actor?.getActiveTokens().shift()?.showFloatyText(change);
        }

        game.pf2e.StatusEffects.refresh();
    }
}

interface ConditionPF2e extends AbstractEffectPF2e {
    readonly _source: ConditionSource;
    system: ConditionSystemData;

    get slug(): ConditionSlug;
}

interface PersistentDamagePF2e extends ConditionPF2e {
    system: Omit<ConditionSystemData, "persistent"> & { persistent: PersistentDamageData };
}

interface ConditionModificationContext<T extends ConditionPF2e> extends DocumentModificationContext<T> {
    conditionValue?: number | null;
}

export { ConditionPF2e, ConditionModificationContext, PersistentDamagePF2e };
