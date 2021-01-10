const tokens = canvas.tokens.controlled;

if (tokens.length === 0) {
    ui.notifications.error(`You must select at least one npc/pc token`);
} else {
    tokens.map((p) => p.actor).forEach((actor) => actor.data.data.attributes.perception.roll(event, ['secret']));
}
