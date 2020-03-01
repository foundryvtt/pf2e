class ChatDamageButtonsPF2e extends Application {
  constructor(app) {
    super(app);
  }

  init() {
    Hooks.on('renderChatMessage', (message, html, data) => {
      if (!message.isRoll || message.roll.parts[0].faces == 20) return;

      const btnStyling = 'width: 22px; height:22px; font-size:10px;line-height:1px';

      const fullDamageButton = $(`<button class="dice-total-fullDamage-btn" style="${btnStyling}"><i class="fas fa-user-minus" title="Click to apply full damage to selected token(s)."></i></button>`);
      const halfDamageButton = $(`<button class="dice-total-halfDamage-btn" style="${btnStyling}"><i class="fas fa-user-shield" title="Click to apply half damage to selected token(s)."></i></button>`);
      const doubleDamageButton = $(`<button class="dice-total-doubleDamage-btn" style="${btnStyling}"><i class="fas fa-user-injured" title="Click to apply double damage to selected token(s)."></i></button>`);
      const fullHealingButton = $(`<button class="dice-total-fullHealing-btn" style="${btnStyling}"><i class="fas fa-user-plus" title="Click to apply full healing to selected token(s)."></i></button>`);

      const btnContainer = $('<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>');
      btnContainer.append(fullDamageButton);
      btnContainer.append(halfDamageButton);
      btnContainer.append(doubleDamageButton);
      btnContainer.append(fullHealingButton);

      html.find('.dice-total').append(btnContainer);

      // Handle button clicks
      fullDamageButton.click((ev) => {
        ev.stopPropagation();
        CONFIG.Actor.entityClass.applyDamage(html, 1);
      });

      halfDamageButton.click((ev) => {
        ev.stopPropagation();
        CONFIG.Actor.entityClass.applyDamage(html, 0.5);
      });

      doubleDamageButton.click((ev) => {
        ev.stopPropagation();
        CONFIG.Actor.entityClass.applyDamage(html, 2);
      });

      fullHealingButton.click((ev) => {
        ev.stopPropagation();
        CONFIG.Actor.entityClass.applyDamage(html, -1);
      });
    });
  }
}

const chatButtons = new ChatDamageButtonsPF2e();
chatButtons.init();
