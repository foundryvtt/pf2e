let toChat = (content) => {
    let chatData = {
        user: game.user.id,
        content,
        speaker: ChatMessage.getSpeaker(),
    };
    ChatMessage.create(chatData, {});
};

let applyChanges = false;
new Dialog({
    title: `Take a Breather`,
    content: `
    <div>Rest for 10 minutes, spend a resolve point, and regain stamina?</div>
    `,
    buttons: {
        yes: {
            icon: "<i class='fas fa-check'></i>",
            label: `Take a Breather`,
            callback: () => (applyChanges = true),
        },
        no: {
            icon: "<i class='fas fa-times'></i>",
            label: `Cancel`,
        },
    },
    default: "yes",
    close: (html) => {
        if (applyChanges) {
            for (let token of canvas.tokens.controlled) {
                const { name } = token;
                console.log(token);
                const { resolve, sp } = token.actor.system.attributes;
                console.log(resolve, sp);
                if (resolve.value > 0) {
                    let oldSP = sp.value;
                    toChat(
                        `${name} has ${sp.value}/${sp.max} SP and spends a resolve point, taking a 10 minute breather. Stamina Refreshed.`
                    );
                    token.actor.update({
                        "data.attributes.sp.value": sp.max,
                        "data.attributes.resolve.value": resolve.value - 1,
                    });
                } else {
                    toChat(`${name} is tired and needs to go to bed! No resolve points remaining.`);
                }
            }
        }
    },
}).render(true);
