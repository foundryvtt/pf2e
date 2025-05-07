import type { ItemUUID } from "@client/documents/_module.d.mts";
import { ItemPF2e, type AfflictionPF2e, type ConditionPF2e } from "@item";
import type { EffectTrait } from "@item/abstract-effect/types.ts";
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { ConditionManager } from "@system/conditions/index.ts";
import { DamageCategoryUnique } from "@system/damage/types.ts";
import { htmlClosest, htmlQuery, htmlQueryAll } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import type { AfflictionConditionData, AfflictionSource, AfflictionStageData, AfflictionSystemData } from "./data.ts";

class AfflictionSheetPF2e extends ItemSheetPF2e<AfflictionPF2e> {
    static override get defaultOptions(): ItemSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dropSelector: "[data-stage-index]" }],
            hasSidebar: true,
        };
    }

    override async getData(options?: Partial<ItemSheetOptions>): Promise<AfflictionSheetData> {
        const sheetData = await super.getData(options);

        // Find the "defining trait" for item sheet header purposes
        const definingTraits: EffectTrait[] = ["disease", "poison", "curse"];
        const traits = this.item.traits;
        const definingTrait = definingTraits.find((t) => traits.has(t));

        return {
            ...sheetData,
            itemType: game.i18n.localize(definingTrait ? CONFIG.PF2E.actionTraits[definingTrait] : "PF2E.LevelLabel"),
            conditionTypes: R.omit(CONFIG.PF2E.conditionTypes, ["persistent-damage"]),
            damageTypes: CONFIG.PF2E.damageTypes,
            damageCategories: R.pick(CONFIG.PF2E.damageCategories, ["precision", "persistent", "splash"]),
            durationUnits: R.omit(CONFIG.PF2E.timeUnits, ["encounter"]),
            onsetUnits: R.omit(CONFIG.PF2E.timeUnits, ["encounter", "unlimited"]),
            saves: CONFIG.PF2E.saves,
            stages: await this.prepareStages(),
            stageOptions: Object.fromEntries(
                Array.fromRange(this.item.maxStage, 1).map((s) => [
                    s.toString(),
                    game.i18n.format("PF2E.Item.Affliction.Stage", { stage: s }),
                ]),
            ),
        };
    }

    protected async prepareStages(): Promise<AfflictionStageSheetData[]> {
        const allEffectUuids = this.item.system.stages.flatMap((s) => s.effects.map((e) => e.uuid));
        const effectDocuments = await UUIDUtils.fromUUIDs(allEffectUuids);
        const effectsByUUID = R.mapToObj(effectDocuments, (e) => [e.uuid, e]);

        return this.item.system.stages.map((stage, idx) => ({
            ...stage,
            stage: idx + 1,
            conditions: stage.conditions.map((data): AfflictionConditionSheetData => {
                const document = ConditionManager.getCondition(data.slug);
                return { ...data, document };
            }),
            effects: stage.effects.map((effect) => {
                const document = effectsByUUID[effect.uuid];
                if (!(document instanceof ItemPF2e)) return effect;

                return {
                    ...effect,
                    name: document.name,
                    img: document.img,
                };
            }),
        }));
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "[data-action=onset-add]")?.addEventListener("click", () => {
            const onset: AfflictionSystemData["onset"] = { value: 1, unit: "minutes" };
            this.item.update({ system: { onset } });
        });

        htmlQuery(html, "[data-action=onset-delete]")?.addEventListener("click", () => {
            this.item.update({ system: { "-=onset": null } });
        });

        htmlQuery(html, "[data-action=add-stage]")?.addEventListener("click", () => {
            const stages = fu.deepClone(this.item._source.system.stages);
            stages.push({
                damage: [],
                conditions: [],
                effects: [],
                duration: {
                    value: -1,
                    unit: "unlimited",
                },
            });

            this.item.update({ system: { stages } });
        });

        for (const stageElement of htmlQueryAll(html, ".affliction-stage")) {
            const stageIndex = Number(stageElement.dataset.stageIndex);
            const stageData = this.item._source.system.stages[stageIndex];
            if (!stageData) continue;

            htmlQuery(stageElement, "[data-action=delete-stage]")?.addEventListener("click", () => {
                const stages = fu.deepClone(this.item._source.system.stages);
                stages.splice(stageIndex, 1);
                this.item.update({ "system.stages": stages });
            });

            htmlQuery(stageElement, "[data-action=add-damage]")?.addEventListener("click", () => {
                const stages = fu.deepClone(this.item._source.system.stages);
                stages[stageIndex].damage.push({ formula: "", damageType: "untyped", category: null });
                this.item.update({ "system.stages": stages });
            });

            for (const deleteIcon of htmlQueryAll(stageElement, "[data-action=delete-damage]")) {
                const deleteIdx = Number(htmlClosest(deleteIcon, "[data-idx]")?.dataset.idx);
                if (!Number.isInteger(deleteIdx)) continue;

                deleteIcon.addEventListener("click", () => {
                    const stages = fu.deepClone(this.item._source.system.stages);
                    stages[stageIndex].damage.splice(deleteIdx, 1);
                    this.item.update({ "system.stages": stages });
                });
            }

            htmlQuery(stageElement, "[data-action=add-condition]")?.addEventListener("click", () => {
                const stages = fu.deepClone(this.item._source.system.stages);
                stages[stageIndex].conditions.push({
                    slug: "frightened",
                    value: 1,
                    linked: true,
                });

                this.item.update({ "system.stages": stages });
            });

            for (const conditionEl of htmlQueryAll(stageElement, ".stage-condition[data-condition-index]")) {
                const conditionIndex = Number(conditionEl.dataset.conditionIndex);
                const conditionData = stageData.conditions[conditionIndex];
                if (!conditionData) continue;

                htmlQuery(conditionEl, "[data-action=link-condition]")?.addEventListener("click", () => {
                    const stages = fu.deepClone(this.item._source.system.stages);
                    stages[stageIndex].conditions[conditionIndex].linked = !conditionData.linked;
                    this.item.update({ "system.stages": stages });
                });

                htmlQuery(conditionEl, "[data-action=delete-condition]")?.addEventListener("click", () => {
                    const stages = fu.deepClone(this.item._source.system.stages);
                    stages[stageIndex].conditions.splice(conditionIndex, 1);
                    this.item.update({ "system.stages": stages });
                });
            }

            for (const deleteIcon of htmlQueryAll(stageElement, "[data-action=delete-effect")) {
                const deleteUuid = htmlClosest(deleteIcon, "[data-effect-uuid]")?.dataset.effectUuid;
                deleteIcon.addEventListener("click", () => {
                    const stages = fu.deepClone(this.item._source.system.stages);
                    stages[stageIndex].effects = stages[stageIndex].effects.filter((e) => e.uuid !== deleteUuid);
                    this.item.update({ "system.stages": stages });
                });
            }
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

    /** Handle effects being dropped  */
    override async _onDrop(event: DragEvent): Promise<void> {
        if (!this.isEditable) return;

        const stageIndex = Number(htmlClosest(event.target, "[data-stage-index]")?.dataset.stageIndex);
        if (!Number.isInteger(stageIndex) || !this.item._source.system.stages[stageIndex]) {
            return super._onDrop(event);
        }

        const item = await (async (): Promise<ItemPF2e | null> => {
            try {
                const dataString = event.dataTransfer?.getData("text/plain");
                const dropData = JSON.parse(dataString ?? "");
                return (await ItemPF2e.fromDropData(dropData)) ?? null;
            } catch {
                return null;
            }
        })();

        if (item?.isOfType("effect")) {
            const stages = fu.deepClone(this.item._source.system.stages);
            stages[stageIndex].effects.push({ uuid: item.uuid });
            this.item.update({ "system.stages": stages });
        } else {
            ui.notifications.error("PF2E.Item.Affliction.Error.RestrictedStageItem", { localize: true });
        }
    }

    /** Ensure stage updates during submit deep merge. We don't have to convert to arrays, data models handle that */
    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const data: DeepPartial<AfflictionSource> = fu.expandObject(formData);
        if (data.system?.stages) {
            for (const [stageIndex, stageData] of Object.entries(data.system?.stages)) {
                if (!stageData) continue;
                const sourceData = this.#objectify(this.item._source.system.stages[Number(stageIndex)] || {});
                data.system.stages[Number(stageIndex)] = fu.mergeObject(sourceData, stageData);
            }
        }

        return super._updateObject(event, fu.flattenObject(data));
    }

    /** Clones data, and converts all objects into arrays for easier merging */
    #objectify<T>(data: T): T {
        if (!data || typeof data !== "object") return data;

        if (Array.isArray(data)) {
            return { ...data };
        }

        return R.mapToObj(Object.entries(data), ([key, value]) => [key, this.#objectify(value)]) as T;
    }
}

interface AfflictionSheetData extends ItemSheetDataPF2e<AfflictionPF2e> {
    conditionTypes: Omit<ConfigPF2e["PF2E"]["conditionTypes"], "persistent-damage">;
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"];
    damageCategories: Pick<ConfigPF2e["PF2E"]["damageCategories"], DamageCategoryUnique>;
    durationUnits: Omit<ConfigPF2e["PF2E"]["timeUnits"], "encounter">;
    onsetUnits: Omit<ConfigPF2e["PF2E"]["timeUnits"], "unlimited" | "encounter">;
    saves: ConfigPF2e["PF2E"]["saves"];
    stages: AfflictionStageSheetData[];
    stageOptions: Record<string, string>;
}

interface AfflictionStageSheetData extends AfflictionStageData {
    stage: number;
    conditions: AfflictionConditionSheetData[];
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
