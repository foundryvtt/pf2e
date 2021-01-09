const tokens = canvas.tokens.controlled;

if (tokens.length === 0) {
    ui.notifications.error(`You must select at least one npc/pc token`);
} else {
    tokens.map((p) => p.actor).forEach((actor) => actor.data.data.skills.ste.roll(event, ['secret']));
}
