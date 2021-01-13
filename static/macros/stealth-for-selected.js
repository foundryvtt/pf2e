const tokens = canvas.tokens.controlled;

if (tokens.filter((token) => token.actor.data.type === 'npc' || token.actor.data.type === 'character').length === 0) {
    ui.notifications.error(`You must select at least one npc/pc token`);
} else {
    tokens
        .filter((token) => token.actor.data.type === 'npc' || token.actor.data.type === 'character')
        .map((p) => p.actor)
        .forEach((actor) => actor.data.data.skills.ste.roll(event, ['secret']));
}
