import { ItemSourcePF2e } from "@item/data";
import { WeaponSystemSource } from "@item/weapon/data";
import { DamageDiceParameters } from "@module/modifiers";
import { RuleElementSource } from "@module/rules/rules-data-definitions";
import { DamageDieSize } from "@system/damage/damage";
import { MigrationBase } from "../base";

/** Remove the `property1` property from weapon system data  */
export class Migration685RemoveProperty1 extends MigrationBase {
    static override version = 0.685;

    /** If present, convert the item's custom damage to rule elements */
    private toRuleElements(property1: Property1): RuleElementSource[] {
        const damageDiceREs: RuleElementSource[] = [];
        const dice = [
            { ...property1, critical: false },
            {
                value: property1.value,
                damageType: property1.critDamageType,
                dice: property1.critDice,
                die: property1.critDie,
                critical: true,
            },
        ];
        for (const damage of dice) {
            if (!(damage.die && damage.dice && damage.damageType)) continue;
            const ruleSource: RuleElementSource & Partial<DamageDiceParameters> = {
                key: "DamageDice",
                label: damage.value || "PF2E.RuleElement.DamageDice",
                damageType: damage.damageType,
                diceNumber: damage.dice,
                dieSize: damage.die,
                selector: "{item|_id}-damage",
                critical: damage.critical,
            };
            damageDiceREs.push(ruleSource);
        }

        return damageDiceREs;
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "weapon") return;

        const systemData: MaybeWithProperty1 = itemSource.data;
        if (systemData.property1) {
            const property1 = systemData.property1;
            systemData.rules.push(...this.toRuleElements(property1));

            systemData["-=property1"] = null;
            if (!("game" in globalThis)) delete systemData.property1;
        }
    }
}

interface MaybeWithProperty1 extends WeaponSystemSource {
    property1?: Property1;
    "-=property1"?: null;
}

interface Property1 {
    value: string;
    dice: number;
    die: DamageDieSize;
    damageType: string;
    critDice: number;
    critDie: DamageDieSize;
    critDamage: string;
    critDamageType: string;
}
