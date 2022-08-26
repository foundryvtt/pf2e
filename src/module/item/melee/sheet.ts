import { ItemSheetPF2e } from "@item/sheet/base";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers";
import { MeleePF2e } from ".";

export class MeleeSheetPF2e extends ItemSheetPF2e<MeleePF2e> {
    override async getData(): Promise<MeleeSheetData> {
        const item = this.item;
        const baseData = await super.getData();
        return {
            ...baseData,
            damageTypes: CONFIG.PF2E.damageTypes,
            attackEffects: createSheetOptions(this.getAttackEffectOptions(), item.system.attackEffects),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);

        // Add Damage Roll
        $html.find(".add-damage").on("click", (event) => {
            event.preventDefault();
            const newKey = randomID();
            const newDamageRoll = { damage: "", damageType: "" };
            this.item.update({
                [`system.damageRolls.${newKey}`]: newDamageRoll,
            });
        });

        // Remove Damage Roll
        $html.find(".delete-damage").on("click", (event) => {
            event.preventDefault();
            const targetKey = event.target.closest<HTMLElement>("[data-damage-part]")?.dataset.damagePart;
            if (targetKey) {
                this.item.update({ [`system.damageRolls.-=${targetKey}`]: null });
            }
        });
    }
}

interface MeleeSheetData extends ItemSheetDataPF2e<MeleePF2e> {
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"];
    attackEffects: SheetOptions;
}
