import { ActorPF2e } from '@actor/base';
import { LocalizePF2e } from '@module/system/localize';

/** Add apply damage buttons after a chat message is rendered */
export async function listen(message: ChatMessage<ActorPF2e>, html: JQuery): Promise<void> {
    const damageRoll = message.getFlag('pf2e', 'damageRoll');
    const fromRollTable = message.getFlag('core', 'RollTable') !== undefined;
    const isRoll = damageRoll || message.isRoll;
    const isD20 = (isRoll && message.roll && message.roll.dice[0]?.faces === 20) || false;
    if (!isRoll || isD20 || fromRollTable) return;

    const $buttons = $(
        await renderTemplate('systems/pf2e/templates/chat/damage/buttons.html', {
            showTripleDamage: game.settings.get('pf2e', 'critFumbleButtons'),
        }),
    );
    html.append($buttons);

    const full = html.find('button.full-damage');
    const half = html.find('button.half-damage');
    const double = html.find('button.double-damage');
    const triple = html.find('button.triple-damage');
    const heal = html.find('button.heal-damage');
    const contentSelector = `li.chat-message[data-message-id="${message.id}"] div.hover-content`;
    const $shield = html
        .find('button.shield-block')
        .attr({ 'data-tooltip-content': contentSelector })
        .tooltipster({
            animation: 'fade',
            trigger: 'click',
            arrow: false,
            contentAsHTML: true,
            debug: BUILD_MODE === 'development',
            interactive: true,
            side: ['top'],
            theme: 'crb-hover',
        });
    $shield.tooltipster('disable');
    html.find('button.shield-block').attr({ title: LocalizePF2e.translations.PF2E.DamageButton.ShieldBlock });
    // Handle button clicks
    full.on('click', (event) => {
        applyDamage(html, 1, event.shiftKey);
    });

    half.on('click', (event) => {
        applyDamage(html, 0.5, event.shiftKey);
    });

    double.on('click', (event) => {
        applyDamage(html, 2, event.shiftKey);
    });

    triple?.on('click', (event) => {
        applyDamage(html, 3, event.shiftKey);
    });

    $shield.on('click', async (event) => {
        const tokens = canvas.tokens.controlled.filter((token) => token.actor);
        if (tokens.length === 0) {
            const errorMsg = LocalizePF2e.translations.PF2E.UI.errorTargetToken;
            ui.notifications.error(errorMsg);
            event.stopPropagation();
            return;
        }

        // If the actor is wielding more than one shield, have the user pick which shield to block for blocking.
        const actor = tokens[0].actor!;
        const heldShields = actor.itemTypes.armor.filter((armor) => armor.isEquipped && armor.isShield);
        const nonBrokenShields = heldShields.filter((shield) => !shield.isBroken);
        const multipleShields = tokens.length === 1 && nonBrokenShields.length > 1;
        const shieldActivated = $shield.hasClass('shield-activated');

        if (multipleShields && !shieldActivated) {
            $shield.tooltipster('enable');
            // Populate the list with the shield options
            const $list = $buttons.find('ul.shield-options');
            $list.children('li').remove();

            const $template = $list.children('template');
            for (const shield of nonBrokenShields) {
                const $listItem = $($template.html());
                $listItem.children('input.data').val(shield.id);
                $listItem.children('span.label').text(shield.name);
                const hardnessLabel = LocalizePF2e.translations.PF2E.ShieldHardnessLabel;
                $listItem.children('span.tag').text(`${hardnessLabel}: ${shield.hardness}`);

                $list.append($listItem);
            }
            $list.find('li input').on('change', (event) => {
                const $input = $(event.currentTarget);
                $shield.attr({ 'data-shield-id': $input.val() });
                $shield.tooltipster('close').tooltipster('disable');
                $shield.addClass('shield-activated');
                CONFIG.PF2E.chatDamageButtonShieldToggle = true;
            });
            $shield.tooltipster('open');
            return;
        } else {
            $shield.tooltipster('disable');
            $shield.removeAttr('data-shield-id');
            event.stopPropagation();
        }

        $shield.toggleClass('shield-activated');
        CONFIG.PF2E.chatDamageButtonShieldToggle = !CONFIG.PF2E.chatDamageButtonShieldToggle;
    });

    heal.on('click', (event) => {
        applyDamage(html, -1, event.shiftKey);
    });
}

function applyDamage(html: JQuery<HTMLElement>, multiplier: number, promptModifier = false) {
    let attribute = 'attributes.hp';
    const $button = html.find('button.shield-block');
    if (CONFIG.PF2E.chatDamageButtonShieldToggle && multiplier > 0) {
        attribute = 'attributes.shield';
        $button.removeClass('shield-activated');
        CONFIG.PF2E.chatDamageButtonShieldToggle = false;
    }
    const shieldID = $button.attr('data-shield-id') ?? undefined;

    if (promptModifier) {
        shiftModifyDamage(html, multiplier, attribute);
    } else {
        ActorPF2e.applyDamage(html, multiplier, attribute, 0, { shieldID: shieldID });
    }
}

function shiftModifyDamage(html: JQuery<HTMLElement>, multiplier: number, attributePassed = 'attributes.hp') {
    new Dialog({
        title: game.i18n.localize('PF2E.UI.shiftModifyDamageTitle'),
        content: `<form>
                <div class="form-group">
                    <label>${game.i18n.localize('PF2E.UI.shiftModifyDamageLabel')}</label>
                    <input type="number" name="modifier" value="" placeholder="0">
                </div>
                <p style="line-height:160%">${game.i18n.localize('PF2E.UI.shiftModifyDamageHint')}</p>
                </form>
                <script type="text/javascript">
                $(function () {
                    $(".form-group input").focus();
                });
                </script>`,
        buttons: {
            ok: {
                label: 'Ok',
                callback: async (dialogHtml: JQuery) => {
                    let modifier = parseFloat(<string>dialogHtml.find('[name="modifier"]').val());
                    if (Number.isNaN(modifier)) {
                        modifier = 0;
                    }
                    if (modifier !== undefined) {
                        await ActorPF2e.applyDamage(html, multiplier, attributePassed, modifier);
                    }
                },
            },
        },
        default: 'ok',
        close: () => {},
    }).render(true);
}
