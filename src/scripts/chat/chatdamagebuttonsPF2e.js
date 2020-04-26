class ChatDamageButtonsPF2e extends Application {
  constructor(app) {
    super(app);
  }

  init() {
    Hooks.on('renderChatMessage', (message, html, data) => {
      if (!message.isRoll || message.roll.parts[0].faces == 20) return;
      const btnStyling = 'width: 22px; height:22px; font-size:10px;line-height:1px';
      const fullDamageButton = $(`<button class="dice-total-fullDamage-btn" style="${btnStyling}"><i class="fas fa-bahai" title="Click to apply full damage to selected token(s)."></i></button>`);
      const halfDamageButton = $(`<button class="dice-total-halfDamage-btn" style="${btnStyling}"><i class="fas fa-chevron-down" title="Click to apply half damage to selected token(s)."></i></button>`);
      const doubleDamageButton = $(`<button class="dice-total-doubleDamage-btn" style="${btnStyling}"><i class="fas fa-angle-double-up" title="Click to apply double damage to selected token(s)."></i></button>`); // need to rework to a shield raised status, instead of using a GM global CONFIG

      const shieldButton = $(`<button class="dice-total-shield-btn" style="${btnStyling}"><i class="fas fa-shield-alt" title="Click to toggle the shield block status of the selected token(s)."></i></button>`);
      const fullHealingButton = $(`<button class="dice-total-fullHealing-btn" style="${btnStyling}"><i class="fas fa-heart" title="Click to apply full healing to selected token(s)."></i></button>`);
      const btnContainer1 = $(`<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>`);
      const btnContainer2 = $(`<span class="dmgBtn-container" style="position:absolute; top:0; right:0; bottom:1px;"></span>`);
      btnContainer1.append(fullDamageButton);
      btnContainer1.append(halfDamageButton);
      btnContainer1.append(doubleDamageButton);
      btnContainer2.append(shieldButton);
      btnContainer2.append(fullHealingButton);
      html.find('.dice-total').append(btnContainer1);
      html.find('.dice-formula').append(btnContainer2); // Handle button clicks

      fullDamageButton.click(ev => {
        ev.stopPropagation();

        if (CONFIG.PF2E.chatDamageButtonShieldToggle) {
          CONFIG.Actor.entityClass.applyDamage(html, 1, 'attributes.shield');
          html.find('.dice-total-shield-btn').toggleClass('shield-activated');
          CONFIG.PF2E.chatDamageButtonShieldToggle = false;
        } else {
          CONFIG.Actor.entityClass.applyDamage(html, 1);
        }
      });
      halfDamageButton.click(ev => {
        ev.stopPropagation();

        if (CONFIG.PF2E.chatDamageButtonShieldToggle) {
          CONFIG.Actor.entityClass.applyDamage(html, 0.5, 'attributes.shield');
          html.find('.dice-total-shield-btn').toggleClass('shield-activated');
          CONFIG.PF2E.chatDamageButtonShieldToggle = false;
        } else {
          CONFIG.Actor.entityClass.applyDamage(html, 0.5);
        }
      });
      doubleDamageButton.click(ev => {
        ev.stopPropagation();

        if (CONFIG.PF2E.chatDamageButtonShieldToggle) {
          CONFIG.Actor.entityClass.applyDamage(html, 2, 'attributes.shield');
          html.find('.dice-total-shield-btn').toggleClass('shield-activated');
          CONFIG.PF2E.chatDamageButtonShieldToggle = false;
        } else {
          CONFIG.Actor.entityClass.applyDamage(html, 2);
        }
      });
      shieldButton.click(ev => {
        ev.stopPropagation();
        html.find('.dice-total-shield-btn').toggleClass('shield-activated');
        CONFIG.PF2E.chatDamageButtonShieldToggle = CONFIG.PF2E.chatDamageButtonShieldToggle ? false : true;
      });
      fullHealingButton.click(ev => {
        ev.stopPropagation();
        CONFIG.Actor.entityClass.applyDamage(html, -1);
      });
    });
  }

}

const chatButtons = new ChatDamageButtonsPF2e();
chatButtons.init();