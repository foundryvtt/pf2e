import { ConsumablePF2e, EffectPF2e, ItemPF2e } from "@item";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers.ts";
import { htmlQuery, htmlQueryAll } from "@util";
import { UUIDUtils } from "@util/uuid-utils.ts";

export class ConsumableSheetPF2e extends PhysicalItemSheetPF2e<ConsumablePF2e> {
    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dragSelector: "[data-effect-id]", dropSelector: "[data-effect-drops]" }],
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const effect of htmlQueryAll(html, "li[data-uuid]")) {
            const uuid = effect.dataset.uuid;
            if (!uuid) continue;

            htmlQuery(effect, "div.name")?.addEventListener("click", async () => {
                const item = await fromUuid<EffectPF2e>(uuid);
                item?.sheet.render(true);
            });

            htmlQuery(effect, "a.remove")?.addEventListener("click", () => {
                const appliedEffects = this.item.system.appliedEffects ?? [];
                appliedEffects.findSplice((effectUuid) => effectUuid === uuid);
                this.item.update({
                    "system.appliedEffects": appliedEffects,
                });
            });
        }
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ConsumableSheetData> {
        const item = this.item;
        const sheetData = await super.getData(options);
        const appliedEffects = (this.item.system.appliedEffects ?? []).map((uuid) => {
            const item = UUIDUtils.fromUuidSync(uuid);
            if (!item || !("img" in item)) {
                return {
                    uuid,
                };
            }
            return {
                uuid,
                name: item.name,
                img: item.img,
                fromWorld: !uuid.startsWith("Compendium"),
            };
        });

        return {
            ...sheetData,
            hasDetails: true,
            hasSidebar: true,
            consumableTypes: CONFIG.PF2E.consumableTypes,
            otherTags: createSheetTags(CONFIG.PF2E.otherConsumableTags, item.system.traits.otherTags),
            appliedEffects,
        };
    }

    protected override async _onDrop(event: ElementDragEvent): Promise<void> {
        event.preventDefault();
        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData: object = JSON.parse(dataString ?? "");
        const item = await ItemPF2e.fromDropData(dropData);

        if (item?.isOfType("effect")) {
            const appliedEffects = this.item.system.appliedEffects ?? [];
            if (appliedEffects.find((uuid) => uuid === item.uuid)) {
                return;
            }
            appliedEffects.push(item.uuid);
            this.item.update({ "system.appliedEffects": appliedEffects });
        }
    }
}

interface ConsumableSheetData extends PhysicalItemSheetData<ConsumablePF2e> {
    consumableTypes: ConfigPF2e["PF2E"]["consumableTypes"];
    otherTags: SheetOptions;
    appliedEffects: AppliedEffectData[];
}

interface AppliedEffectData {
    name?: string;
    img?: ImageFilePath;
    uuid: ItemUUID;
    fromWorld?: boolean;
}
