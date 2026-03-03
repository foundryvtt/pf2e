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
    "bloodsense",
    "darkvision",
    "echolocation",
    "greater-darkvision",
    "infrared-vision",
    "lifesense",
    "low-light-vision",
    "magicsense",
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
    "tang",
    "tengu",
    "thalassic",
    "tien",
    "utopian",
    "vanara",
    "varisian",
    "vudrani",
    "xanmba",
    "wayang",
    "ysoki",
] as const;

const RARE_LANGUAGES = [
    "akitonian",
    "anadi",
    "ancient-osiriani",
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
    "lashunta",
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
    "surki",
    "talican",
    "tanuki",
    "tekritanin",
    "thassilonian",
    "varki",
    "vishkanyan",
    "wyrwood",
    "yaksha",
    "yithian",
] as const;

const COMMON_SF_LANGUAGES = [
    "akitonian",
    "brethedan",
    "castrovelian",
    "diasporan",
    "draconic",
    "eoxian",
    "kasatha",
    "pact-common",
    "pahtra",
    "trinary",
    "vercite",
    "vesk",
] as const;

const UNCOMMON_SF_LANGUAGES = [
    "aballonian",
    "aklo",
    "alghollthu",
    "azlanti",
    "chthonian",
    "daemonic",
    "diabolic",
    "elindrian",
    "elven",
    "embri",
    "empyrean",
    "fey",
    "first-one",
    "garaggakal",
    "jinsul",
    "jotun",
    "kalo",
    "kasatha",
    "khizar",
    "kothama",
    "kucharn",
    "lashunta",
    "morandomandranan",
    "muan",
    "necril",
    "orbian",
    "orcish",
    "petran",
    "prelurian",
    "primacy",
    "pyric",
    "requian",
    "sarcesian",
    "sarcesian-signed",
    "shadowtongue",
    "shirren",
    "shobhad",
    "starsong",
    "sussuran",
    "talican",
    "thalassic",
    "triaxian",
    "utopian",
    "vlaka",
    "ysoki",
] as const;

const LANGUAGES_BY_RARITY =
    SYSTEM_ID === "pf2e"
        ? {
              common: COMMON_LANGUAGES,
              uncommon: UNCOMMON_LANGUAGES,
              rare: RARE_LANGUAGES,
              secret: ["wildsong"] as const,
          }
        : {
              common: ["pact-common"],
              uncommon: UNCOMMON_SF_LANGUAGES,
              rare: [],
              secret: [] as const,
          };

const DEFAULT_COMMON_LANGUAGE = SYSTEM_ID === "pf2e" ? "taldane" : "pact-common";

const LANGUAGES: Language[] =
    SYSTEM_ID === "pf2e"
        ? ["common", ...COMMON_LANGUAGES, ...UNCOMMON_LANGUAGES, ...RARE_LANGUAGES, "wildsong"]
        : ["common", ...COMMON_SF_LANGUAGES, ...UNCOMMON_SF_LANGUAGES];
LANGUAGES.sort();

const LANGUAGE_RARITIES = ["common", "uncommon", "rare", "secret"] as const;

export {
    ALLIANCES,
    DEFAULT_COMMON_LANGUAGE,
    LANGUAGE_RARITIES,
    LANGUAGES,
    LANGUAGES_BY_RARITY,
    SAVING_THROW_ATTRIBUTES,
    SENSE_ACUITIES,
    SENSE_TYPES,
    SENSES_WITH_MANDATORY_ACUITIES,
    SENSES_WITH_UNLIMITED_RANGE,
    SIZE_TO_REACH,
};
