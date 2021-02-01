import { PF2EActor } from '../../module/actor/actor';

class ChatDamageButtonsPF2e extends Application {
    init() {
        Hooks.on('renderChatMessage', (message, html, data) => {
            const damageRoll: any = message.getFlag(game.system.id, 'damageRoll');
            if (damageRoll || !message.isRoll || message.roll?.dice[0]?.faces === 20) return;

            const btnStyling = 'width: 22px; height:22px; font-size:10px; line-height:1px; padding-left: 5px;';

            const fullDamageButton = $(
                `<button class="dice-total-fullDamage-btn" style="${btnStyling}"><i class="fas fa-user-minus" title="Click to apply full damage to selected token(s)."></i></button>`,
            );
            const halfDamageButton = $(
                `<button class="dice-total-halfDamage-btn" style="${btnStyling}"><i class="fas fa-user-shield" title="Click to apply half damage to selected token(s)."></i></button>`,
            );
            const doubleDamageButton = $(
                `<button class="dice-total-doubleDamage-btn" style="${btnStyling}"><i class="fas fa-user-injured" title="Click to apply double damage to selected token(s)."></i></button>`,
            );
            // need to rework to a shield raised status, instead of using a GM global CONFIG
            const shieldButton = $(
                `<button class="dice-total-shield-btn" style="${btnStyling}"><i class="fas fa-shield-alt" title="Click to toggle the shield block status of the selected token(s)."></i></button>`,
            );
            const fullHealingButton = $(
                `<button class="dice-total-fullHealing-btn" style="${btnStyling}"><i class="fas fa-user-plus" title="Click to apply full healing to selected token(s)."></i></button>`,
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
                    PF2EActor.applyDamage(html, 1, attribute);
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
                    PF2EActor.applyDamage(html, 0.5, attribute);
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
                    PF2EActor.applyDamage(html, 2, attribute);
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
                    PF2EActor.applyDamage(html, -1);
                }
            });
        });

        Hooks.on('renderChatMessage', (message, html, data) => {
            const damageRoll: any = message.getFlag(game.system.id, 'damageRoll');
            if (!damageRoll) return;

            const full = $(
                `<button style="flex: 1 1 0;" title="Apply full damage to selected tokens."><i class="fas fa-user-minus"></i></button>`,
            );
            const double = $(
                `<button style="flex: 1 1 0;" title="Apply double damage to selected tokens."><i class="fas fa-user-injured"></i></button>`,
            );
            const half = $(
                `<button style="flex: 1 1 0;" title="Apply half damage to selected tokens."><i class="fas fa-user-shield"></i></button>`,
            );
            const shield = $(
                `<button class="dice-total-shield-btn" style="flex: 1 1 0;" title="Toggle the shield block status of the selected tokens."><i class="fas fa-shield-alt"></i></button>`,
            );
            const heal = $(
                `<button style="flex: 1 1 0;" title="Apply full healing to selected tokens."><i class="fas fa-user-plus"></i></button>`,
            );

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
                    PF2EActor.applyDamage(html, 1, attribute);
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
                    PF2EActor.applyDamage(html, 0.5, attribute);
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
                    PF2EActor.applyDamage(html, 2, attribute);
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
                    PF2EActor.applyDamage(html, -1);
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
                            await PF2EActor.applyDamage(html, multiplier, attributePassed, modifier);
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
