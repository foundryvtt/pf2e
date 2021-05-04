import { MigrationBase } from './base';
import {
    IdentificationStatus,
    isPhysicalItem,
    ItemDataPF2e,
    IdentificationData,
    IdentifiedData,
} from '@item/data/types';

type MaybeOldData = ItemDataPF2e & {
    data: ItemDataPF2e['data'] & {
        identified?: unknown;
        identification: Partial<IdentificationData> & {
            status?: IdentificationStatus;
            identified?: IdentifiedData;
            unidentified?: IdentifiedData;
        };
    };
    'data.-=identified'?: unknown;
    'data.identification.unidentified.-=description'?: unknown;
};

export class Migration628UpdateIdentificationData extends MigrationBase {
    static version = 0.628;

    private get defaultData(): IdentificationData {
        const data: IdentificationData = {
            status: 'identified',
            unidentified: {
                name: '',
                img: '',
                data: {
                    description: {
                        value: '',
                    },
                    traits: {
                        value: [],
                    },
                },
            },
            misidentified: {},
        };
        return JSON.parse(JSON.stringify(data));
    }

    async updateItem(itemData: MaybeOldData): Promise<void> {
        if (!isPhysicalItem(itemData)) return;

        // Items are occasionally lack a `rarity` property due to missing a previous migration
        itemData.data.traits.rarity ??= { value: 'common' };

        const systemData = itemData.data;
        const hasBadData = systemData.identification && systemData.identification.status === undefined;
        if (!systemData.identification || hasBadData) {
            systemData.identification = this.defaultData;
        }

        // Fill any gaps in identification data
        const mystifyData = systemData.identification;
        mystifyData.status ||= 'identified';
        mystifyData.unidentified ||= this.defaultData.unidentified;
        mystifyData.misidentified ||= this.defaultData.misidentified;

        // For pre-release refactor of mystified data structure
        if (mystifyData.unidentified && 'description' in mystifyData.unidentified) {
            mystifyData.unidentified = this.defaultData.unidentified;
            if ('game' in globalThis) {
                itemData['data.identification.unidentified.-=description'] = null;
            }
        }

        const identifiedData: IdentifiedData = mystifyData.identified ?? {};

        if (mystifyData.status === 'identified') {
            systemData.identification = this.defaultData;
        } else if (mystifyData.status === 'unidentified') {
            if (typeof mystifyData.identified?.name === 'string') {
                itemData.name = mystifyData.identified.name;
            }

            if (identifiedData && identifiedData.data && typeof identifiedData.data.description?.value === 'string') {
                systemData.description.value = identifiedData.data?.description.value;
            }
        }

        // Remove old properties
        delete systemData['identified'];
        if ('game' in globalThis && 'identified' in systemData) {
            itemData['data.-=identified'] = null;
        }
    }
}
