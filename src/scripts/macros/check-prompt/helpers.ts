import type { ActorPF2e, CharacterPF2e } from "@actor";

function loreSkillsFromActors(actors: ActorPF2e | ActorPF2e[]): Record<string, string> {
    const actorsArray = Array.isArray(actors) ? actors : [actors];
    const characters = actorsArray.filter((a): a is CharacterPF2e => a?.type === "character");
    return Object.fromEntries(
        characters
            .flatMap((m) => Object.values(m.skills))
            .filter((s) => s.lore)
            .map((s) => [s.slug, s.label]),
    );
}

async function getActions(): Promise<Record<string, string>> {
    const indexFields = ["system.slug"];
    const pack = game.packs.get("pf2e.actionspf2e");
    if (pack) {
        const index = await pack.getIndex({ fields: indexFields });
        const actions = index.map((a) => [a.system.slug, a.name]);
        return Object.fromEntries(actions);
    } else {
        return {};
    }
}

function getMacros(): Record<string, string> {
    const actions = game.pf2e.actions.map((a) => [a.slug, a.name]);
    return actions ? Object.fromEntries(actions) : {};
}

function getVariants(): Record<string, string> {
    const actions = game.pf2e.actions;
    const variants = actions.map((a) => a.variants.map((v) => [v.slug, v.name])).flat();
    return variants ? Object.fromEntries(variants) : {};
}

export { getActions, getMacros, getVariants, loreSkillsFromActors };
