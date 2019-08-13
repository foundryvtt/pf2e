class DicePF2e {

  /**
   * A standardized helper function for managing core PF2e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
   *
   * @param {Event} event           The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Actor} actor           The Actor making the d20 roll
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} advantage     Allow rolling with advantage (and therefore also with disadvantage)
   * @param {Boolean} situational   Allow for an arbitrary situational bonus field
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static d20Roll({event, parts, data, template, title, speaker, flavor, advantage=true, situational=true,
                  fastForward=true, onClose, dialogOptions}) {

    // Inner roll function
    let rollMode = game.settings.get("core", "rollMode");
    let roll = () => {
      let flav = ( flavor instanceof Function ) ? flavor(parts, data) : title;
      if (adv === 1) {
        parts[0] = ["2d20kh"];
        flav = `${title} (Fortune)`;
      }
      else if (adv === -1) {
        parts[0] = ["2d20kl"];
        flav = `${title} (Misfortune)`;
      }

      // Don't include situational bonus unless it is defined
      if (!data.bonus && parts.indexOf("@bonus") !== -1) parts.pop();

      // Execute the roll and send it to chat
      let roll = new Roll(parts.join("+"), data).roll();
      roll.toMessage({
        speaker: speaker,
        flavor: flav,
        rollMode: rollMode
      });
    };

    // Modify the roll and handle fast-forwarding
    let adv = 0;
    parts = ["1d20"].concat(parts);
    if ( event.shiftKey ) return roll();
    else if ( event.altKey ) {
      adv = 1;
      return roll();
    }
    else if ( event.ctrlKey || event.metaKey ) {
      adv = -1;
      return roll();
    } else parts = parts.concat(["@bonus"]);

    // Render modal dialog
    template = template || "public/systems/pf2e/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.rollModes
    };
    renderTemplate(template, dialogData).then(dlg => {
      new Dialog({
          title: title,
          content: dlg,
          buttons: {
            advantage: {
              label: "Fortune",
              callback: () => adv = 1
            },
            normal: {
              label: "Normal",
            },
            disadvantage: {
              label: "Misfortune",
              callback: () => adv = -1
            }
          },
          default: "normal",
          close: html => {
            if ( onClose ) onClose(html, parts, data);
            rollMode = html.find('[name="rollMode"]').val();
            data['bonus'] = html.find('[name="bonus"]').val();
            roll()
          }
        }, dialogOptions).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
   *
   * @param {Event} event           The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Actor} actor           The Actor making the damage roll
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} critical      Allow critical hits to be chosen
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static damageRoll({event={}, parts, actor, data, template, title, speaker, flavor, critical=false, onClose, dialogOptions}) {

    // Inner roll function
    let rollMode = game.settings.get("core", "rollMode");
    let roll = () => {
      let roll = new Roll(parts.join("+"), data),
          flav = ( flavor instanceof Function ) ? flavor(parts, data) : title;
      /* if ( crit ) {
        let add = 0;
        let mult = 2;
        roll.alter(add, mult);
        flav = `${title} (Critical)`;
      } */

      // Execute the roll and send it to chat
      roll.toMessage({
        speaker: speaker,
        flavor: flav,
        rollMode: rollMode
      });

      // Return the Roll object
      return roll;
    };

    // Modify the roll and handle fast-forwarding
    let crit = 0;
    if ( event.shiftKey || event.ctrlKey || event.metaKey )  return roll();
    else if ( event.altKey ) {
      crit = 1;
      return roll();
    }
    else parts = parts.concat(["@bonus"]);

    // Construct dialog data
    template = template || "public/systems/pf2e/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.rollModes
    };

    // Render modal dialog
    return new Promise(resolve => {
      renderTemplate(template, dialogData).then(dlg => {
        new Dialog({
          title: title,
          content: dlg,
          buttons: {
            critical: {
              condition: critical,
              label: "Critical Hit",
              callback: () => crit = 1
            },
            normal: {
              label: critical ? "Normal" : "Roll",
            },
          },
          default: "normal",
          close: html => {
            if (onClose) onClose(html, parts, data);
            rollMode = html.find('[name="rollMode"]').val();
            data['bonus'] = html.find('[name="bonus"]').val();
            resolve(roll());
          }
        }, dialogOptions).render(true);
      });
    });
  }


  alter(add, multiply) {
    let rgx = new RegExp(Roll.diceRgx, 'g');
    if ( this._rolled ) throw new Error("You may not alter a Roll which has already been rolled");

    // Update dice roll terms
    this.terms = this.terms.map(t => {
      return t.replace(rgx, (match, nd, d, mods) => {
        nd = (nd * (multiply || 1)) + (add || 0);
        mods = mods || "";
        return nd + "d" + d + mods;
      })
    });

    // Update the formula
    this._formula = this.terms.join(" ");
    return this;
  }

}

/**
 * Highlight critical success or failure on d20 rolls
 */
Hooks.on("renderChatMessage", (message, data, html) => {
  if ( !message.isRoll || !message.roll.parts.length ) return;
  let d = message.roll.parts[0];
  if ( d instanceof Die && d.faces === 20 ) {
    if (d.total === 20) html.find(".dice-total").addClass("success");
    else if (d.total === 1) html.find(".dice-total").addClass("failure");
  }
});


