import { identifyItem, IdentifyAlchemyDCs, IdentifyMagicDCs } from '@item/identification';
import { PhysicalItemPF2e } from '@item/physical';
import { tupleHasValue } from '@module/utils';

export class IdentifyItemPopup extends FormApplication<PhysicalItemPF2e> {
    static override get defaultOptions(): FormApplicationOptions {
        return {
            ...super.defaultOptions,
            id: 'identify-item',
            title: game.i18n.localize('PF2E.identification.Identify'),
            template: 'systems/pf2e/templates/actors/identify-item.html',
            width: 'auto',
            classes: ['identify-popup'],
        };
    }

    get item() {
        return this.object;
    }

    override getData() {
        const item = this.object;
        const notMatchingTraditionModifier = game.settings.get('pf2e', 'identifyMagicNotMatchingTraditionModifier');
        const proficiencyWithoutLevel = game.settings.get('pf2e', 'proficiencyVariant') === 'ProficiencyWithoutLevel';
        const dcs = identifyItem(item, {
            proficiencyWithoutLevel,
            notMatchingTraditionModifier,
        });
        return {
            ...super.getData(),
            isMagic: dcs instanceof IdentifyMagicDCs,
            isAlchemical: dcs instanceof IdentifyAlchemyDCs,
            dcs,
        };
    }

    override activateListeners($form: JQuery<HTMLFormElement>) {
        $form.find<HTMLButtonElement>('button.update-identification').on('click', (event) => {
            const $button = $(event.delegateTarget);
            this.submit({ updateData: { status: $button.val() } });
        });
    }

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const status = formData['status'];
        const newStatuses = ['identified', 'misidentified'] as const;
        if (typeof status === 'string' && tupleHasValue(newStatuses, status)) {
            await this.item.setIdentificationStatus(status);
        }
    }
}
