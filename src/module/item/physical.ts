/* global game */

import { PF2EItem } from './item';
import { PhysicalItemData } from './dataDefinitions';

export class PF2EPhysicalItem extends PF2EItem {
    /** @override */
    data!: PhysicalItemData;

    get isIdentified(): boolean {
        return this.data.data.identified.value;
    }

    async setIsIdentified(value: boolean): Promise<this> {
        if (value === this.isIdentified) {
            return this;
        }

        if (value === false) {
            return this.update({
                _id: this.id,
                'data.identified.value': false,
                'data.originalName': this.name,
                name: game.i18n.localize('PF2E.identification.UnidentifiedItem'),
            });
        }

        return this.update({
            _id: this.id,
            'data.identified.value': true,
            name: this.data.data.originalName ?? this.name,
        });
    }
}
