import { ActorPF2e } from "@actor";
import { AbstractEffectPF2e, EffectBadge } from "@item/abstract-effect/index.ts";
import { UserPF2e } from "@module/user/index.ts";
import { AfflictionFlags, AfflictionSource, AfflictionSystemData } from "./data.ts";
import { AfflictionDamageTemplate, DamagePF2e, DamageRollContext, BaseDamageData } from "@system/damage/index.ts";
import { createDamageFormula, parseTermsFromSimpleFormula } from "@system/damage/formula.ts";
import { DamageRoll } from "@system/damage/roll.ts";

class AfflictionPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    override get badge(): EffectBadge {
        const label = game.i18n.format("PF2E.Item.Affliction.Stage", { stage: this.stage });
        return { type: "counter", value: this.stage, label };
    }

    get stage(): number {
        return this.system.stage;
    }

    override async increase(): Promise<void> {
        const maxStage = Object.values(this.system.stages).length;
        if (this.stage === maxStage) return;

        const stage = Math.min(maxStage, this.system.stage + 1);
        await this.update({ system: { stage } });
    }

    override async decrease(): Promise<void> {
        const stage = this.system.stage - 1;
        if (stage === 0) {
            await this.delete();
            return;
        }

        await this.update({ system: { stage } });
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        const maxStage = Object.values(this.system.stages).length || 1;
        this.system.stage = Math.clamped(this.system.stage, 1, maxStage);

        // Set certain defaults
        for (const stage of Object.values(this.system.stages)) {
            for (const condition of Object.values(stage.conditions)) {
                condition.linked ??= true;
            }
        }
    }

    /** Retrieves the damage for a specific stage */
    getStageDamage(stage: number): AfflictionDamage | null {
        const stageData = Object.values(this.system.stages).at(stage - 1);

        const base: BaseDamageData[] = [];
        for (const data of Object.values(stageData?.damage ?? {})) {
            const { formula, type: damageType, category } = data;
            const terms = parseTermsFromSimpleFormula(formula);
            base.push({ terms, damageType, category: category ?? null });
        }

        if (!base.length) return null;

        try {
            const { formula, breakdown } = createDamageFormula({
                base,
                modifiers: [],
                dice: [],
                ignoredResistances: [],
            });

            const roll = new DamageRoll(formula);
            const stageLabel = game.i18n.format("PF2E.Item.Affliction.Stage", { stage: this.stage });
            const template: AfflictionDamageTemplate = {
                name: `${this.name} - ${stageLabel}`,
                damage: { roll, breakdown },
                notes: [],
                materials: [],
                traits: this.system.traits.value,
                modifiers: [],
            };

            // Context isn't used for affliction damage rolls, but we still need it for creating messages
            const context: DamageRollContext = {
                type: "damage-roll",
                sourceType: "save",
                outcome: "failure",
                domains: [],
                options: new Set(),
                self: null,
            };

            return { template, context };
        } catch (err) {
            console.error(err);
        }

        return null;
    }

    async createStageMessage(): Promise<void> {
        const actor = this.actor;
        if (!actor) return;

        const currentStage = Object.values(this.system.stages).at(this.stage - 1);
        if (!currentStage) return;

        const damage = this.getStageDamage(this.stage);
        if (damage) {
            const { template, context } = damage;
            await DamagePF2e.roll(template, context);
        }
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        const duration = changed.system?.duration;
        if (typeof duration?.unit === "string" && !["unlimited", "encounter"].includes(duration.unit)) {
            if (duration.value === -1) duration.value = 1;
        }

        return super._preUpdate(changed, options, user);
    }

    protected override _onCreate(
        data: AfflictionSource,
        options: DocumentModificationContext<TParent>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);
        this.createStageMessage();
    }

    override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        // If the stage changed, perform stage change events
        if (changed.system?.stage && game.user === this.actor?.primaryUpdater) {
            this.createStageMessage();
        }
    }
}

interface AfflictionPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    flags: AfflictionFlags;
    readonly _source: AfflictionSource;
    system: AfflictionSystemData;
}

interface AfflictionDamage {
    template: AfflictionDamageTemplate;
    context: DamageRollContext;
}

export { AfflictionPF2e };
