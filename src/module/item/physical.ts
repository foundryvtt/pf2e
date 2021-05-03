import { LocalizePF2e } from '@module/system/localize';
import { ItemPF2e } from './base';
import { UnidentifiedData, IdentificationStatus, PhysicalItemData, Rarity } from './data/types';
import { getUnidentifiedPlaceholderImage } from './identification';

export abstract class PhysicalItemPF2e extends ItemPF2e {
    /** @override */
    get traits(): Set<string> {
        return new Set(this.data.data.traits.value.concat(this.rarity));
    }

    get rarity(): Rarity {
        return this.data.data.traits.rarity.value;
    }

    get quantity(): number {
        return this.data.data.quantity.value ?? 1;
    }

    get isEquipped(): boolean {
        return this.data.data.equipped.value;
    }

    get identificationStatus(): IdentificationStatus {
        return this.data.data.identification.status;
    }

    get isIdentified(): boolean {
        return this.identificationStatus === 'identified';
    }

    get isMagical(): boolean {
        const traits = this.traits;
        return ['magical', 'arcane', 'primal', 'divine', 'occult'].some((trait) => traits.has(trait));
    }

    get isAlchemical(): boolean {
        return this.traits.has('alchemical');
    }

    get isInvested(): boolean | null {
        if (!this.traits.has('invested')) return null;
        return this.isIdentified && 'invested' in this.data.data && this.data.data.invested.value === true;
    }

    get isInContainer(): boolean {
        return !!this.data.data.containerId.value;
    }

    /** @override */
    prepareData(): void {
        /** Prevent unhandled exceptions on pre-migrated data */
        this.data.data.traits.rarity ??= { value: 'common' };
        const hasBadData = this.data.data.identification && this.data.data.identification.status === undefined;
        if (!this.data.data.identification || hasBadData) {
            return super.prepareData();
        }

        super.prepareData();
        // Disable active effects if the item isn't equipped and (if applicable) invested
        if (!this.isEquipped || this.isInvested === false) {
            for (const effectData of this.data.effects) {
                effectData.disabled = true;
            }
        }

        this.data.isEquipped = this.isEquipped;
        this.data.isInvested = this.isInvested;
        this.data.isIdentified = this.isIdentified;
        this.data.realName = this._data.name;
        this.data.realImg = this._data.img;
        this.data.realDescription = this._data.data.description.value;

        // Set name, image, and description according to identification status
        const identifyData = this.getIdentificationData(this.identificationStatus);
        this.data.name = identifyData.name;
        this.data.img = identifyData.img;
        this.data.data.description.value = identifyData.description;
    }

    /** Can the provided item stack with this item? */
    isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.type !== item.type || this.name != item.name) return false;
        const thisData = duplicate(this._data.data);
        const otherData = duplicate(item._data.data);
        thisData.quantity.value = otherData.quantity.value;
        thisData.containerId.value = otherData.containerId.value;
        return JSON.stringify(thisData) === JSON.stringify(otherData);
    }

    /* Retrieve subtitution data for an unidentified or misidentified item, generating defaults as necessary */
    getIdentificationData(status: IdentificationStatus): UnidentifiedData {
        if (status === 'identified' || status === 'misidentified') return this;

        const identificationData = this.data.data.identification[status];

        const name = identificationData.name || this.generateUnidentifiedName();
        const img = identificationData.img || getUnidentifiedPlaceholderImage(this.data);

        const description = (() => {
            const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedDescription;
            const itemType = this.generateUnidentifiedName({ typeOnly: true });
            const caseCorrect = (noun: string) => (game.i18n.lang.toLowerCase() === 'de' ? noun : noun.toLowerCase());
            const fallbackDescription = game.i18n.format(formatString, { item: caseCorrect(itemType) });
            return identificationData.description || fallbackDescription;
        })();

        return { name, img, description };
    }

    async setIdentificationStatus(status: IdentificationStatus): Promise<void> {
        if (this.identificationStatus === status) return;

        const identifyData = this.getIdentificationData(status);
        const identifyDataUpdate = status === 'identified' ? {} : { [`data.identification.${status}`]: identifyData };

        await this.update({
            _id: this.id,
            'data.identification.status': status,
            ...identifyDataUpdate,
        });
    }

    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const itemType = game.i18n.localize(`ITEM.Type${this.data.type.capitalize()}`);
        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }
}

export interface PhysicalItemPF2e {
    data: PhysicalItemData;
    _data: PhysicalItemData;

    level?: number;
}
