import type { ImageFilePath } from "@common/constants.d.mts";
import * as R from "remeda";

const BATTLE_FORM_DEFAULT_ICONS: Record<string, ImageFilePath | undefined> = R.mapToObj(
    [
        "antler",
        "beak",
        "body",
        "bone-shard",
        "branch",
        "claw",
        "cube-face",
        "fangs",
        "fire-mote",
        "fist",
        "foot",
        "foreleg",
        "gust",
        "horn",
        "jaws",
        "lighting-lash",
        "mandibles",
        "piercing-hymn",
        "pincer",
        "pseudopod",
        "rock",
        "spikes",
        "stinger",
        "tail",
        "talon",
        "tendril",
        "tentacle",
        "tongue",
        "trunk",
        "tusk",
        "vine",
        "water-spout",
        "wave",
        "wing",
    ],
    (slug): [string, ImageFilePath] => {
        switch (slug) {
            case "fist":
                return [slug, "icons/skills/melee/unarmed-punch-fist.webp"];
            case "pincer":
                return [slug, "icons/commodities/claws/claw-pincer-pink.webp"];
            default:
                return [slug, `${SYSTEM_ROOT}/icons/unarmed-attacks/${slug}.webp`];
        }
    },
);

export { BATTLE_FORM_DEFAULT_ICONS };
