import { ActorPF2e } from '@actor/base';

class ChatDamageButtonsPF2e extends Application {
    init() {
        Hooks.on('renderChatMessage', (message, html, _data) => {
            const damageRoll: any = message.getFlag(game.system.id, 'damageRoll');
            if (damageRoll || !message.isRoll || message.roll?.dice[0]?.faces === 20) return;

            function makeButton(key: string, icon: string, className: string) {
                const btnStyling = 'width: 22px; height:22px; font-size:10px; line-height:1px; padding-left: 5px;';
                const title = game.i18n.localize(key);
                return $(
                    `<button class="${className}" style="${btnStyling}" title="${title}"><i class="fas ${icon}"></i></button>`,
                );
            }

            const fullDamageButton = makeButton('PF2E.DamageButton.Full', 'fa-user-minus', 'dice-total-fullDamage-btn');
            const halfDamageButton = makeButton(
                'PF2E.DamageButton.Half',
                'fa-user-shield',
                'dice-total-halfDamage-btn',
            );
            const doubleDamageButton = makeButton(
                'PF2E.DamageButton.Double',
                'fa-user-injured',
                'dice-total-doubleDamage-btn',
            );

            // need to rework to a shield raised status, instead of using a GM global CONFIG
            const shieldButton = makeButton('PF2E.DamageButton.ShieldBlock', 'fa-shield-alt', 'dice-total-shield-btn');
            const fullHealingButton = makeButton(
                'PF2E.DamageButton.Healing',
                'fa-user-plus',
                'dice-total-fullHealing-btn',
            );

            const btnContainer1 = $(
                `<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>`,
            );
            const btnContainer2 = $(
                `<span class="dmgBtn-container" style="position:absolute; top:0; right:0; bottom:1px;"></span>`,
            );
            btnContainer1.append(fullDamageButton);
            btnContainer1.append(halfDamageButton);
            btnContainer1.append(doubleDamageButton);
            btnContainer2.append(shieldButton);
            btnContainer2.append(fullHealingButton);

            html.find('.dice-total').wrapInner('<span id="value"></span>').append(btnContainer1);
            html.find('.dice-formula').append(btnContainer2);

            // Handle button clicks
            fullDamageButton.click((ev) => {
                ev.stopPropagation();
                let attribute = 'attributes.hp';
                if (CONFIG.PF2E.chatDamageButtonShieldToggle) {
                    attribute = 'attributes.shield';
                    html.find('.dice-total-shield-btn').toggleClass('shield-activated');
                    CONFIG.PF2E.chatDamageButtonShieldToggle = false;
                }
                if (ev.shiftKey) {
                    ChatDamageButtonsPF2e.shiftModifyDamage(html, 1, attribute);
                } else {
                    ActorPF2e.applyDamage(html, 1, attribute);
                }
            });

            halfDamageButton.click((ev) => {
                ev.stopPropagation();
                let attribute = 'attributes.hp';
                if (CONFIG.PF2E.chatDamageButtonShieldToggle) {
                    attribute = 'attributes.shield';
                    html.find('.dice-total-shield-btn').toggleClass('shield-activated');
                    CONFIG.PF2E.chatDamageButtonShieldToggle = false;
                }
                if (ev.shiftKey) {
                    ChatDamageButtonsPF2e.shiftModifyDamage(html, 0.5, attribute);
                } else {
                    ActorPF2e.applyDamage(html, 0.5, attribute);
                }
            });

            doubleDamageButton.click((ev) => {
                ev.stopPropagation();
                let attribute = 'attributes.hp';
                if (CONFIG.PF2E.chatDamageButtonShieldToggle) {
                    attribute = 'attributes.shield';
                    html.find('.dice-total-shield-btn').toggleClass('shield-activated');
                    CONFIG.PF2E.chatDamageButtonShieldToggle = false;
                }
                if (ev.shiftKey) {
                    ChatDamageButtonsPF2e.shiftModifyDamage(html, 2, attribute);
                } else {
                    ActorPF2e.applyDamage(html, 2, attribute);
                }
            });

            shieldButton.click((ev) => {
                ev.stopPropagation();
                html.find('.dice-total-shield-btn').toggleClass('shield-activated');
                CONFIG.PF2E.chatDamageButtonShieldToggle = !CONFIG.PF2E.chatDamageButtonShieldToggle;
            });

            fullHealingButton.click((ev) => {
                ev.stopPropagation();
                if (ev.shiftKey) {
                    ChatDamageButtonsPF2e.shiftModifyDamage(html, -1);
                } else {
                    ActorPF2e.applyDamage(html, -1);
                }
            });
        });

        Hooks.on('renderChatMessage', (message, html, _data) => {
            const damageRoll: any = message.getFlag(game.system.id, 'damageRoll');
            if (!damageRoll) return;

            function makeButton(key: string, icon: string, className = '') {
                const classStr = className ? `class=${className}` : '';
                const title = game.i18n.localize(key);
                return $(
                    `<button style="flex: 1 1 0;" ${classStr} title="${title}"><i class="fas ${icon}"></i></button>`,
                );
            }

            const full = makeButton('PF2E.DamageButton.Full', 'fa-user-minus');
            const double = makeButton('PF2E.DamageButton.Double', 'fa-user-injured');
            const half = makeButton('PF2E.DamageButton.Half', 'fa-user-shield');
            const shield = makeButton('PF2E.DamageButton.ShieldBlock', 'fa-shield-alt', 'dice-total-shield-btn');
            const heal = makeButton('PF2E.DamageButton.Healing', 'fa-user-plus');

            const buttons = $(`<div style="display: flex; margin-top: 3px;"></div>`);
            buttons.append(full, half, double, shield, heal);
            html.append(buttons);

            // Handle button clicks
            full.on('click', (event) => {
                event.stopPropagation();
                let attribute = 'attributes.hp';
                if (CONFIG.PF2E.chatDamageButtonShieldToggle) {
                    attribute = 'attributes.shield';
                    shield.toggleClass('shield-activated');
                    CONFIG.PF2E.chatDamageButtonShieldToggle = false;
                }
                if (event.shiftKey) {
                    ChatDamageButtonsPF2e.shiftModifyDamage(html, 1, attribute);
                } else {
                    ActorPF2e.applyDamage(html, 1, attribute);
                }
            });

            half.on('click', (event) => {
                event.stopPropagation();
                let attribute = 'attributes.hp';
                if (CONFIG.PF2E.chatDamageButtonShieldToggle) {
                    attribute = 'attributes.shield';
                    shield.toggleClass('shield-activated');
                    CONFIG.PF2E.chatDamageButtonShieldToggle = false;
                }
                if (event.shiftKey) {
                    ChatDamageButtonsPF2e.shiftModifyDamage(html, 0.5, attribute);
                } else {
                    ActorPF2e.applyDamage(html, 0.5, attribute);
                }
            });

            double.on('click', (event) => {
                event.stopPropagation();
                let attribute = 'attributes.hp';
                if (CONFIG.PF2E.chatDamageButtonShieldToggle) {
                    attribute = 'attributes.shield';
                    shield.toggleClass('shield-activated');
                    CONFIG.PF2E.chatDamageButtonShieldToggle = false;
                }
                if (event.shiftKey) {
                    ChatDamageButtonsPF2e.shiftModifyDamage(html, 2, attribute);
                } else {
                    ActorPF2e.applyDamage(html, 2, attribute);
                }
            });

            shield.on('click', (event) => {
                event.stopPropagation();
                shield.toggleClass('shield-activated');
                CONFIG.PF2E.chatDamageButtonShieldToggle = !CONFIG.PF2E.chatDamageButtonShieldToggle;
            });

            heal.on('click', (event) => {
                event.stopPropagation();
                if (event.shiftKey) {
                    ChatDamageButtonsPF2e.shiftModifyDamage(html, -1);
                } else {
                    ActorPF2e.applyDamage(html, -1);
                }
            });
        });
    }

    static shiftModifyDamage(html, multiplier, attributePassed = 'attributes.hp') {
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

const chatButtons = new ChatDamageButtonsPF2e();
chatButtons.init();
