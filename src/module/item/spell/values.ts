const MAGIC_SCHOOLS = new Set([
    "abjuration",
    "conjuration",
    "divination",
    "enchantment",
    "evocation",
    "illusion",
    "necromancy",
    "transmutation",
] as const);

const MAGIC_TRADITIONS = new Set(["arcane", "divine", "occult", "primal"] as const);

const SPELL_COMPONENTS = ["focus", "material", "somatic", "verbal"] as const;

export { MAGIC_SCHOOLS, MAGIC_TRADITIONS, SPELL_COMPONENTS };
