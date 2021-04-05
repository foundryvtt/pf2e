import { ErrorPF2e } from '@module/utils';
import { LocalizePF2e } from '../../module/system/localize';
import { ActionDefaultOptions } from '../..//module/system/actions/actions';

export function steelYourResolve(options: ActionDefaultOptions): void {
    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const token = actors[0];
    const toChat = (alias: string, content: string) => {
        ChatMessage.create({
            user: game.user.id,
            content,
            speaker: { alias },
        });
    };

    const translations = LocalizePF2e.translations.PF2E.Actions.SteelYourResolve;

    const title = translations.Title;
    const content = translations.Content;

    if (!game.settings.get('pf2e', 'staminaVariant')) {
        throw ErrorPF2e(translations.StaminaNotEnabled);
        return;
    }

    Dialog.confirm({
        title: title,
        content: content,
        yes: () => {
            const { resolve, sp } = token.data.data.attributes;
            const spRatio = `${sp.value}/${sp.max}`;
            const recoverStamina = game.i18n.format(translations.RecoverStamina, {
                name: token.name,
                ratio: spRatio,
            });
            const noStamina = game.i18n.format(translations.NoStamina, { name: token.name });
            if (resolve.value > 0) {
                toChat(token.name, recoverStamina);
                const newSP = sp.value + Math.floor(sp.max / 2);
                token.update({
                    'data.attributes.sp.value': Math.min(newSP, sp.max),
                    'data.attributes.resolve.value': resolve.value - 1,
                });
            } else {
                toChat(token.name, noStamina);
            }
        },
        defaultYes: true,
    });
}
