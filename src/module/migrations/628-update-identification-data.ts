import { MigrationBase } from './base';
import {
    IdentificationStatus,
    isPhysicalItem,
    ItemDataPF2e,
    IdentificationData,
    UnidentifiedData,
} from '@item/data-definitions';

type IdentifiedData =
    | UnidentifiedData
    | {
          name?: string;
          img?: string;
          data?: {
              description: {
                  value: string;
              };
          };
      };
type MaybeOldData = ItemDataPF2e & {
    data: ItemDataPF2e['data'] & {
        identified?: unknown;
        identification: Partial<IdentificationData> & {
            status: IdentificationStatus;
            identified?: IdentifiedData;
            unidentified?: IdentifiedData;
        };
    };
    'data.-=identified'?: unknown;
};

export class Migration628UpdateIdentificationData extends MigrationBase {
    static version = 0.628;

    private get defaultData(): IdentificationData {
        return JSON.parse(
            JSON.stringify({
                status: 'identified',
                unidentified: {
                    name: '',
                    img: '',
                    description: '',
                },
                misidentified: {},
            }),
        );
    }

    async updateItem(itemData: MaybeOldData): Promise<void> {
        if (!isPhysicalItem(itemData)) return;

        // items are frequently missing this property for some reason
        itemData.data.traits.rarity ??= { value: 'common' };

        const systemData = itemData.data;
        const hasBadData = systemData.identification && systemData.identification.status === undefined;
        if (!systemData.identification || hasBadData) {
            systemData.identification = this.defaultData;
        }

        // Fill any gaps in identification data
        const mystifyData = systemData.identification;
        mystifyData.status ??= 'identified';
        mystifyData.unidentified ??= this.defaultData.unidentified;
        mystifyData.misidentified ??= this.defaultData.misidentified;

        const identifiedData: IdentifiedData = mystifyData?.identified ?? {};

        if (mystifyData.status === 'identified') {
            systemData.identification = this.defaultData;
        } else if (mystifyData.status === 'unidentified') {
            if (typeof mystifyData.identified?.name === 'string') {
                itemData.name = mystifyData.identified.name;
            }

            if ('data' in identifiedData && typeof identifiedData.data?.description.value === 'string') {
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
