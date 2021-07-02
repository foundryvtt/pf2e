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
        //add listener on Post skill checks to chat button that posts item unidentified img and name and skill checks
        $form.find<HTMLButtonElement>('button.post-skill-checks').on('click', () => {
            const item = this.item;
            const itemImg = item.data.data.identification.unidentified.img;
            const itemName = item.data.data.identification.unidentified.name;
            const skillArray: object[] = [];
            $('tr').each(function () {
                const description = $(this).find('th').text();
                if (description) {
                    skillArray.push({
                        description: description,
                        skill: description.toLowerCase(),
                        DC: $(this).find('td').text(),
                    });
                }
            });
            renderTemplate('systems/pf2e/templates/actors/identify-item-chat-skill-checks.html', {
                itemImg,
                itemName,
                skillArray,
            }).then((template) => {
                ChatMessage.create({
                    user: game.user.id,
                    content: template,
                });
            });
        });
    }

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const status = formData['status'];
        const newStatuses = ['identified'] as const;
        if (typeof status === 'string' && tupleHasValue(newStatuses, status)) {
            await this.item.setIdentificationStatus(status);
        }
    }
}
