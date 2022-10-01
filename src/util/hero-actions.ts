const TABLE_ID = "zgZoI7h0XjjJrrNK";
const TABLE_UUID = `Compendium.pf2e.rollable-tables.${TABLE_ID}`;

export type HeroActionIndex = { _id: string; name: string };

export function getHeroDeckPack() {
    return game.packs.get("pf2e.hero-point-deck") as CompendiumCollection<JournalEntry>;
}

export function getCompendiumHeroDeckTable() {
    const pack = game.packs.get("pf2e.rollable-tables") as CompendiumCollection<RollTable>;
    return pack.getDocument(TABLE_ID) as Promise<RollTable>;
}

export function getWorldHeroDeckTable() {
    const id = game.settings.get("pf2e", "heroActionsDeckId") as string;
    // Hero Deck table with user provided id
    let table = id ? game.tables.get(id) : undefined;
    // or the first Hero Deck table found in the world
    return table ?? game.tables.find((x) => x.getFlag("core", "sourceId") === TABLE_UUID);
}

export async function createWorldHeroDeckTable() {
    const source = duplicate((await getCompendiumHeroDeckTable())._source);
    source.displayRoll = false;
    source.replacement = false;
    source.name = game.i18n.localize("PF2E.HeroActions.Table.Name");
    return await RollTable.create(source, { temporary: false });
}

export function isHeroActionVariantUnique() {
    return game.settings.get("pf2e", "heroActionsVariant") === "unique";
}

export function formatHeroActionUUID(action: HeroActionIndex) {
    return `@UUID[Compendium.pf2e.hero-point-deck.${action._id}]{${action.name}}`;
}

export async function getHeroActionDetails(id: string) {
    const pack = getHeroDeckPack();
    const entry = await pack.getDocument(id);
    if (!entry) return null;

    const page = entry.pages.contents[0] as unknown as { text: foundry.data.JournalEntryPageTextData };
    const text = page.text.content?.replace(/^<p>/, "<p><strong>Trigger</strong> ");

    return text ? { id: entry.id, name: entry.name, description: text } : null;
}
