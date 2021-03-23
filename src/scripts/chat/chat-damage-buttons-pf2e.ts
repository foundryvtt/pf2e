import { ActorPF2e } from '@actor/base';

class ChatDamageButtonsPF2e {
    /**
     * Adds apply damage buttons to a chat message.
     * @param message message to attach the buttons to
     * @param html html of the message to attach the buttons to
     */
    static attach(message: ChatMessage, html: JQuery<HTMLElement>) {
        const damageRoll: any = message.getFlag(game.system.id, 'damageRoll');
        const isRoll = damageRoll || message.isRoll;
        const isD20 = message.roll && message.roll.dice[0]?.faces === 20;
        if (!isRoll || isD20) return;

        function makeButton(key: string, icon: string, className = '') {
            const classStr = className ? `class=${className}` : '';
            const title = game.i18n.localize(key);
            return $(`<button ${classStr} title="${title}"><i class="fas ${icon}"></i></button>`);
        }

        const full = makeButton('PF2E.DamageButton.Full', 'fa-user-minus');
        const double = makeButton('PF2E.DamageButton.Double', 'fa-user-injured');
        const half = makeButton('PF2E.DamageButton.Half', 'fa-user-shield');
        const shield = makeButton('PF2E.DamageButton.ShieldBlock', 'fa-shield-alt', 'dice-total-shield-btn');
        const heal = makeButton('PF2E.DamageButton.Healing', 'fa-user-plus');

        if (damageRoll) {
            // Buttons at the bottom of the damage prompt
            const buttons = $(`<div class="chat-damage-buttons"></div>`);
            buttons.append(full, half, double, shield, heal);
            html.append(buttons);
        } else {
            // Overlay damage buttons
            const btnContainer1 = $(`<span class="chat-damage-buttons-overlay"></span>`);
            const btnContainer2 = $(`<span class="chat-damage-buttons-overlay"></span>`);
            btnContainer1.append(shield, heal);
            btnContainer2.append(full, half, double);
            html.find('.dice-formula').append(btnContainer1);
            html.find('.dice-total').wrapInner('<span id="value"></span>').append(btnContainer2);
        }

        // Handle button clicks
        full.on('click', (event) => {
            event.stopPropagation();
            ChatDamageButtonsPF2e.applyDamage(html, 1, event.shiftKey);
        });

        half.on('click', (event) => {
            event.stopPropagation();
            ChatDamageButtonsPF2e.applyDamage(html, 0.5, event.shiftKey);
        });

        double.on('click', (event) => {
            event.stopPropagation();
            ChatDamageButtonsPF2e.applyDamage(html, 2, event.shiftKey);
        });

        shield.on('click', (event) => {
            event.stopPropagation();
            shield.toggleClass('shield-activated');
            CONFIG.PF2E.chatDamageButtonShieldToggle = !CONFIG.PF2E.chatDamageButtonShieldToggle;
        });

        heal.on('click', (event) => {
            event.stopPropagation();
            ChatDamageButtonsPF2e.applyDamage(html, -1, event.shiftKey);
        });
    }

    static applyDamage(html: JQuery<HTMLElement>, multiplier: number, promptModifier = false) {
        let attribute = 'attributes.hp';
        if (CONFIG.PF2E.chatDamageButtonShieldToggle && multiplier > 0) {
            attribute = 'attributes.shield';
            html.find('.dice-total-shield-btn').toggleClass('shield-activated');
            CONFIG.PF2E.chatDamageButtonShieldToggle = false;
        }
        if (promptModifier) {
            ChatDamageButtonsPF2e.shiftModifyDamage(html, multiplier, attribute);
        } else {
            ActorPF2e.applyDamage(html, multiplier, attribute);
        }
    }

    static shiftModifyDamage(html: JQuery<HTMLElement>, multiplier: number, attributePassed = 'attributes.hp') {
        new Dialog({
            title: game.i18n.localize('PF2E.UI.shiftModifyDamageTitle'),
            content: `<form>
                    <div class="form-group">
                        <label>${game.i18n.localize('PF2E.UI.shiftModifyDamageLabel')}</label>
                        <input type="number" name="modifier" value="" placeholder="0">
                    </div>
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
                        // const diceTotal = parseFloat(html.find('.dice-total #value').text());
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
}

// Add apply damage cards after a chat message is rendered
Hooks.on('renderChatMessage', (message, html, _data) => {
    ChatDamageButtonsPF2e.attach(message, html);
});
