import { ItemDataPF2e } from '@item/data/types';
import { ActorPF2e } from './base';
import { VehicleData } from './data-definitions';

export class VehiclePF2e extends ActorPF2e {
    async createEmbeddedDocuments<I extends ItemDataPF2e>(
        embeddedName: string,
        data: I,
        options?: EntityCreateOptions,
    ): Promise<I | null>;
    async createEmbeddedDocuments<I extends ItemDataPF2e>(
        embeddedName: string,
        data: I[],
        options?: EntityCreateOptions,
    ): Promise<I | I[] | null>;
    async createEmbeddedDocuments<I extends ItemDataPF2e>(
        embeddedName: string,
        data: I | I[],
        options: EntityCreateOptions = {},
    ): Promise<I | I[] | null> {
        const createData = Array.isArray(data) ? data : [data];
        for (const datum of createData) {
            if (
                !['weapon', 'armor', 'equipment', 'consumable', 'treasure', 'backpack', 'kit', 'action'].includes(
                    datum.type,
                )
            ) {
                ui.notifications.error(game.i18n.localize('PF2E.vehicle.ItemTypeError'));
                return null;
            }
        }

        return super.createEmbeddedDocuments(embeddedName, createData, options);
    }
}

export interface VehiclePF2e {
    data: VehicleData;
}
