/**
 * This macro is for activating a Magic Weapon on your own character.
 * It applies the Magic Weapon effects only if they do not already exist
 * on currently equipped weapon. It removes them by running the macro again.
 * 
 * Original Author Robin Sving
 */

let messageContent = ''
const rune_image = "systems/pf2e/icons/spells/magic-weapon.jpg"
const activate_icon = "☑"
const deactivate_icon = "☒"

if (!actor) {
    ui.notifications.warn("You must have an actor selected.");
}

(async () => {
    for (let token of canvas.tokens.controlled) {
        const pronoun = getPronoun(actor);
        
        const weapon = token.actor.data.items
            .filter(item => item.type === 'weapon')
            .find(weapon => weapon.data.equipped.value);
        
        if (weapon) {
            if (!token.data.effects.includes(rune_image)) {
                messageContent = 'Activates Magic Weapon on ' + pronoun + ' ' + weapon.name

                // striking rune
                if (weapon.data.strikingRune.value  == "") {
                    messageContent += "<br> " + activate_icon + " Striking Rune"
                    weapon.data.strikingRune.value = "striking"
                    weapon.data.strikingRune.magicWeapon = true
                }

                // +1 item bonus => potency rune
                if (weapon.data.potencyRune.value == "") {
                    messageContent += "<br> " + activate_icon + " Potency Rune (+1)"
                    weapon.data.potencyRune.value = 1
                    weapon.data.potencyRune.magicWeapon = true
                }
            } else {
                messageContent = 'Dectivates Magic Weapon on ' + pronoun + ' ' + weapon.name

                // striking rune
                if (weapon.data.strikingRune.hasOwnProperty("magicWeapon")) {
                    messageContent += "<br> " + deactivate_icon + " Striking Rune"
                    weapon.data.strikingRune.value = ""
                    delete weapon.data.strikingRune.magicWeapon
                }
                
                // +1 item bonus => potency rune
                if (weapon.data.potencyRune.hasOwnProperty("magicWeapon")) {
                    messageContent += "<br> " + deactivate_icon + " Potency Rune (+1)"
                    weapon.data.potencyRune.value = ""
                    delete weapon.data.potencyRune.magicWeapon
                }
            };
            token.toggleEffect(rune_image)
        } else {
            ui.notifications.warn("You must have a weapon equipped.");
        }
    }
})();

// create the message
if (messageContent !== '') {
    let chatData = {
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: messageContent,
    };
    ChatMessage.create(chatData, {});
}

function getPronoun(actor) {
    const fromGender = actor.data.data.details.gender.value;

    return {
        'Female': 'her',
        'female': 'her',
        "Male": 'his',
        "male": 'his',
    }[fromGender] || 'their';
}