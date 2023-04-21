import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration618MigrateItemImagePaths extends MigrationBase {
    static override version = 0.618;

    readonly #IMAGE_PATHS: Record<string, ImageFilePath> = {
        "systems/pf2e/icons/equipment/weapons/blowgun.png": "systems/pf2e/icons/equipment/weapons/blowgun.jpg",
        "systems/pf2e/icons/equipment/weapons/trident.png": "systems/pf2e/icons/equipment/weapons/trident.jpg",
        "systems/pf2e/icons/equipment/weapons/longsword.png": "systems/pf2e/icons/equipment/weapons/longsword.jpg",
        "systems/pf2e/icons/equipment/weapons/composite-longbow.png":
            "systems/pf2e/icons/equipment/weapons/composite-longbow.jpg",
        "systems/pf2e/icons/equipment/weapons/composite-shortbow.png":
            "systems/pf2e/icons/equipment/weapons/composite-shortbow.jpg",
        "systems/pf2e/icons/equipment/weapons/dagger.png": "systems/pf2e/icons/equipment/weapons/dagger.jpg",
        "systems/pf2e/icons/equipment/weapons/katar.png": "systems/pf2e/icons/equipment/weapons/katar.jpg",
        "systems/pf2e/icons/equipment/weapons/kukri.png": "systems/pf2e/icons/equipment/weapons/kukri.jpg",
        "systems/pf2e/icons/equipment/weapons/shortbow.png": "systems/pf2e/icons/equipment/weapons/shortbow.jpg",
        "systems/pf2e/icons/equipment/weapons/scimitar.png": "systems/pf2e/icons/equipment/weapons/scimitar.jpg",
        "systems/pf2e/icons/equipment/weapons/hatchet.png": "systems/pf2e/icons/equipment/weapons/hatchet.jpg",
        "systems/pf2e/icons/equipment/weapons/halfling-sling-staff.png":
            "systems/pf2e/icons/equipment/weapons/halfling-sling-staff.jpg",
        "systems/pf2e/icons/equipment/weapons/halberd.png": "systems/pf2e/icons/equipment/weapons/halberd.jpg",
        "systems/pf2e/icons/equipment/weapons/shield-spikes.png":
            "systems/pf2e/icons/equipment/weapons/shield-spikes.jpg",
        "systems/pf2e/icons/equipment/weapons/light-mace.jpg": "systems/pf2e/icons/equipment/weapons/light-mace.jpg",
        "systems/pf2e/icons/equipment/weapons/morningstar.png": "systems/pf2e/icons/equipment/weapons/morningstar.jpg",
        "systems/pf2e/icons/equipment/weapons/sling.png": "systems/pf2e/icons/equipment/weapons/sling.jpg",
        "systems/pf2e/icons/equipment/weapons/main-gauche.png": "systems/pf2e/icons/equipment/weapons/main-gauche.jpg",
        "systems/pf2e/icons/equipment/weapons/bastard-sword.png":
            "systems/pf2e/icons/equipment/weapons/bastard-sword.jpg",
        "systems/pf2e/icons/equipment/weapons/spear.png": "systems/pf2e/icons/equipment/weapons/spear.jpg",
        "systems/pf2e/icons/equipment/weapons/staff.png": "systems/pf2e/icons/equipment/weapons/staff.jpg",
        "systems/pf2e/icons/equipment/weapons/katana.png": "systems/pf2e/icons/equipment/weapons/katana.jpg",
        "systems/pf2e/icons/equipment/weapons/elven-curve-blade.png":
            "systems/pf2e/icons/equipment/weapons/elven-curve-blade.jpg",
        "systems/pf2e/icons/equipment/weapons/bo-staff.png": "systems/pf2e/icons/equipment/weapons/bo-staff.jpg",
        "systems/pf2e/icons/equipment/weapons/clan-dagger.png": "systems/pf2e/icons/equipment/weapons/clan-dagger.jpg",
        "systems/pf2e/icons/equipment/weapons/dogslicer.png": "systems/pf2e/icons/equipment/weapons/dogslicer.jpg",
        "systems/pf2e/icons/equipment/weapons/falchion.png": "systems/pf2e/icons/equipment/weapons/falchion.jpg",
        "systems/pf2e/icons/equipment/weapons/fist.png": "systems/pf2e/icons/equipment/weapons/fist.jpg",
        "systems/pf2e/icons/equipment/weapons/gauntlet.png": "systems/pf2e/icons/equipment/weapons/gauntlet.jpg",
        "systems/pf2e/icons/equipment/weapons/gnome-hooked-hammer.png":
            "systems/pf2e/icons/equipment/weapons/gnome-hooked-hammer.jpg",
        "systems/pf2e/icons/equipment/weapons/greatpick.png": "systems/pf2e/icons/equipment/weapons/greatpick.jpg",
        "systems/pf2e/icons/equipment/weapons/guisarme.png": "systems/pf2e/icons/equipment/weapons/guisarme.jpg",
        "systems/pf2e/icons/equipment/weapons/horsechopper.png":
            "systems/pf2e/icons/equipment/weapons/horsechopper.jpg",
        "systems/pf2e/icons/equipment/weapons/lance.png": "systems/pf2e/icons/equipment/weapons/lance.jpg",
        "systems/pf2e/icons/equipment/weapons/maul.png": "systems/pf2e/icons/equipment/weapons/maul.jpg",
        "systems/pf2e/icons/equipment/weapons/pick.png": "systems/pf2e/icons/equipment/weapons/pick.jpg",
        "systems/pf2e/icons/equipment/weapons/ranseur.png": "systems/pf2e/icons/equipment/weapons/ranseur.jpg",
        "systems/pf2e/icons/equipment/weapons/sai.png": "systems/pf2e/icons/equipment/weapons/sai.jpg",
        "systems/pf2e/icons/equipment/weapons/sawtooth-saber.png":
            "systems/pf2e/icons/equipment/weapons/sawtooth-saber.jpg",
        "systems/pf2e/icons/equipment/weapons/shield-bash.png": "systems/pf2e/icons/equipment/weapons/shield-bash.jpg",
        "systems/pf2e/icons/equipment/weapons/shield-boss.png": "systems/pf2e/icons/equipment/weapons/shield-boss.jpg",
        "systems/pf2e/icons/equipment/weapons/shuriken.png": "systems/pf2e/icons/equipment/weapons/shuriken.jpg",
        "systems/pf2e/icons/equipment/weapons/spiked-gauntlet.png":
            "systems/pf2e/icons/equipment/weapons/spiked-gauntlet.jpg",
        "systems/pf2e/icons/equipment/weapons/broom.png": "systems/pf2e/icons/equipment/held-items/broom-of-flying.jpg",
        "systems/pf2e/icons/equipment/weapons/cutlass.png": "systems/pf2e/icons/equipment/weapons/scimitar.jpg",
        "systems/pf2e/icons/equipment/weapons/scalpel.png": "systems/pf2e/icons/equipment/weapons/war-razor.jpg",
        "systems/pf2e/icons/equipment/weapons/cane.png": "systems/pf2e/icons/equipment/weapons/cane.jpg",
    };

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        itemData.img = this.#IMAGE_PATHS[itemData.img] ?? itemData.img;
    }
}
