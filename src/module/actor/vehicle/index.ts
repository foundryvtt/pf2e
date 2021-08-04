import { ItemPF2e } from "@item/base";
import { ItemSourcePF2e } from "@item/data";
import { ActiveEffectPF2e } from "@module/active-effect";
import { ActorPF2e } from "../base";
import { VehicleData } from "./data";

export class VehiclePF2e extends ActorPF2e {
    static override get schema(): typeof VehicleData {
        return VehicleData;
    }

    override async createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        for (const datum of data) {
            if (!("type" in datum)) continue;
            if (
                !["weapon", "armor", "equipment", "consumable", "treasure", "backpack", "kit", "action"].includes(
                    datum.type ?? ""
                )
            ) {
                ui.notifications.error(game.i18n.localize("PF2E.vehicle.ItemTypeError"));
                return [];
            }
        }

        return super.createEmbeddedDocuments(embeddedName, data, context);
    }
}

export interface VehiclePF2e {
    readonly data: VehicleData;

    createEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        data: PreCreate<foundry.data.ActiveEffectSource>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "Item",
        data: PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ItemPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
}
