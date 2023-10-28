import { AttributeString } from "@actor/types.ts";
import type { AncestryPF2e, BackgroundPF2e, ClassPF2e, FeatPF2e } from "@item";
import { ItemPF2e } from "@item";
import { ABCFeatureEntryData } from "@item/abc/data.ts";
import { FeatOrFeatureCategory } from "@item/feat/types.ts";
import { FEAT_CATEGORIES } from "@item/feat/values.ts";
import { ItemSheetDataPF2e, ItemSheetPF2e } from "@item/base/sheet/index.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, setHasElement } from "@util";

abstract class ABCSheetPF2e<TItem extends ABCItem> extends ItemSheetPF2e<TItem> {
    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dropSelector: ".tab[data-tab=details]" }],
        };
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ABCSheetData<TItem>> {
        const sheetData = await super.getData(options);
        // Exclude any added during data preparation
        const features = Object.entries(this.item.toObject().system.items)
            .map(([key, ref]) => ({
                key,
                item: { ...ref, fromWorld: ref.uuid.startsWith("Item.") },
            }))
            .sort((a, b) => a.item.level - b.item.level);

        return {
            ...sheetData,
            features,
        };
    }

    protected getLocalizedAbilities(traits: { value: AttributeString[] }): { [key: string]: string } {
        if (traits !== undefined && traits.value) {
            if (traits.value.length === 6) return { free: game.i18n.localize("PF2E.AbilityFree") };
            return Object.fromEntries(traits.value.map((x: AttributeString) => [x, CONFIG.PF2E.abilities[x]]));
        }

        return {};
    }

    /** Is the dropped feat or feature valid for the given section? */
    #isValidDrop(event: ElementDragEvent, feat: FeatPF2e): boolean {
        const validCategories = (
            htmlClosest(event.target, "[data-valid-drops]")?.dataset.validDrops?.split(" ") ?? []
        ).filter((f): f is FeatOrFeatureCategory => setHasElement(FEAT_CATEGORIES, f));
        if (validCategories.includes(feat.category)) {
            return true;
        }

        const goodCategories = validCategories.map((c) => game.i18n.localize(CONFIG.PF2E.featCategories[c]));
        if (goodCategories.length > 0) {
            const badCategory = game.i18n.localize(CONFIG.PF2E.featCategories[feat.category]);
            const warning = game.i18n.format("PF2E.Item.ABC.InvalidDrop", {
                badType: badCategory,
                goodType: goodCategories[0],
            });
            ui.notifications.warn(warning);
            return false;
        }

        // No feat/feature type restriction value, so let it through
        return true;
    }

    protected override async _onDrop(event: ElementDragEvent): Promise<void> {
        event.preventDefault();
        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData = JSON.parse(dataString ?? "");
        const item = await ItemPF2e.fromDropData(dropData);

        if (!item?.isOfType("feat") || !this.#isValidDrop(event, item)) {
            return;
        }

        const entry: ABCFeatureEntryData = {
            uuid: item.uuid,
            img: item.img,
            name: item.name,
            level: item.level,
        };

        const items = this.item.system.items;
        const pathPrefix = "system.items";

        let id: string;
        do {
            id = randomID(5);
        } while (items[id]);

        await this.item.update({
            [`${pathPrefix}.${id}`]: entry,
        });
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const li of htmlQueryAll(html, "li[data-index]")) {
            const index = li.dataset.index;
            const itemUUID = li.dataset.itemUuid;
            if (!index) continue;

            if (itemUUID) {
                htmlQuery(li, "a.name")?.addEventListener("click", () =>
                    fromUuid(itemUUID).then((i) => i?.sheet.render(true)),
                );
            }

            htmlQuery(li, "[data-action=remove]")?.addEventListener("click", () => {
                this.item.update({ [`system.items.-=${index}`]: null });
            });
        }
    }
}

interface ABCSheetData<TItem extends ABCItem> extends ItemSheetDataPF2e<TItem> {
    features: { key: string; item: FeatureSheetData }[];
}

type ABCItem = AncestryPF2e | BackgroundPF2e | ClassPF2e;

interface FeatureSheetData extends ABCFeatureEntryData {
    fromWorld: boolean;
}

export { ABCSheetPF2e, type ABCSheetData };
