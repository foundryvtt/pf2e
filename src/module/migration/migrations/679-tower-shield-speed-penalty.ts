import { ArmorSource, ItemSourcePF2e } from "@item/data";
import { ZeroToFour } from "@module/data";
import { MigrationBase } from "../base";

/** Set a speed penalty of -5 on all tower shields, plus some basic tidying */
export class Migration679TowerShieldSpeedPenalty extends MigrationBase {
    static override version = 0.679;

    private towerShieldSlugs = [
        "darkwood-tower-shield-high-grade",
        "darkwood-tower-shield-standard-grade",
        "tower-shield",
    ];

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "armor") {
            const systemData: ArmorSystemSourceWithResilient = itemSource.data;

            if (this.towerShieldSlugs.includes(systemData.slug ?? "")) {
                itemSource.data.speed.value = -5;
            }

            systemData.armor.value = Number(systemData.armor.value) || 0;
            systemData.speed.value = Number(systemData.speed.value) || 0;
            systemData.potencyRune.value = (Number(systemData.potencyRune.value) || 0) as ZeroToFour;
            if ("resilient" in systemData) {
                // Aborted attempt to store rune data?
                "game" in globalThis ? (systemData["-=resilient"] = null) : delete systemData.resilient;
            }
        }
    }
}

type ArmorSystemSourceWithResilient = ArmorSource["data"] & {
    resilient?: unknown;
    "-=resilient"?: null;
};
