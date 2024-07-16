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

function getVariants(slug: string): Record<string, string> {
    const action = game.pf2e.actions.get(slug);
    const variants = action?.variants.map((v) => [v.slug, v.name])
    return variants ? Object.fromEntries(variants) : {}
}

export { getActions, getVariants, loreSkillsFromActors };
