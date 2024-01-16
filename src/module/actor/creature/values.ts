import type { Language, SenseAcuity, SenseType } from "./types.ts";

const ALLIANCES = new Set(["party", "opposition", null] as const);

const SAVING_THROW_ATTRIBUTES = {
    fortitude: "con",
    reflex: "dex",
    will: "wis",
} as const;

/** Use the lower end of CRB Table 9-1 ("Size and Reach"), allowing individual attacks to specify otherwise */
const SIZE_TO_REACH = {
    tiny: 0,
    sm: 5,
    med: 5,
    lg: 5,
    huge: 10,
    grg: 15,
} as const;

const SENSE_TYPES = new Set([
    "darkvision",
    "echolocation",
    "greater-darkvision",
    "infrared-vision",
    "lifesense",
    "low-light-vision",
    "motion-sense",
    "scent",
    "see-invisibility",
    "spiritsense",
    "thoughtsense",
    "tremorsense",
    "truesight",
    "wavesense",
] as const);

/** Sense types associated with a particular acuities by definition */
const SENSES_WITH_MANDATORY_ACUITIES: { [K in SenseType]?: SenseAcuity } = {
    darkvision: "precise",
    echolocation: "precise",
    "greater-darkvision": "precise",
    "infrared-vision": "precise",
    "low-light-vision": "precise",
    "motion-sense": "precise",
    "see-invisibility": "precise",
    truesight: "precise",
};

const SENSES_WITH_UNLIMITED_RANGE = [
    "darkvision",
    "greater-darkvision",
    "low-light-vision",
    "see-invisibility",
] as const;

const SENSE_ACUITIES = ["precise", "imprecise", "vague"] as const;

const COMMON_LANGUAGES = [
    "draconic",
    "dwarven",
    "elven",
    "fey",
    "gnomish",
    "goblin",
    "halfling",
    "jotun",
    "orcish",
    "sakvroth",
    "taldane",
] as const;

const UNCOMMON_LANGUAGES = [
    "adlet",
    "aklo",
    "alghollthu",
    "amurrun",
    "arboreal",
    "boggard",
    "calda",
    "caligni",
    "chthonian",
    "cyclops",
    "daemonic",
    "diabolic",
    "ekujae",
    "empyrean",
    "grippli",
    "hallit",
    "iruxi",
    "kelish",
    "kholo",
    "kibwani",
    "kitsune",
    "lirgeni",
    "muan",
    "mwangi",
    "mzunu",
    "nagaji",
    "necril",
    "ocotan",
    "osiriani",
    "petran",
    "protean",
    "pyric",
    "requian",
    "shadowtongue",
    "shoanti",
    "skald",
    "sphinx",
    "sussuran",
    "tengu",
    "thalassic",
    "tien",
    "utopian",
    "vanara",
    "varisian",
    "vudrani",
    "xanmba",
    "ysoki",
] as const;

const RARE_LANGUAGES = [
    "ancient-osiriani",
    "akitonian",
    "anadi",
    "androffan",
    "anugobu",
    "arcadian",
    "azlanti",
    "destrachan",
    "drooni",
    "dziriak",
    "elder-thing",
    "erutaki",
    "formian",
    "garundi",
    "girtablilu",
    "goloma",
    "grioth",
    "hwan",
    "iblydan",
    "ikeshti",
    "immolis",
    "jistkan",
    "jyoti",
    "kaava",
    "kashrishi",
    "kovintal",
    "mahwek",
    "migo",
    "minaten",
    "minkaian",
    "munavri",
    "okaiyan",
    "orvian",
    "rasu",
    "ratajin",
    "razatlani",
    "russian",
    "samsaran",
    "sasquatch",
    "senzar",
    "shae",
    "shisk",
    "shobhad",
    "shoony",
    "shory",
    "strix",
    "talican",
    "tekritanin",
    "thassilonian",
    "varki",
    "vishkanyan",
    "wyrwood",
    "yithian",
] as const;

const LANGUAGES_BY_RARITY = {
    common: COMMON_LANGUAGES,
    uncommon: UNCOMMON_LANGUAGES,
    rare: RARE_LANGUAGES,
    secret: ["wildsong"] as const,
};

const LANGUAGES: Language[] = ["common", ...COMMON_LANGUAGES, ...UNCOMMON_LANGUAGES, ...RARE_LANGUAGES, "wildsong"];
LANGUAGES.sort();

const LANGUAGE_RARITIES = ["common", "uncommon", "rare", "secret"] as const;

export {
    ALLIANCES,
    LANGUAGES,
    LANGUAGES_BY_RARITY,
    LANGUAGE_RARITIES,
    SAVING_THROW_ATTRIBUTES,
    SENSES_WITH_MANDATORY_ACUITIES,
    SENSES_WITH_UNLIMITED_RANGE,
    SENSE_ACUITIES,
    SENSE_TYPES,
    SIZE_TO_REACH,
};
