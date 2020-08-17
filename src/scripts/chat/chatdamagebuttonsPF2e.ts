/* global Application, Dialog */
import PF2EActor from "../../module/actor/actor";

class ChatDamageButtonsPF2e extends Application {
  init() {
    Hooks.on('renderChatMessage', (message, html, data) => {
      if (!message.isRoll || message.roll.parts[0].faces === 20) return;

      const btnStyling = 'width: 22px; height:22px; font-size:10px;line-height:1px';

      const fullDamageButton = $(`<button class="dice-total-fullDamage-btn" style="${btnStyling}"><i class="fas fa-bahai" title="Click to apply full damage to selected token(s)."></i></button>`);
      const halfDamageButton = $(`<button class="dice-total-halfDamage-btn" style="${btnStyling}"><i class="fas fa-chevron-down" title="Click to apply half damage to selected token(s)."></i></button>`);
      const doubleDamageButton = $(`<button class="dice-total-doubleDamage-btn" style="${btnStyling}"><i class="fas fa-angle-double-up" title="Click to apply double damage to selected token(s)."></i></button>`);
      // need to rework to a shield raised status, instead of using a GM global CONFIG
      const shieldButton = $(`<button class="dice-total-shield-btn" style="${btnStyling}"><i class="fas fa-shield-alt" title="Click to toggle the shield block status of the selected token(s)."></i></button>`);
	    const fullHealingButton = $(`<button class="dice-total-fullHealing-btn" style="${btnStyling}"><i class="fas fa-heart" title="Click to apply full healing to selected token(s)."></i></button>`);

      const btnContainer1 = $(`<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>`);
      const btnContainer2 = $(`<span class="dmgBtn-container" style="position:absolute; top:0; right:0; bottom:1px;"></span>`);
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
          ChatDamageButtonsPF2e.shiftModifyDamage(html, 1, attribute)
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
          ChatDamageButtonsPF2e.shiftModifyDamage(html, 0.5, attribute)
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
          ChatDamageButtonsPF2e.shiftModifyDamage(html, 2, attribute)
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
          ChatDamageButtonsPF2e.shiftModifyDamage(html, -1)
        } else {
          PF2EActor.applyDamage(html, -1);
        }
      });
    });
  }

  static shiftModifyDamage(html, multiplier, attributePassed='attributes.hp') {
    new Dialog({
      title: game.i18n.localize("PF2E.UI.shiftModifyDamageTitle"),
      content: `<form>
                    <div class="form-group">
                        <label>${game.i18n.localize("PF2E.UI.shiftModifyDamageLabel")}</label>
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
          callback: async (dialogHtml : JQuery) => {
            // const diceTotal = parseFloat(html.find('.dice-total #value').text());
            let modifier = parseFloat(<string>dialogHtml.find('[name="modifier"]').val());
            if (Number.isNaN(modifier)) {
              modifier = 0;
            }
            if (modifier !== undefined) {
              await PF2EActor.applyDamage(html, multiplier, attributePassed, modifier);
            }
          }
        }
      },
      default: 'ok',
      close: () => { }
    }).render(true);
  }

}

const chatButtons = new ChatDamageButtonsPF2e();
chatButtons.init();