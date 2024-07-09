import { ActorPF2e } from "@actor";
import { ConditionPF2e, ItemPF2e } from "@item";
import { calculateRemainingDuration } from "@item/abstract-effect/helpers.ts";
import { AbstractEffectPF2e, EffectBadgeCounter } from "@item/abstract-effect/index.ts";
import { DURATION_UNITS } from "@item/abstract-effect/values.ts";
import { ConditionSlug } from "@item/condition/types.ts";
import { UserPF2e } from "@module/user/index.ts";
import { ConditionManager } from "@system/conditions/manager.ts";
import { createDamageFormula, parseTermsFromSimpleFormula } from "@system/damage/formula.ts";
import { AfflictionDamageTemplate, BaseDamageData, DamageDamageContext, DamagePF2e } from "@system/damage/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { DegreeOfSuccess } from "@system/degree-of-success.ts";
import { ErrorPF2e } from "@util";
import * as R from "remeda";
import { AfflictionFlags, AfflictionSource, AfflictionStageData, AfflictionSystemData } from "./data.ts";

/** Condition types that don't need a duration to eventually disappear. These remain even when the affliction ends */
const EXPIRING_CONDITIONS: Set<ConditionSlug> = new Set([
    "frightened",
    "sickened",
    "drained",
    "doomed",
    "stunned",
    "unconscious",
]);

class AfflictionPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends AbstractEffectPF2e<TParent> {
    constructor(source: object, context?: DocumentConstructionContext<TParent>) {
        super(source, context);
        if (BUILD_MODE === "production") {
            throw ErrorPF2e("Affliction items are not available in production builds");
        }
    }

    override get badge(): EffectBadgeCounter {
        return {
            type: "counter",
            value: this.stage,
            min: 1,
            max: this.maxStage,
            label: this.onset
                ? game.i18n.localize("PF2E.Item.Affliction.OnsetLabel")
                : game.i18n.format("PF2E.Item.Affliction.Stage", { stage: this.stage }),
        };
    }

    get stage(): number {
        return this.system.stage;
    }

    get stageData(): AfflictionStageData | null {
        return Object.values(this.system.stages).at(this.stage - 1) ?? null;
    }

    get maxStage(): number {
        return Object.keys(this.system.stages).length || 1;
    }

    override async increase(): Promise<void> {
        if (this.onset) {
            await this.update({ system: { "-=onset": null } });
        } else if (this.stage !== this.maxStage) {
            const stage = Math.min(this.maxStage, this.system.stage + 1);
            await this.update({ system: { stage } });
        }
    }

    /** Decreases the affliction stage, deleting if reduced to 0 even if an onset exists */
    override async decrease(): Promise<void> {
        const stage = this.system.stage - 1;
        if (stage === 0) {
            await this.delete();
            return;
        }

        await this.update({ system: { stage } });
    }

    /** Returns true if the affliction is currently in the onset phase */
    get onset(): boolean {
        return !!this.system.onset?.active;
    }

    get onsetDuration(): number {
        if (!this.system.onset) {
            return 0;
        }
        return this.system.onset.value * (DURATION_UNITS[this.system.onset.unit] ?? 0);
    }

    get remainingStageDuration(): { expired: boolean; remaining: number } {
        const stageDuration = this.stageData?.duration ?? { unit: "unlimited" };
        return calculateRemainingDuration(this, { ...stageDuration, expiry: "turn-end" });
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.system.stage = Math.clamp(this.system.stage, this.badge.min, this.maxStage);

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
            });

            const roll = new DamageRoll(formula);
            const stageLabel = game.i18n.format("PF2E.Item.Affliction.Stage", { stage: this.stage });
            const template: AfflictionDamageTemplate = {
                name: `${this.name} - ${stageLabel}`,
                damage: { roll, breakdown },
                materials: [],
                modifiers: [],
            };

            // Context isn't used for affliction damage rolls, but we still need it for creating messages
            const context: DamageDamageContext = {
                type: "damage-roll",
                sourceType: "save",
                outcome: "failure",
                domains: [],
                options: new Set(),
                self: null,
                traits: this.system.traits.value,
            };

            return { template, context };
        } catch (err) {
            console.error(err);
        }

        return null;
    }

    /** Run all updates that need to occur whenever the stage changes */
    protected async handleStageChange(): Promise<void> {
        const actor = this.actor;
        if (!actor) return;

        // Remove linked items first
        const itemsToDelete = this.getLinkedItems().map((i) => i.id);
        await actor.deleteEmbeddedDocuments("Item", itemsToDelete);

        const currentStage = this.stageData;
        if (!currentStage) return;

        // Get all conditions we need to add or update
        const conditionsToAdd: ConditionPF2e[] = [];
        const conditionsToUpdate: Record<string, { value: number; linked: boolean }> = {};
        for (const data of Object.values(currentStage.conditions ?? {})) {
            const value = data.value ?? 1;

            // Try to get an existing one to update first. This occurs for unlinked OR auto-expiring ones that linger
            const existing = (() => {
                const allExisting = actor.conditions.bySlug(data.slug, { temporary: false });
                const byAffliction = allExisting.find((i) => i.appliedBy === this);
                if (byAffliction) return byAffliction;

                if (!data.linked) {
                    return R.maxBy(
                        allExisting.filter((i) => !i.appliedBy && !i.isLocked),
                        (c) => (c.active ? Infinity : c.value ?? 0),
                    );
                }

                return null;
            })();

            // There is no need to create a new condition if one exists, perform an update instead
            if (existing) {
                if (existing.system.value.isValued) {
                    conditionsToUpdate[existing.id] = { value, linked: !!data.linked };
                }
                continue;
            }

            // This is a new condition, set some flags
            const condition = ConditionManager.getCondition(data.slug);
            condition.updateSource({ "flags.pf2e.grantedBy.id": this.id });
            if (data.linked) {
                condition.updateSource({ "system.references.parent.id": this.id });
            }
            if (condition.system.value.isValued && value > 1) {
                condition.updateSource({ "system.value.value": data.value });
            }
            conditionsToAdd.push(condition);
        }

        // Insert new conditions
        const additions = conditionsToAdd.map((c) => c.toObject());
        await actor.createEmbeddedDocuments("Item", additions);

        // Perform updates on existing ones to update their values
        await actor.updateEmbeddedDocuments(
            "Item",
            Object.entries(conditionsToUpdate).map(([_id, data]) => ({
                _id,
                "system.value.value": data.value,
                "flags.pf2e.grantedBy.id": this.id,
                ...(data.linked ? { "system.references.parent.id": this.id } : {}),
            })),
        );

        // Show message if there is no onset
        if (!this.system.onset) {
            await this.createStageMessage();
        }
    }

    override getLinkedItems(): ItemPF2e<ActorPF2e>[] {
        if (!this.actor) return [];
        return this.actor.items.filter(
            (i) =>
                i.isOfType("condition") &&
                !EXPIRING_CONDITIONS.has(i.slug) &&
                i.flags.pf2e.grantedBy?.id === this.id &&
                i.system.references.parent?.id === this.id,
        );
    }

    async createStageMessage(): Promise<void> {
        const actor = this.actor;
        if (!actor) return;

        const damage = this.getStageDamage(this.stage);
        if (damage) {
            const { template, context } = damage;
            await DamagePF2e.roll(template, context);
        }
    }

    /** Set the start time and initiative roll of a newly created effect */
    protected override async _preCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (this.isOwned) {
            const initiative = this.origin?.combatant?.initiative ?? game.combat?.combatant?.initiative ?? null;
            this._source.system.start = { value: game.time.worldTime + this.onsetDuration, initiative };
        } else {
            // Force minimum stage and active onset if there is no actor
            data.system.stage = 1;
            if (data.system.onset) data.system.onset.active = true;
        }

        return super._preCreate(data, operation, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<AfflictionSource>,
        operation: DatabaseUpdateOperation<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        const duration = changed.system?.duration;
        if (typeof duration?.unit === "string" && !["unlimited", "encounter"].includes(duration.unit)) {
            if (duration.value === -1) duration.value = 1;
        }

        return super._preUpdate(changed, operation, user);
    }

    protected override _onCreate(
        data: AfflictionSource,
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void {
        super._onCreate(data, operation, userId);
        if (game.user === this.actor?.primaryUpdater) {
            this.handleStageChange();
        }
    }

    override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void {
        super._onUpdate(changed, operation, userId);

        // If the stage changed, perform stage change events
        if (changed.system?.stage && game.user === this.actor?.primaryUpdater) {
            this.handleStageChange();
        }
    }

    async rollRecovery(): Promise<void> {
        if (!this.actor) return;

        const save = this.actor.saves?.[this.system.save.type];
        if (save) {
            const result = await save.roll({
                dc: { value: this.system.save.value },
                extraRollOptions: this.getRollOptions("item"),
            });

            if ((result?.degreeOfSuccess ?? 0) >= DegreeOfSuccess.SUCCESS) {
                this.decrease();
            } else {
                this.increase();
            }
        }
    }

    override prepareActorData(): void {
        super.prepareActorData();
        const actor = this.actor;
        if (!actor) throw ErrorPF2e("prepareActorData called from unembedded item");

        if (this.onset) {
            actor.rollOptions.all[`self:${this.type}:${this.rollOptionSlug}:onset`] = true;
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
    context: DamageDamageContext;
}

export { AfflictionPF2e };
