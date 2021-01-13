const tokens = canvas.tokens.controlled.filter((t) => ['character', 'npc', 'familiar'].includes(t.actor.data.type));

if (tokens.length === 0) {
    ui.notifications.error(`You must select at least one npc/pc token`);
} else {
    tokens.map((p) => p.actor).forEach((actor) => actor.data.data.skills.ste.roll(event, ['secret']));
}
