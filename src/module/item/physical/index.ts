import { PhysicalItemData, TraitChatData } from '@item/data';
import { LocalizePF2e } from '@module/system/localize';
import { Rarity } from '@module/data';
import { ItemPF2e } from '@item/index';
import type { ContainerPF2e } from '@item/index';
import { MystifiedTraits } from '@item/data/values';
import { getUnidentifiedPlaceholderImage } from '../identification';
import { IdentificationStatus, MystifiedData } from './data';

export abstract class PhysicalItemPF2e extends ItemPF2e {
    // The cached container of this item, if in a container, or null
    private _container: Embedded<ContainerPF2e> | null = null;

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
        return this.data.isEquipped;
    }

    get identificationStatus(): IdentificationStatus {
        return this.data.data.identification.status;
    }

    get isIdentified(): boolean {
        return this.data.isIdentified;
    }

    get isAlchemical(): boolean {
        return this.data.isAlchemical;
    }

    get isMagical(): boolean {
        const traits = this.traits;
        return ['magical', 'arcane', 'primal', 'divine', 'occult'].some((trait) => traits.has(trait));
    }

    get isInvested(): boolean | null {
        const traits: string[] = this.data.data.traits.value;
        if (!traits.includes('invested')) return null;
        return this.data.isEquipped && this.data.isIdentified && this.data.data.invested?.value === true;
    }

    get isCursed(): boolean {
        return this.data.isCursed;
    }

    get isInContainer(): boolean {
        return !!this.container;
    }

    /** Get this item's container, returning null if it is not in a container */
    get container(): Embedded<ContainerPF2e> | null {
        if (this.data.data.containerId.value === null) return (this._container = null);

        const container = this._container ?? this.actor?.items.get(this.data.data.containerId.value ?? '');
        if (container?.type === 'backpack') this._container = container as Embedded<ContainerPF2e>;

        return this._container;
    }

    /** @override */
    prepareBaseData(): void {
        super.prepareBaseData();

        // Clear empty-string containerId values
        this.data.data.containerId.value ||= null;

        this.data.isEquipped = this.data.data.equipped.value;
        this.data.isIdentified = this.data.data.identification.status === 'identified';

        const traits: string[] = this.data.data.traits.value;
        this.data.isAlchemical = traits.includes('alchemical');
        this.data.isCursed = traits.includes('cursed');

        // Magic and invested status is determined at the class-instance level since it can be updated later in data
        // preparation
        this.data.isMagical = this.isMagical;
        this.data.isInvested = this.isInvested;

        // Update properties according to identification status
        const { data } = this;

        const mystifiedData = this.getMystifiedData(this.identificationStatus);
        mergeObject(data, mystifiedData, { insertKeys: false, insertValues: false });

        // Fill gaps in unidentified data with defaults
        data.data.identification.unidentified = this.getMystifiedData('unidentified');

        // Set the _container cache property to null if it no longer matches this item's container ID
        if (this._container?.id !== this.data.data.containerId.value) {
            this._container = null;
        }
    }

    /** @override */
    prepareDerivedData(): void {
        super.prepareDerivedData();
        this.data.isMagical = this.isMagical;
    }

    /** Can the provided item stack with this item? */
    isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.type !== item.type || this.name != item.name || this.isIdentified != item.isIdentified) return false;
        const thisData = this.toObject().data;
        const otherData = item.toObject().data;
        thisData.quantity.value = otherData.quantity.value;
        thisData.equipped.value = otherData.equipped.value;
        thisData.containerId.value = otherData.containerId.value;
        thisData.identification = otherData.identification;

        return JSON.stringify(thisData) === JSON.stringify(otherData);
    }

    /* Retrieve subtitution data for an unidentified or misidentified item, generating defaults as necessary */
    getMystifiedData(status: IdentificationStatus): MystifiedData {
        const mystifiedData: MystifiedData =
            status === 'identified' || status === 'misidentified'
                ? this.data._source
                : this.data.data.identification[status];

        const name = mystifiedData.name || this.generateUnidentifiedName();
        const img = mystifiedData.img || getUnidentifiedPlaceholderImage(this.data);

        const description =
            mystifiedData.data.description.value ||
            (() => {
                if (status === 'identified') return this.description;

                const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedDescription;
                const itemType = this.generateUnidentifiedName({ typeOnly: true });
                const caseCorrect = (noun: string) =>
                    game.i18n.lang.toLowerCase() === 'de' ? noun : noun.toLowerCase();
                return game.i18n.format(formatString, { item: caseCorrect(itemType) });
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
            trait.mystified = !this.isIdentified && MystifiedTraits.has(trait.value);
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
    readonly data: PhysicalItemData;
}
