import { ArmorSource, ItemSourcePF2e } from "@item/data/index.ts";
import { ZeroToFour } from "@module/data.ts";
import { MigrationBase } from "../base.ts";

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
            const systemData: ArmorSystemSourceWithResilient = itemSource.system;

            if (this.towerShieldSlugs.includes(systemData.slug ?? "")) {
                itemSource.system.speed.value = -5;
            }

            systemData.armor.value = Number(systemData.armor.value) || 0;
            systemData.speed.value = Number(systemData.speed.value) || 0;
            const potencyRune: { value: ZeroToFour | null } = systemData.potencyRune;
            potencyRune.value = (Number(systemData.potencyRune.value) || 0) as ZeroToFour;
            if ("resilient" in systemData) {
                // Aborted attempt to store rune data?
                "game" in globalThis ? (systemData["-=resilient"] = null) : delete systemData.resilient;
            }
        }
    }
}

type ArmorSystemSourceWithResilient = ArmorSource["system"] & {
    resilient?: unknown;
    "-=resilient"?: null;
};
