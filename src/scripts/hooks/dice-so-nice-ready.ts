interface ColorsetOptions {
    name: string;
    description: string;
    category: string;
    texture: string;
    material: string;
    foreground: string;
    outline: string;
    edge: string;
}

interface Dice3D {
    addSystem(system: { id: string; name: string }, mode: "default" | "preferred"): void;
    addDicePreset(data: { type: string; labels: string[]; system: string }, shape?: string | null): void;
    addTexture(textureId: string, options: { name: string; composite: string; source: string }): Promise<void>;
    addColorset(options: ColorsetOptions, mode: "default" | "preferred"): void;
}

const isDice3D = (obj: unknown): obj is Dice3D =>
    obj instanceof Object && ["addSystem", "addDicePreset", "addTexture", "addColorset"].every((m) => m in obj);

export const DiceSoNiceReady = {
    listen: (): void => {
        Hooks.once("diceSoNiceReady", (dice3d: unknown) => {
            if (!isDice3D(dice3d)) return;

            dice3d.addSystem({ id: "basic", name: "☑ Dicefinder Basic" }, "default");

            dice3d.addDicePreset({
                type: "d20",
                labels: [
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "10",
                    "11",
                    "12",
                    "13",
                    "14",
                    "15",
                    "16",
                    "17",
                    "18",
                    "19",
                    "systems/pf2e/dice/basic/nat20.webp",
                ],
                system: "basic",
            });

            dice3d.addDicePreset({
                type: "dc",
                labels: ["systems/pf2e/dice/basic/tail.webp", "systems/pf2e/dice/basic/heads.webp"],
                system: "basic",
            });

            dice3d.addDicePreset({
                type: "d2",
                labels: ["systems/pf2e/dice/basic/tail_bump.webp", "systems/pf2e/dice/basic/heads_bump.webp"],
                system: "basic",
            });

            dice3d
                .addTexture("PFred", {
                    name: "☑ Dicefinder Basic",
                    composite: "source-over",
                    source: "systems/pf2e/dice/texture/texture.webp",
                })
                .then(() => {
                    dice3d.addColorset(
                        {
                            name: "basic",
                            description: "☑ Dicefinder Basic",
                            category: "Pathfinder 2e",
                            texture: "PFred",
                            material: "chrome",
                            foreground: "#c98e45",
                            outline: "none",
                            edge: "#c98e45",
                        },
                        "default"
                    );
                });

            dice3d.addSystem({ id: "campaign", name: "☑ Dicefinder Campaign" }, "default");

            dice3d.addDicePreset({
                type: "dc",
                labels: ["systems/pf2e/dice/basic/tail.webp", "systems/pf2e/dice/basic/heads.webp"],
                system: "campaign",
            });

            dice3d.addDicePreset({
                type: "d2",
                labels: ["systems/pf2e/dice/basic/tail_bump.webp", "systems/pf2e/dice/basic/heads_bump.webp"],
                system: "campaign",
            });

            dice3d.addDicePreset({
                type: "d4",
                labels: [
                    "systems/pf2e/dice/campaign/d4/d4-1.webp",
                    "systems/pf2e/dice/campaign/d4/d4-2.webp",
                    "systems/pf2e/dice/campaign/d4/d4-3.webp",
                    "systems/pf2e/dice/campaign/d4/d4-4.webp",
                ],
                system: "campaign",
            });

            dice3d.addDicePreset({
                type: "d6",
                labels: [
                    "systems/pf2e/dice/campaign/d6/d6-1.webp",
                    "systems/pf2e/dice/campaign/d6/d6-2.webp",
                    "systems/pf2e/dice/campaign/d6/d6-3.webp",
                    "systems/pf2e/dice/campaign/d6/d6-4.webp",
                    "systems/pf2e/dice/campaign/d6/d6-5.webp",
                    "systems/pf2e/dice/campaign/d6/d6-6.webp",
                ],
                system: "campaign",
            });

            dice3d.addDicePreset({
                type: "df",
                labels: [
                    "systems/pf2e/dice/campaign/df/dfm.webp",
                    "systems/pf2e/dice/campaign/df/df.webp",
                    "systems/pf2e/dice/campaign/df/dfp.webp",
                ],
                system: "campaign",
            });

            dice3d.addDicePreset({
                type: "d8",
                labels: [
                    "systems/pf2e/dice/campaign/d8/d8-1.webp",
                    "systems/pf2e/dice/campaign/d8/d8-2.webp",
                    "systems/pf2e/dice/campaign/d8/d8-3.webp",
                    "systems/pf2e/dice/campaign/d8/d8-4.webp",
                    "systems/pf2e/dice/campaign/d8/d8-5.webp",
                    "systems/pf2e/dice/campaign/d8/d8-6.webp",
                    "systems/pf2e/dice/campaign/d8/d8-7.webp",
                    "systems/pf2e/dice/campaign/d8/d8-P.webp",
                ],
                system: "campaign",
            });

            dice3d.addDicePreset({
                type: "d10",
                labels: [
                    "systems/pf2e/dice/campaign/d10/d10-1.webp",
                    "systems/pf2e/dice/campaign/d10/d10-2.webp",
                    "systems/pf2e/dice/campaign/d10/d10-3.webp",
                    "systems/pf2e/dice/campaign/d10/d10-4.webp",
                    "systems/pf2e/dice/campaign/d10/d10-5.webp",
                    "systems/pf2e/dice/campaign/d10/d10-6.webp",
                    "systems/pf2e/dice/campaign/d10/d10-7.webp",
                    "systems/pf2e/dice/campaign/d10/d10-8.webp",
                    "systems/pf2e/dice/campaign/d10/d10-9.webp",
                    "systems/pf2e/dice/campaign/d10/d10-10.webp",
                ],
                system: "campaign",
            });

            dice3d.addDicePreset({
                type: "d12",
                labels: [
                    "systems/pf2e/dice/campaign/d12/d12-1.webp",
                    "systems/pf2e/dice/campaign/d12/d12-2.webp",
                    "systems/pf2e/dice/campaign/d12/d12-3.webp",
                    "systems/pf2e/dice/campaign/d12/d12-4.webp",
                    "systems/pf2e/dice/campaign/d12/d12-5.webp",
                    "systems/pf2e/dice/campaign/d12/d12-6.webp",
                    "systems/pf2e/dice/campaign/d12/d12-7.webp",
                    "systems/pf2e/dice/campaign/d12/d12-8.webp",
                    "systems/pf2e/dice/campaign/d12/d12-9.webp",
                    "systems/pf2e/dice/campaign/d12/d12-10.webp",
                    "systems/pf2e/dice/campaign/d12/d12-11.webp",
                    "systems/pf2e/dice/campaign/d12/d12-12.webp",
                ],
                system: "campaign",
            });

            dice3d.addDicePreset({
                type: "d100",
                labels: [
                    "systems/pf2e/dice/campaign/d100/d100-10.webp",
                    "systems/pf2e/dice/campaign/d100/d100-20.webp",
                    "systems/pf2e/dice/campaign/d100/d100-30.webp",
                    "systems/pf2e/dice/campaign/d100/d100-40.webp",
                    "systems/pf2e/dice/campaign/d100/d100-50.webp",
                    "systems/pf2e/dice/campaign/d100/d100-60.webp",
                    "systems/pf2e/dice/campaign/d100/d100-70.webp",
                    "systems/pf2e/dice/campaign/d100/d100-80.webp",
                    "systems/pf2e/dice/campaign/d100/d100-90.webp",
                    "systems/pf2e/dice/campaign/d100/d100-100.webp",
                ],
                system: "campaign",
            });

            dice3d.addDicePreset({
                type: "d20",
                labels: [
                    "systems/pf2e/dice/campaign/d20/d20-1.webp",
                    "systems/pf2e/dice/campaign/d20/d20-2.webp",
                    "systems/pf2e/dice/campaign/d20/d20-3.webp",
                    "systems/pf2e/dice/campaign/d20/d20-4.webp",
                    "systems/pf2e/dice/campaign/d20/d20-5.webp",
                    "systems/pf2e/dice/campaign/d20/d20-6.webp",
                    "systems/pf2e/dice/campaign/d20/d20-7.webp",
                    "systems/pf2e/dice/campaign/d20/d20-8.webp",
                    "systems/pf2e/dice/campaign/d20/d20-9.webp",
                    "systems/pf2e/dice/campaign/d20/d20-10.webp",
                    "systems/pf2e/dice/campaign/d20/d20-11.webp",
                    "systems/pf2e/dice/campaign/d20/d20-12.webp",
                    "systems/pf2e/dice/campaign/d20/d20-13.webp",
                    "systems/pf2e/dice/campaign/d20/d20-14.webp",
                    "systems/pf2e/dice/campaign/d20/d20-15.webp",
                    "systems/pf2e/dice/campaign/d20/d20-16.webp",
                    "systems/pf2e/dice/campaign/d20/d20-17.webp",
                    "systems/pf2e/dice/campaign/d20/d20-18.webp",
                    "systems/pf2e/dice/campaign/d20/d20-19.webp",
                    "systems/pf2e/dice/campaign/d20/d20-20.webp",
                ],
                system: "campaign",
            });

            dice3d
                .addTexture("d4", {
                    name: "☑ Dicefinder Campaign",
                    composite: "source-over",
                    source: "systems/pf2e/dice/texture/d4.webp",
                })
                .then(() => {
                    dice3d.addColorset(
                        {
                            name: "campaign",
                            description: "☑ Dicefinder Campaign",
                            category: "Pathfinder 2e",
                            texture: "d4",
                            material: "glass",
                            foreground: "#c98e45",
                            outline: "none",
                            edge: "#c98e45",
                        },
                        "default"
                    );
                });

            dice3d.addSystem({ id: "darkmode", name: "☑ Dicefinder Dark Mode" }, "default");

            dice3d.addDicePreset({
                type: "d20",
                labels: [
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "10",
                    "11",
                    "12",
                    "13",
                    "14",
                    "15",
                    "16",
                    "17",
                    "18",
                    "19",
                    "systems/pf2e/dice/basic/nat20.webp",
                ],
                system: "darkmode",
            });
            dice3d.addDicePreset({
                type: "dc",
                labels: ["systems/pf2e/dice/basic/tail.webp", "systems/pf2e/dice/basic/heads.webp"],
                system: "darkmode",
            });

            dice3d.addDicePreset({
                type: "d2",
                labels: ["systems/pf2e/dice/basic/tail_bump.webp", "systems/pf2e/dice/basic/heads_bump.webp"],
                system: "darkmode",
            });

            dice3d
                .addTexture("transparent", {
                    name: "☑ Dicefinder Dark Mode",
                    composite: "source-over",
                    source: "systems/pf2e/dice/texture/transparent.webp",
                })
                .then(() => {
                    dice3d.addColorset(
                        {
                            name: "darkmode",
                            description: "☑ Dicefinder Dark Mode",
                            category: "Pathfinder 2e",
                            texture: "transparent",
                            material: "glass",
                            foreground: "#c98e45",
                            outline: "none",
                            edge: "#c98e45",
                        },
                        "default"
                    );
                });
        });
    },
};
