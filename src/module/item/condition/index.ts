import { AbstractEffectPF2e, EffectBadge } from "@item/abstract-effect";
import { RuleElementOptions, RuleElementPF2e } from "@module/rules";
import { UserPF2e } from "@module/user";
import { ErrorPF2e } from "@util";
import { ConditionData, ConditionSlug } from "./data";

class ConditionPF2e extends AbstractEffectPF2e {
    override get badge(): EffectBadge | null {
        return this.system.value.value ? { type: "counter", value: this.system.value.value } : null;
    }

    get value(): number | null {
        return this.system.value.value;
    }

    get duration(): number | null {
        return this.system.duration.perpetual ? null : this.system.duration.value;
    }

    /** Is the condition currently active? */
    get isActive(): boolean {
        return this.system.active;
    }

    /** Is this condition locked in place by another? */
    get isLocked(): boolean {
        return !!this.system.references.parent?.id;
    }

    /** Is the condition found in the token HUD menu? */
    get isInHUD(): boolean {
        return this.system.sources.hud;
    }

    override async increase(): Promise<void> {
        if (this.actor && this.system.removable) {
            await this.actor.increaseCondition(this as Embedded<ConditionPF2e>);
        }
    }

    override async decrease(): Promise<void> {
        if (this.actor && this.system.removable) {
            await this.actor?.decreaseCondition(this as Embedded<ConditionPF2e>);
        }
    }

    /** Ensure value.isValued and value.value are in sync */
    override prepareBaseData(): void {
        super.prepareBaseData();
        const systemData = this.system;
        systemData.value.value = systemData.value.isValued ? Number(systemData.value.value) || 1 : null;
    }

    override prepareSiblingData(): void {
        if (!this.actor) throw ErrorPF2e("prepareSiblingData may only be called from an embedded item");

        // Inactive conditions shouldn't deactivate others
        if (!this.isActive) return;

        const deactivate = (condition: ConditionPF2e): void => {
            condition.system.active = false;
            condition.system.references.overriddenBy.push({ id: this.id, type: "condition" as const });
        };

        const conditions = this.actor.itemTypes.condition;

        // Deactivate conditions naturally overridden by this one
        if (this.system.overrides.length > 0) {
            const overridden = conditions.filter((c) => this.system.overrides.includes(c.slug));
            for (const condition of overridden) {
                deactivate(condition);
            }
        }

        const ofSameType = conditions.filter((c) => c !== this && c.slug === this.slug);
        for (const condition of ofSameType) {
            if (this.value && condition.value && this.value >= condition.value) {
                // Deactivate other conditions with a lower or equal value
                deactivate(condition);
            } else if (!this.isLocked) {
                // Deactivate other conditions if this condition isn't locked
                deactivate(condition);
            } else if (this.isLocked && ofSameType.every((c) => c.isLocked)) {
                // Deactivate other conditions if all conditions of this type are locked
                deactivate(condition);
            }
        }
    }

    /** Withhold all rule elements if this condition is inactive */
    override prepareRuleElements(options?: RuleElementOptions): RuleElementPF2e[] {
        return this.isActive ? super.prepareRuleElements(options) : [];
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

    protected override _onCreate(
        data: this["_source"],
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);

        if (!game.user.isGM && !this.actor?.hasPlayerOwner && game.settings.get("pf2e", "metagame.secretCondition")) {
            return;
        }

        /* Suppress floaty text on "linked" conditions */
        if (this.system.references.parent?.type !== "condition") {
            this.actor?.getActiveTokens().shift()?.showFloatyText({ create: this });
        }

        for (const token of this.actor?.getActiveTokens() ?? []) {
            token._onApplyStatusEffect(this.rollOptionSlug, true);
        }
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: ConditionModificationContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        if (!game.user.isGM && !this.actor?.hasPlayerOwner && game.settings.get("pf2e", "metagame.secretCondition")) {
            return;
        }

        const [priorValue, newValue] = [options.conditionValue, this.value];
        const valueChanged = !!priorValue && !!newValue && priorValue !== newValue;
        // Suppress floaty text on "linked" conditions
        if (valueChanged && this.system.references.parent?.type !== "condition") {
            const change = newValue > priorValue ? { create: this } : { delete: this };
            this.actor?.getActiveTokens().shift()?.showFloatyText(change);
        }
    }

    protected override _onDelete(options: DocumentModificationContext<this>, userId: string): void {
        super._onDelete(options, userId);

        if (!game.user.isGM && !this.actor?.hasPlayerOwner && game.settings.get("pf2e", "metagame.secretCondition")) {
            return;
        }

        /* Suppress floaty text on "linked" conditions */
        if (this.system.references.parent?.type !== "condition") {
            const baseName = this.system.base;
            const change = { delete: { name: baseName } };
            this.actor?.getActiveTokens().shift()?.showFloatyText(change);
        }

        for (const token of this.actor?.getActiveTokens() ?? []) {
            token._onApplyStatusEffect(this.rollOptionSlug, false);
        }
    }
}

interface ConditionPF2e {
    readonly data: ConditionData;

    get slug(): ConditionSlug;
}

interface ConditionModificationContext<T extends ConditionPF2e> extends DocumentModificationContext<T> {
    conditionValue?: number | null;
}

export { ConditionPF2e, ConditionModificationContext };
