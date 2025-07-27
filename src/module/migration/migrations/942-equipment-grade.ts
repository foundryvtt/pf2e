import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { Grade } from "@item/physical/types.ts";
import { MigrationBase } from "../base.ts";

export class Migration942EquipmentGrade extends MigrationBase {
    static override version = 0.942;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "weapon" && source.type !== "armor") return;
        const isSF2eItem = source.system.traits.value.some((t) => t === "tech" || t === "analog");
        if (source.system.grade || !isSF2eItem) return;

        const grade =
            source.type === "weapon"
                ? weaponImprovements.findLast(
                      (f) => source.system.runes.potency >= f.potency && source.system.runes.striking >= f.striking,
                  )?.slug
                : armorImprovements.findLast(
                      (f) => source.system.runes.potency >= f.potency && source.system.runes.resilient >= f.resilient,
                  )?.slug;
        if (grade) {
            const previousProperty: string[] = source.system.runes.property;
            source.system.grade = grade;
            source.system.runes.potency = 0;
            source.system.runes.property = [];
            if (source.type === "weapon") {
                source.system.runes.striking = 0;
            } else {
                source.system.runes.resilient = 0;
            }

            // Property runes cannot be migrated, upgrades work completely differently.
            // We add a note to allow the character to correct it later.
            if (previousProperty.length && "game" in globalThis) {
                const runes = previousProperty.map((p) =>
                    allPropertyRunes[p] ? game.i18n.localize(allPropertyRunes[p]) : p,
                );
                source.system.description.value += `<hr/>The following property runes were removed when migrating to a tech weapon: ${runes.join(", ")}`;
            }
        }
    }
}

const weaponImprovements: { slug: Grade; potency: number; striking: number }[] = [
    { slug: "commercial", potency: 0, striking: 0 },
    { slug: "tactical", potency: 1, striking: 0 },
    { slug: "advanced", potency: 1, striking: 1 },
    { slug: "superior", potency: 2, striking: 1 },
    { slug: "elite", potency: 2, striking: 2 },
    { slug: "ultimate", potency: 3, striking: 2 },
    { slug: "paragon", potency: 3, striking: 3 },
];

const armorImprovements: { slug: Grade; potency: number; resilient: number }[] = [
    { slug: "commercial", potency: 0, resilient: 0 },
    { slug: "tactical", potency: 1, resilient: 0 },
    { slug: "advanced", potency: 1, resilient: 1 },
    { slug: "superior", potency: 2, resilient: 1 },
    { slug: "elite", potency: 2, resilient: 2 },
    { slug: "ultimate", potency: 3, resilient: 2 },
    { slug: "paragon", potency: 3, resilient: 3 },
];

const allWeaponPropertyRunes = {
    ancestralEchoing: "PF2E.WeaponPropertyRune.ancestralEchoing.Name",
    anchoring: "PF2E.WeaponPropertyRune.anchoring.Name",
    ashen: "PF2E.WeaponPropertyRune.ashen.Name",
    astral: "PF2E.WeaponPropertyRune.astral.Name",
    authorized: "PF2E.WeaponPropertyRune.authorized.Name",
    bane: "PF2E.WeaponPropertyRune.bane.Name",
    bloodbane: "PF2E.WeaponPropertyRune.bloodbane.Name",
    bloodthirsty: "PF2E.WeaponPropertyRune.bloodthirsty.Name",
    bolkasBlessing: "PF2E.WeaponPropertyRune.bolkasBlessing.Name",
    brilliant: "PF2E.WeaponPropertyRune.brilliant.Name",
    called: "PF2E.WeaponPropertyRune.called.Name",
    coating: "PF2E.WeaponPropertyRune.coating.Name",
    conducting: "PF2E.WeaponPropertyRune.conducting.Name",
    corrosive: "PF2E.WeaponPropertyRune.corrosive.Name",
    crushing: "PF2E.WeaponPropertyRune.crushing.Name",
    cunning: "PF2E.WeaponPropertyRune.cunning.Name",
    dancing: "PF2E.WeaponPropertyRune.dancing.Name",
    decaying: "PF2E.WeaponPropertyRune.decaying.Name",
    deathdrinking: "PF2E.WeaponPropertyRune.deathdrinking.Name",
    demolishing: "PF2E.WeaponPropertyRune.demolishing.Name",
    disrupting: "PF2E.WeaponPropertyRune.disrupting.Name",
    earthbinding: "PF2E.WeaponPropertyRune.earthbinding.Name",
    energizing: "PF2E.WeaponPropertyRune.energizing.Name",
    extending: "PF2E.WeaponPropertyRune.extending.Name",
    fanged: "PF2E.WeaponPropertyRune.fanged.Name",
    fearsome: "PF2E.WeaponPropertyRune.fearsome.Name",
    flaming: "PF2E.WeaponPropertyRune.flaming.Name",
    flickering: "PF2E.WeaponPropertyRune.flickering.Name",
    flurrying: "PF2E.WeaponPropertyRune.flurrying.Name",
    frost: "PF2E.WeaponPropertyRune.frost.Name",
    ghostTouch: "PF2E.WeaponPropertyRune.ghostTouch.Name",
    giantKilling: "PF2E.WeaponPropertyRune.giantKilling.Name",
    greaterAnchoring: "PF2E.WeaponPropertyRune.greaterAnchoring.Name",
    greaterAshen: "PF2E.WeaponPropertyRune.greaterAshen.Name",
    greaterAstral: "PF2E.WeaponPropertyRune.greaterAstral.Name",
    greaterBloodbane: "PF2E.WeaponPropertyRune.greaterBloodbane.Name",
    greaterBolkasBlessing: "PF2E.WeaponPropertyRune.greaterBolkasBlessing.Name",
    greaterBrilliant: "PF2E.WeaponPropertyRune.greaterBrilliant.Name",
    greaterCorrosive: "PF2E.WeaponPropertyRune.greaterCorrosive.Name",
    greaterCrushing: "PF2E.WeaponPropertyRune.greaterCrushing.Name",
    greaterDecaying: "PF2E.WeaponPropertyRune.greaterDecaying.Name",
    greaterDisrupting: "PF2E.WeaponPropertyRune.greaterDisrupting.Name",
    greaterExtending: "PF2E.WeaponPropertyRune.greaterExtending.Name",
    greaterFanged: "PF2E.WeaponPropertyRune.greaterFanged.Name",
    greaterFearsome: "PF2E.WeaponPropertyRune.greaterFearsome.Name",
    greaterFlaming: "PF2E.WeaponPropertyRune.greaterFlaming.Name",
    greaterFrost: "PF2E.WeaponPropertyRune.greaterFrost.Name",
    greaterGiantKilling: "PF2E.WeaponPropertyRune.greaterGiantKilling.Name",
    greaterHauling: "PF2E.WeaponPropertyRune.greaterHauling.Name",
    greaterImpactful: "PF2E.WeaponPropertyRune.greaterImpactful.Name",
    greaterKolssOath: "PF2E.WeaponPropertyRune.greaterKolssOath.Name",
    greaterRooting: "PF2E.WeaponPropertyRune.greaterRooting.Name",
    greaterShock: "PF2E.WeaponPropertyRune.greaterShock.Name",
    greaterThundering: "PF2E.WeaponPropertyRune.greaterThundering.Name",
    greaterTruddsStrength: "PF2E.WeaponPropertyRune.greaterTruddsStrength.Name",
    grievous: "PF2E.WeaponPropertyRune.grievous.Name",
    hauling: "PF2E.WeaponPropertyRune.hauling.Name",
    holy: "PF2E.WeaponPropertyRune.holy.Name",
    hopeful: "PF2E.WeaponPropertyRune.hopeful.Name",
    hooked: "PF2E.WeaponPropertyRune.hooked.Name",
    impactful: "PF2E.WeaponPropertyRune.impactful.Name",
    impossible: "PF2E.WeaponPropertyRune.impossible.Name",
    keen: "PF2E.WeaponPropertyRune.keen.Name",
    kinWarding: "PF2E.WeaponPropertyRune.kinWarding.Name",
    kolssOath: "PF2E.WeaponPropertyRune.kolssOath.Name",
    majorFanged: "PF2E.WeaponPropertyRune.majorFanged.Name",
    majorRooting: "PF2E.WeaponPropertyRune.majorRooting.Name",
    merciful: "PF2E.WeaponPropertyRune.merciful.Name",
    nightmare: "PF2E.WeaponPropertyRune.nightmare.Name",
    pacifying: "PF2E.WeaponPropertyRune.pacifying.Name",
    returning: "PF2E.WeaponPropertyRune.returning.Name",
    rooting: "PF2E.WeaponPropertyRune.rooting.Name",
    serrating: "PF2E.WeaponPropertyRune.serrating.Name",
    shifting: "PF2E.WeaponPropertyRune.shifting.Name",
    shock: "PF2E.WeaponPropertyRune.shock.Name",
    shockwave: "PF2E.WeaponPropertyRune.shockwave.Name",
    speed: "PF2E.WeaponPropertyRune.speed.Name",
    spellStoring: "PF2E.WeaponPropertyRune.spellStoring.Name",
    swarming: "PF2E.WeaponPropertyRune.swarming.Name",
    thundering: "PF2E.WeaponPropertyRune.thundering.Name",
    truddsStrength: "PF2E.WeaponPropertyRune.truddsStrength.Name",
    trueRooting: "PF2E.WeaponPropertyRune.trueRooting.Name",
    underwater: "PF2E.WeaponPropertyRune.underwater.Name",
    unholy: "PF2E.WeaponPropertyRune.unholy.Name",
    vorpal: "PF2E.WeaponPropertyRune.vorpal.Name",
    wounding: "PF2E.WeaponPropertyRune.wounding.Name",
};

const allArmorPropertyRunes = {
    acidResistant: "PF2E.ArmorPropertyRuneAcidResistant",
    advancing: "PF2E.ArmorPropertyRuneAdvancing",
    aimAiding: "PF2E.ArmorPropertyRuneAimAiding",
    antimagic: "PF2E.ArmorPropertyRuneAntimagic",
    assisting: "PF2E.ArmorPropertyRuneAssisting",
    bitter: "PF2E.ArmorPropertyRuneBitter",
    coldResistant: "PF2E.ArmorPropertyRuneColdResistant",
    deathless: "PF2E.ArmorPropertyRuneDeathless",
    electricityResistant: "PF2E.ArmorPropertyRuneElectricityResistant",
    energyAdaptive: "PF2E.ArmorPropertyRuneEnergyAdaptive",
    ethereal: "PF2E.ArmorPropertyRuneEthereal",
    fireResistant: "PF2E.ArmorPropertyRuneFireResistant",
    fortification: "PF2E.ArmorPropertyRuneFortification",
    glamered: "PF2E.ArmorPropertyRuneGlamered",
    gliding: "PF2E.ArmorPropertyRuneGliding",
    greaterAcidResistant: "PF2E.ArmorPropertyRuneGreaterAcidResistant",
    greaterAdvancing: "PF2E.ArmorPropertyRuneGreaterAdvancing",
    greaterColdResistant: "PF2E.ArmorPropertyRuneGreaterColdResistant",
    greaterDread: "PF2E.ArmorPropertyRuneGreaterDread",
    greaterElectricityResistant: "PF2E.ArmorPropertyRuneGreaterElectricityResistant",
    greaterFireResistant: "PF2E.ArmorPropertyRuneGreaterFireResistant",
    greaterFortification: "PF2E.ArmorPropertyRuneGreaterFortification",
    greaterInvisibility: "PF2E.ArmorPropertyRuneGreaterInvisibility",
    greaterReady: "PF2E.ArmorPropertyRuneGreaterReady",
    greaterShadow: "PF2E.ArmorPropertyRuneGreaterShadow",
    greaterSlick: "PF2E.ArmorPropertyRuneGreaterSlick",
    greaterStanching: "PF2E.ArmorPropertyRuneGreaterStanching",
    greaterQuenching: "PF2E.ArmorPropertyRuneGreaterQuenching",
    greaterSwallowSpike: "PF2E.ArmorPropertyRuneGreaterSwallowSpike",
    greaterWinged: "PF2E.ArmorPropertyRuneGreaterWinged",
    immovable: "PF2E.ArmorPropertyRuneImmovable",
    implacable: "PF2E.ArmorPropertyRuneImplacable",
    invisibility: "PF2E.ArmorPropertyRuneInvisibility",
    lesserDread: "PF2E.ArmorPropertyRuneLesserDread",
    magnetizing: "PF2E.ArmorPropertyRuneMagnetizing",
    majorQuenching: "PF2E.ArmorPropertyRuneMajorQuenching",
    majorShadow: "PF2E.ArmorPropertyRuneMajorShadow",
    majorSlick: "PF2E.ArmorPropertyRuneMajorSlick",
    majorStanching: "PF2E.ArmorPropertyRuneMajorStanching",
    majorSwallowSpike: "PF2E.ArmorPropertyRuneMajorSwallowSpike",
    malleable: "PF2E.ArmorPropertyRuneMalleable",
    misleading: "PF2E.ArmorPropertyRuneMisleading",
    moderateDread: "PF2E.ArmorPropertyRuneModerateDread",
    portable: "PF2E.ArmorPropertyRunePortable",
    quenching: "PF2E.ArmorPropertyRuneQuenching",
    raiment: "PF2E.ArmorPropertyRuneRaiment",
    ready: "PF2E.ArmorPropertyRuneReady",
    rockBraced: "PF2E.ArmorPropertyRuneRockBraced",
    shadow: "PF2E.ArmorPropertyRuneShadow",
    sinisterKnight: "PF2E.ArmorPropertyRuneSinisterKnight",
    sizeChanging: "PF2E.ArmorPropertyRuneSizeChanging",
    slick: "PF2E.ArmorPropertyRuneSlick",
    soaring: "PF2E.ArmorPropertyRuneSoaring",
    spellwatch: "PF2E.ArmorPropertyRuneSpellwatch",
    stanching: "PF2E.ArmorPropertyRuneStanching",
    swallowSpike: "PF2E.ArmorPropertyRuneSwallowSpike",
    trueQuenching: "PF2E.ArmorPropertyRuneTrueQuenching",
    trueStanching: "PF2E.ArmorPropertyRuneTrueStanching",
    winged: "PF2E.ArmorPropertyRuneWinged",
};

const allPropertyRunes: Record<string, string | undefined> = {
    ...allWeaponPropertyRunes,
    ...allArmorPropertyRunes,
};
