import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { ItemPF2e, type EquipmentPF2e, type PhysicalItemPF2e, type WeaponPF2e } from "@item";
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { SpellSlotGroupId } from "@item/spellcasting-entry/collection.ts";
import { coerceToSpellGroupId, getSpellRankLabel } from "@item/spellcasting-entry/helpers.ts";
import { SheetOptions, createSheetTags, getAdjustment } from "@module/sheet/helpers.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, localizer, tupleHasValue } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import type { ItemActivation, StaffSpellData } from "./data.ts";
import { detachSubitem } from "./helpers.ts";
import { CoinsPF2e, MaterialValuationData } from "./index.ts";
import { PRECIOUS_MATERIAL_GRADES } from "./values.ts";

class PhysicalItemSheetPF2e<TItem extends PhysicalItemPF2e> extends ItemSheetPF2e<TItem> {
    static override get defaultOptions(): ItemSheetOptions {
        const options = super.defaultOptions;
        options.classes.push("physical");
        options.dragDrop ??= [];
        options.dragDrop.push({ dropSelector: ".staff-spells" });
        options.hasSidebar = true;
        return options;
    }

    /** Show the identified data for editing purposes */
    override async getData(options?: Partial<ItemSheetOptions>): Promise<PhysicalItemSheetData<TItem>> {
        const sheetData = await super.getData(options);
        const { item } = this;

        const bulkAdjustment = getAdjustment(item.system.bulk.value, item._source.system.bulk.value, {
            better: "lower",
        });
        const basePrice = new CoinsPF2e(item._source.system.price.value);
        const priceAdjustment = getAdjustment(item.system.price.value.copperValue, basePrice.copperValue);

        const { actionTraits } = CONFIG.PF2E;

        // Enrich content
        const rollData = { ...item.getRollData(), ...this.actor?.getRollData() };
        sheetData.enrichedContent.unidentifiedDescription = await TextEditor.enrichHTML(
            sheetData.item.system.identification.unidentified.data.description.value,
            { rollData },
        );
        const activations: PhysicalItemSheetData<TItem>["activations"] = [];
        for (const action of item.activations) {
            const description = await TextEditor.enrichHTML(action.description.value, { rollData });
            activations.push({
                action,
                id: action.id,
                base: `system.activations.${action.id}`,
                description,
                traits: createSheetTags(actionTraits, action.traits ?? { value: [] }),
            });
        }

        const adjustedLevelHint = ((): string | null => {
            const hintText = ABP.isEnabled(this.actor)
                ? "PF2E.Item.Weapon.FromABP"
                : "PF2E.Item.Weapon.FromMaterialAndRunes";
            const levelLabel =
                game.i18n.lang === "de"
                    ? game.i18n.localize("PF2E.LevelLabel")
                    : game.i18n.localize("PF2E.LevelLabel").toLocaleLowerCase(game.i18n.lang);
            return item.level !== item._source.system.level.value
                ? game.i18n.format(hintText, {
                      property: levelLabel,
                      value: item.level,
                  })
                : null;
        })();

        const adjustedPriceHint = (() => {
            if (!priceAdjustment) return null;
            const baseData = item._source;
            const basePrice = new CoinsPF2e(baseData.system.price.value).scale(baseData.system.quantity).copperValue;
            const derivedPrice = item.assetValue.copperValue;
            const priceLabel =
                game.i18n.lang === "de"
                    ? game.i18n.localize("PF2E.PriceLabel")
                    : game.i18n.localize("PF2E.PriceLabel").toLocaleLowerCase(game.i18n.lang);
            return basePrice !== derivedPrice
                ? game.i18n.format(game.i18n.localize("PF2E.Item.Weapon.FromMaterialAndRunes"), {
                      property: priceLabel,
                      value: item.price.value.toString(),
                  })
                : null;
        })();

        const localizeBulk = localizer("PF2E.Item.Physical.Bulk");
        const bulks = [0, 0.1, ...Array.fromRange(50, 1)].map((value) => {
            if (value === 0) return { value, label: localizeBulk("Negligible.Label") };
            if (value === 0.1) return { value, label: localizeBulk("Light.Label") };
            return { value, label: value.toString() };
        });

        return {
            ...sheetData,
            itemType: game.i18n.localize("PF2E.ItemTitle"),
            sidebarTemplate: "systems/pf2e/templates/items/physical-sidebar.hbs",
            bulkAdjustment,
            adjustedLevelHint,
            basePrice,
            priceAdjustment,
            adjustedPriceHint,
            attributes: CONFIG.PF2E.abilities,
            actionTypes: CONFIG.PF2E.actionTypes,
            bulks,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            frequencies: CONFIG.PF2E.frequencies,
            sizes: R.omit(CONFIG.PF2E.actorSizes, ["sm"]),
            usages: CONFIG.PF2E.usages,
            usageOptions: [
                { label: "0", value: "worngloves" },
                { label: "1", value: "held-in-one-hand" },
                { label: "1+", value: "held-in-one-plus-hands" },
                { label: "2", value: "held-in-two-hands" },
            ],
            identificationStatusOptions: [
                { label: "PF2E.identification.Identified", value: "identified" },
                { label: "PF2E.identification.Unidentified", value: "unidentified" },
            ],
            isApex: tupleHasValue(item._source.system.traits.value, "apex"),
            isPhysical: true,
            activations,
            // Do not let user set bulk if in a stack group because the group determines bulk
            bulkDisabled: !!sheetData.data?.stackGroup?.trim(),
        };
    }

    /** If the item is unidentified, prevent players from opening this sheet. */
    override render(force?: boolean, options?: RenderOptions): this {
        if (!this.item.isIdentified && !game.user.isGM) {
            ui.notifications.warn(this.item.description);
            return this;
        }

        return super.render(force, options);
    }

    protected getMaterialSheetData(item: PhysicalItemPF2e, valuationData: MaterialValuationData): MaterialSheetData {
        const preciousMaterials: Record<string, string> = CONFIG.PF2E.preciousMaterials;
        const isSpecificMagicItem = item.isSpecific;
        const materials: MaterialSheetEntry[] = [
            { value: JSON.stringify({ type: null, grade: null }), label: "", group: "" }, // Initial empty value
        ];
        for (const [materialKey, materialData] of Object.entries(valuationData)) {
            const validGrades = [...PRECIOUS_MATERIAL_GRADES].filter(
                (grade) => !!materialData[grade] && (!isSpecificMagicItem || item.system.material.type === materialKey),
            );
            if (validGrades.length) {
                const group = game.i18n.localize(preciousMaterials[materialKey]);
                for (const grade of validGrades) {
                    const gradeLabel = game.i18n.localize(CONFIG.PF2E.preciousMaterialGrades[grade]);
                    const label = game.i18n.format("PF2E.Item.Weapon.MaterialAndRunes.MaterialOption", {
                        type: group,
                        grade: gradeLabel,
                    });
                    materials.push({
                        value: JSON.stringify({ type: materialKey, grade: grade }),
                        label,
                        group,
                    });
                }
            }
        }
        materials.sort((a, b) => a.group.localeCompare(b.group, game.i18n.lang));

        const value = JSON.stringify(R.pick(this.item.material, ["type", "grade"]));
        return { value, materials };
    }

    protected async prepareStaffSpells(item: WeaponPF2e | EquipmentPF2e): Promise<StaffSheetData | null> {
        const staff = item.system.staff;
        if (!staff) return null;

        const items = await UUIDUtils.fromUUIDs(R.unique(staff.spells.map((s) => s.uuid)));
        const itemsByUuid = R.mapToObj(items, (i) => [i.uuid, i]);

        const allSpellGroups: SpellSlotGroupId[] = ["cantrips", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const effectText = staff.effect || game.i18n.localize("PF2E.Item.Weapon.Staff.DefaultEffect");

        return {
            effect: `<strong>${game.i18n.localize("PF2E.Item.Activation.Effect")}</strong> ${effectText}`,
            spells: allSpellGroups.map((rank) => ({
                rank,
                label: getSpellRankLabel(rank),
                spells:
                    staff.spells
                        .filter((s) => s.rank === rank)
                        .map((data) => {
                            const spell = itemsByUuid[data.uuid];
                            return {
                                img: spell?.img ?? data.img,
                                name: spell?.name ?? data.name,
                                uuid: data.uuid,
                                rank,
                                fromWorld: data.uuid.startsWith("Item."),
                                linked: !!spell,
                            };
                        }) ?? [],
            })),
        };
    }

    /**
     * Clean up staff data completely if this sheet was closed.
     * Doing it here instead of _preUpdate() allows a window of recovery of accidental deletion.
     */
    override close(options?: { force?: boolean | undefined }): Promise<void> {
        if (!this.item.system.traits.value.includes("staff") && "staff" in this.item._source.system) {
            this.item.update({ "system.staff": null });
        }

        return super.close(options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Subitem management
        htmlQuery(html, "ul[data-subitems]")?.addEventListener("click", async (event) => {
            const anchor = htmlClosest(event.target, "a[data-action]");
            if (!anchor) return;

            const item = this.item;
            const subitemId = htmlClosest(anchor, "[data-subitem-id]")?.dataset.subitemId;
            const subitem = item.subitems.get(subitemId, { strict: true });

            switch (anchor.dataset.action) {
                case "edit-subitem":
                    return subitem.sheet.render(true);
                case "detach-subitem":
                    return detachSubitem(subitem, event.ctrlKey);
                case "delete-subitem": {
                    return event.ctrlKey ? subitem.delete() : subitem.deleteDialog();
                }
                default:
                    throw ErrorPF2e("Unexpected control options");
            }
        });

        const item = this.item;
        if (item.isOfType("weapon", "equipment")) {
            const staffSpellRemoves = htmlQueryAll(html, "[data-action=remove-staff-spell]");
            for (const element of staffSpellRemoves) {
                const uuid = htmlClosest(element, "[data-uuid]")?.dataset.uuid;
                const rank = coerceToSpellGroupId(htmlClosest(element, "[data-rank]")?.dataset.rank);
                element.addEventListener("click", () => {
                    const spells = item.system.staff?.spells.filter((s) => !(s.uuid === uuid && s.rank === rank));
                    if (spells) {
                        item.update({ system: { staff: { spells } } });
                    }
                });
            }
        }
    }

    protected override async _onDrop(event: DragEvent): Promise<void> {
        if (!this.isEditable) return;

        const item = await (async (): Promise<ItemPF2e | null> => {
            try {
                const dataString = event.dataTransfer?.getData("text/plain");
                const dropData = JSON.parse(dataString ?? "");
                return (await ItemPF2e.fromDropData(dropData)) ?? null;
            } catch {
                return null;
            }
        })();

        // Handle dragging an item to a staff
        const staffSpellsElement = htmlClosest(event.target, ".staff-spells");
        if (staffSpellsElement && item?.isOfType("spell") && this.item.isOfType("weapon", "equipment")) {
            const savedSpells = this.item._source.system.staff?.spells ?? [];
            const rank = item.isCantrip ? "cantrips" : coerceToSpellGroupId(staffSpellsElement.dataset.rank);
            if (savedSpells.some((s) => s.uuid === item.uuid && s.rank === rank)) {
                ui.notifications.warn("Spell already exists at this rank");
                return;
            } else if (typeof rank === "number" && rank < item.baseRank) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.Item.Spell.Warning.InvalidRank", {
                        spell: item.name,
                        spellRank: getSpellRankLabel(item.baseRank),
                        targetRank: getSpellRankLabel(rank),
                    }),
                );
                return;
            }

            if (rank !== null) {
                const spells: StaffSpellData[] = R.sortBy(
                    [...savedSpells, { img: item.img, name: item.name, rank, uuid: item.uuid }],
                    (s) => (s.rank === "cantrips" ? 0 : s.rank),
                );
                await this.item.update({ system: { staff: { spells } } });
            }

            return;
        }

        super._onDrop(event);
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Process precious-material selection
        const [materialType, materialGrade] = [formData["system.material.type"], formData["system.material.grade"]];
        const typeIsValid =
            materialType === undefined ||
            (typeof materialType === "string" && materialType in CONFIG.PF2E.preciousMaterials);
        const gradeIsValid =
            materialGrade === undefined ||
            (typeof materialGrade === "string" && materialGrade in CONFIG.PF2E.preciousMaterialGrades);
        if (!typeIsValid || !gradeIsValid) {
            formData["system.material.type"] = null;
            formData["system.material.grade"] = null;
        }

        if (formData["system.baseItem"] === "") {
            formData["system.baseItem"] = null;
        }

        // If the saved staff effect text only has a single paragraph, remove the paragraph html elements
        const effect = formData["system.staff.effect"];
        if (effect && typeof effect === "string") {
            const hasOneParagraph = effect.match(/<p>/)?.length === 1;
            if (hasOneParagraph) {
                formData["system.staff.effect"] = effect.replace(/^<p>(.*)<\/p>$/, "$1");
            }
        }

        // Convert price from a string to an actual object
        if ("system.price.value" in formData) {
            formData["system.price.value"] = CoinsPF2e.fromString(String(formData["system.price.value"]));
        }

        return super._updateObject(event, formData);
    }
}

interface PhysicalItemSheetData<TItem extends PhysicalItemPF2e> extends ItemSheetDataPF2e<TItem> {
    sidebarTemplate: string;
    isApex: boolean;
    isPhysical: true;
    bulkAdjustment: string | null;
    adjustedBulkHint?: string | null;
    adjustedLevelHint: string | null;
    basePrice: CoinsPF2e;
    priceAdjustment: string | null;
    adjustedPriceHint: string | null;
    attributes: typeof CONFIG.PF2E.abilities;
    actionTypes: typeof CONFIG.PF2E.actionTypes;
    actionsNumber: typeof CONFIG.PF2E.actionsNumber;
    bulks: { value: number; label: string }[];
    frequencies: typeof CONFIG.PF2E.frequencies;
    sizes: Omit<typeof CONFIG.PF2E.actorSizes, "sm">;
    usages: typeof CONFIG.PF2E.usages;
    usageOptions: FormSelectOption[];
    identificationStatusOptions: FormSelectOption[];
    bulkDisabled: boolean;
    activations: {
        action: ItemActivation;
        id: string;
        base: string;
        description: string;
        traits: SheetOptions;
    }[];
}

interface MaterialSheetEntry {
    value: string;
    label: string;
    group: string;
}

interface MaterialSheetData {
    value: string;
    materials: MaterialSheetEntry[];
}

interface StaffSheetData {
    effect: string;
    spells: StaffSpellRankSheetData[];
}

interface StaffSpellRankSheetData {
    rank: SpellSlotGroupId;
    label: string;
    spells: SpellBrief[];
}

interface SpellBrief {
    uuid: ItemUUID;
    rank: SpellSlotGroupId;
    name: string;
    img: ImageFilePath;
    fromWorld: boolean;
    linked: boolean;
}

export { PhysicalItemSheetPF2e };
export type { MaterialSheetData, MaterialSheetEntry, PhysicalItemSheetData, StaffSheetData };
