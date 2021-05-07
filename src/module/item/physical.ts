import { LocalizePF2e } from '@module/system/localize';
import { ItemPF2e } from './base';
import {
    MystifiedData,
    IdentificationStatus,
    PhysicalItemData,
    Rarity,
    isMagicItemData,
    TraitChatData,
} from './data/types';
import { MystifiedTraits } from './data/values';
import { getUnidentifiedPlaceholderImage } from './identification';

export abstract class PhysicalItemPF2e extends ItemPF2e {
    get level(): number {
        return this.data.data.level.value;
    }

    /** @override */
    get traits(): Set<string> {
        const traits: string[] = this.data.data.traits.value;
        return new Set(traits.concat(this.rarity));
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
        return (
            this.actor?.type === 'character' &&
            this.isEquipped &&
            this.isIdentified &&
            isMagicItemData(this.data) &&
            this.data.data.invested.value === true
        );
    }

    get isCursed(): boolean {
        return this.traits.has('cursed');
    }

    get isInContainer(): boolean {
        return !!this.data.data.containerId.value;
    }

    /** @override */
    prepareData(): void {
        const identificationData = this.data.data.identification;
        const mystifyDataMissing =
            !identificationData || !identificationData.status || !identificationData.unidentified;
        const isOldTalisman =
            this.data.type === 'consumable' && String(this.data.data.consumableType.value) === 'talasman';
        if (mystifyDataMissing || isOldTalisman) {
            return super.prepareData();
        }

        super.prepareData();

        // Disable active effects if the item isn't equipped and (if applicable) invested
        if (!this.isEquipped || this.isInvested === false) {
            for (const effectData of this.data.effects) {
                effectData.disabled = true;
            }
        }

        // Update properties according to identification status
        const identifyStatus = this.identificationStatus;
        const mystifiedData = this.getMystifiedData(identifyStatus);
        if (identifyStatus !== 'identified') {
            this.data.data.identification[identifyStatus] = mystifiedData;
            mergeObject(this.data, mystifiedData, { inplace: true, insertKeys: false });
        }

        this.setPredicates();
    }

    /** Set predicates from getters for later access when only the data is available */
    protected setPredicates() {
        this.data.isPhysical = true;
        this.data.isEquipped = this.isEquipped;
        this.data.isInvested = this.isInvested;
        this.data.isIdentified = this.isIdentified;
        this.data.isMagical = this.isMagical;
        this.data.isAlchemical = this.isAlchemical;
        this.data.isCursed = this.isCursed;
    }

    /** Can the provided item stack with this item? */
    isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.type !== item.type || this.name != item.name || this.isIdentified != item.isIdentified) return false;
        const thisData = duplicate(this._data.data);
        const otherData = duplicate(item._data.data);
        thisData.quantity.value = otherData.quantity.value;
        thisData.equipped.value = otherData.equipped.value;
        thisData.containerId.value = otherData.containerId.value;
        thisData.identification = otherData.identification;

        return JSON.stringify(thisData) === JSON.stringify(otherData);
    }

    /* Retrieve subtitution data for an unidentified or misidentified item, generating defaults as necessary */
    getMystifiedData(status: IdentificationStatus): MystifiedData {
        if (status === 'identified' || status === 'misidentified') {
            return this._data;
        }

        const mystifiedData = this.data.data.identification[status];

        const name = mystifiedData.name || this.generateUnidentifiedName();
        const img = mystifiedData.img || getUnidentifiedPlaceholderImage(this.data);

        const description = (() => {
            const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedDescription;
            const itemType = this.generateUnidentifiedName({ typeOnly: true });
            const caseCorrect = (noun: string) => (game.i18n.lang.toLowerCase() === 'de' ? noun : noun.toLowerCase());
            const fallbackDescription = game.i18n.format(formatString, { item: caseCorrect(itemType) });
            return mystifiedData.data.description.value || fallbackDescription;
        })();

        return {
            name,
            img,
            data: {
                description: {
                    value: description,
                },
            },
        };
    }

    async setIdentificationStatus(status: IdentificationStatus): Promise<void> {
        if (this.identificationStatus === status) return;

        await this.update({
            'data.identification.status': status,
            'data.identification.unidentified': this.getMystifiedData('unidentified'),
        });
    }

    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const itemType = game.i18n.localize(`ITEM.Type${this.data.type.capitalize()}`);
        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }

    /**
     * Include mystification-related rendering instructions for views that will display this data.
     * @override
     */
    protected traitChatData(dictionary: Record<string, string>): TraitChatData[] {
        const traitData = super.traitChatData(dictionary);
        for (const trait of traitData) {
            trait.mystified = !this.data.isIdentified && MystifiedTraits.has(trait.value);
            trait.excluded = trait.mystified && !game.user.isGM;
            if (trait.excluded) {
                delete trait.description;
            } else if (trait.mystified) {
                const gmNote = LocalizePF2e.translations.PF2E.identification.TraitGMNote;
                trait.description = trait.description
                    ? `${gmNote}\n\n${game.i18n.localize(trait.description)}`
                    : gmNote;
            }
        }

        return traitData;
    }
}

export interface PhysicalItemPF2e {
    data: PhysicalItemData;
    _data: PhysicalItemData;
}
