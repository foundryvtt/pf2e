import { AfflictionPF2e, ConditionPF2e, EffectPF2e, ItemPF2e } from "@item";
import { ActionTrait } from "@item/action/data.ts";
import { ItemSheetPF2e } from "@item/sheet/base.ts";
import { ItemSheetDataPF2e } from "@item/sheet/data-types.ts";
import { ConditionManager } from "@system/conditions/index.ts";
import { DamageCategoryUnique } from "@system/damage/types.ts";
import { DAMAGE_CATEGORIES_UNIQUE } from "@system/damage/values.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, pick } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import { AfflictionConditionData, AfflictionDamage, AfflictionOnset, AfflictionStageData } from "./data.ts";

class AfflictionSheetPF2e extends ItemSheetPF2e<AfflictionPF2e> {
    static override get defaultOptions(): DocumentSheetOptions {
        const options = super.defaultOptions;
        options.dragDrop = [{ dropSelector: "[data-stage-id]" }];
        return options;
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<AfflictionSheetData> {
        // Find the "defining trait" for item sheet header purposes
        const definingTraits: ActionTrait[] = ["disease", "poison", "curse"];
        const traits = new Set(this.item.system.traits.value);
        const definingTrait = definingTraits.find((t) => traits.has(t));

        return {
            ...(await super.getData(options)),
            hasDetails: true,
            hasSidebar: true,
            itemType: game.i18n.localize(definingTrait ? CONFIG.PF2E.actionTraits[definingTrait] : "PF2E.LevelLabel"),
            conditionTypes: R.omit(CONFIG.PF2E.conditionTypes, ["persistent-damage"]),
            damageTypes: CONFIG.PF2E.damageTypes,
            damageCategories: pick(CONFIG.PF2E.damageCategories, DAMAGE_CATEGORIES_UNIQUE),
            durationUnits: R.omit(CONFIG.PF2E.timeUnits, ["encounter"]),
            onsetUnits: R.omit(CONFIG.PF2E.timeUnits, ["encounter", "unlimited"]),
            saves: CONFIG.PF2E.saves,
            stages: await this.prepareStages(),
        };
    }

    protected async prepareStages(): Promise<Record<string, AfflictionStageSheetData>> {
        const stages: Record<string, AfflictionStageSheetData> = {};

        for (const [idx, [id, stage]] of Object.entries(Object.entries(this.item.system.stages))) {
            const conditions = Object.entries(stage.conditions).reduce((result, [key, data]) => {
                const document = ConditionManager.getCondition(data.slug);
                result[key] = { ...data, document };
                return result;
            }, {} as Record<string, AfflictionConditionSheetData>);

            const effectDocuments = await UUIDUtils.fromUUIDs(stage.effects.map((e) => e.uuid));

            const effects = stage.effects.map((effect) => {
                const document = effectDocuments.find((d) => d.uuid === effect.uuid);
                if (!(document instanceof ItemPF2e)) return effect;

                return {
                    ...effect,
                    name: document.name,
                    img: document.img,
                };
            });

            stages[id] = { ...stage, stage: Number(idx) + 1, conditions, effects };
        }

        return stages;
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "[data-action=onset-add]")?.addEventListener("click", () => {
            const onset: AfflictionOnset = { value: 1, unit: "minutes" };
            this.item.update({ system: { onset } });
        });

        htmlQuery(html, "[data-action=onset-delete]")?.addEventListener("click", () => {
            this.item.update({ system: { "-=onset": null } });
        });

        htmlQuery(html, "[data-action=stage-add]")?.addEventListener("click", () => {
            const stage: AfflictionStageData = {
                damage: {},
                conditions: {},
                effects: [],
            };

            const id = randomID();
            this.item.update({ system: { stages: { [id]: stage } } });
        });

        for (const deleteIcon of htmlQueryAll(html, "[data-action=stage-delete]")) {
            deleteIcon.addEventListener("click", (event) => {
                const deleteId = htmlClosest(event.target, "[data-stage-id]")?.dataset.stageId;
                if (deleteId) {
                    this.item.update({ [`system.stages.-=${deleteId}`]: null });
                }
            });
        }

        for (const addIcon of htmlQueryAll(html, "[data-action=damage-create]") ?? []) {
            addIcon?.addEventListener("click", (event) => {
                const stageId = htmlClosest(event.target, "[data-stage-id]")?.dataset.stageId;
                if (!this.item.system.stages[stageId ?? ""]) return;

                const damage: AfflictionDamage = { formula: "", type: "untyped" };
                this.item.update({ [`system.stages.${stageId}.damage.${randomID()}`]: damage });
            });
        }

        for (const deleteIcon of htmlQueryAll(html, "[data-action=damage-delete")) {
            deleteIcon.addEventListener("click", (event) => {
                const stageId = htmlClosest(event.target, "[data-stage-id]")?.dataset.stageId;
                if (!this.item.system.stages[stageId ?? ""]) return;

                const deleteId = htmlClosest(event.target, "[data-id]")?.dataset.id;
                this.item.update({ [`system.stages.${stageId}.damage.-=${deleteId}`]: null });
            });
        }

        for (const addIcon of htmlQueryAll(html, "[data-action=condition-create") ?? []) {
            addIcon?.addEventListener("click", (event) => {
                const stageId = htmlClosest(event.target, "[data-stage-id]")?.dataset.stageId;
                if (!this.item.system.stages[stageId ?? ""]) return;

                const newCondition: AfflictionConditionData = {
                    slug: "frightened",
                    value: 1,
                };

                this.item.update({ [`system.stages.${stageId}.conditions.${randomID()}`]: newCondition });
            });
        }

        for (const conditionEl of htmlQueryAll(html, ".stage-condition[data-condition-id]")) {
            const stageId = htmlClosest(conditionEl, "[data-stage-id]")?.dataset.stageId;
            const conditionId = conditionEl.dataset.conditionId ?? "";
            const stage = this.item.system.stages[stageId ?? ""];
            if (!stage || !(conditionId in stage.conditions)) continue;

            htmlQuery(conditionEl, "[data-action=condition-link]")?.addEventListener("click", () => {
                const linked = stage.conditions[conditionId].linked;
                this.item.update({ [`system.stages.${stageId}.conditions.${conditionId}.linked`]: !linked });
            });

            htmlQuery(conditionEl, "[data-action=condition-delete]")?.addEventListener("click", () => {
                this.item.update({ [`system.stages.${stageId}.conditions.-=${conditionId}`]: null });
            });
        }

        for (const deleteIcon of htmlQueryAll(html, "[data-action=effect-delete")) {
            deleteIcon.addEventListener("click", (event) => {
                const stageId = htmlClosest(event.target, "[data-stage-id]")?.dataset.stageId;
                const stage = this.item.system.stages[stageId ?? ""];
                if (!stage) return;

                const deleteId = htmlClosest(event.target, "[data-uuid]")?.dataset.uuid;
                const effects = stage.effects.filter((e) => e.uuid !== deleteId);
                this.item.update({ [`system.stages.${stageId}.effects`]: effects });
            });
        }

        // Make all document links clickable
        for (const link of htmlQueryAll(html, "a.document-link[data-uuid]")) {
            link.addEventListener("click", async (event) => {
                const uuid = htmlClosest(event.target, "[data-uuid]")?.dataset.uuid;
                const document = await fromUuid(uuid ?? "");
                document?.sheet?.render(true);
            });
        }
    }

    override async _onDrop(event: ElementDragEvent): Promise<void> {
        if (!this.isEditable) return;

        const stageId = htmlClosest(event.target, "[data-stage-id]")?.dataset.stageId;
        if (!stageId) return;

        const stages = this.item.system.stages;
        const stage = stages[stageId];
        if (!stage) return;

        const item = await (async (): Promise<ItemPF2e | null> => {
            try {
                const dataString = event.dataTransfer?.getData("text/plain");
                const dropData = JSON.parse(dataString ?? "");
                return (await ItemPF2e.fromDropData(dropData)) ?? null;
            } catch {
                return null;
            }
        })();

        if (item instanceof EffectPF2e) {
            const effects = [...stage.effects, { uuid: item.uuid }];
            this.item.update({ system: { stages: { [stageId]: { effects } } } });
        } else {
            ui.notifications.error("PF2E.Item.Affliction.Error.RestrictedStageItem", { localize: true });
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Set empty-string damage categories to `null`
        const categories = Object.keys(formData).filter((k) =>
            /^system\.stages\.[a-z0-9]+\.damage\.[a-z0-9]+\.category$/i.test(k)
        );
        for (const key of categories) {
            formData[key] ||= null;
        }

        return super._updateObject(event, formData);
    }
}

interface AfflictionSheetData extends ItemSheetDataPF2e<AfflictionPF2e> {
    conditionTypes: Omit<ConfigPF2e["PF2E"]["conditionTypes"], "persistent-damage">;
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"];
    damageCategories: Pick<ConfigPF2e["PF2E"]["damageCategories"], DamageCategoryUnique>;
    durationUnits: Omit<ConfigPF2e["PF2E"]["timeUnits"], "encounter">;
    onsetUnits: Omit<ConfigPF2e["PF2E"]["timeUnits"], "unlimited" | "encounter">;
    saves: ConfigPF2e["PF2E"]["saves"];
    stages: Record<string, AfflictionStageSheetData>;
}

interface AfflictionStageSheetData extends AfflictionStageData {
    stage: number;
    conditions: Record<string, AfflictionConditionSheetData>;
    effects: {
        uuid: ItemUUID;
        img?: string;
        name?: string;
    }[];
}

interface AfflictionConditionSheetData extends AfflictionConditionData {
    document: ConditionPF2e | null;
}

export { AfflictionSheetPF2e };
