import { ApplyDamageData, PF2EActor } from '@actor/actor';

export class DamageModifiersPopup extends FormApplication<ApplyDamageData> {
    static get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;

        options.id = 'DamageModifiersPopup';
        options.title = game.i18n.localize('PF2E.UI.shiftModifyDamage.title');
        options.template = 'systems/pf2e/templates/popups/damage/damage-modifiers-popup.hbs';

        return options;
    }

    async _updateObject(event, attributes) {
        this.object.modifier = attributes.modifier || 0;
        await PF2EActor.applyDamage(this.object);
    }
}
