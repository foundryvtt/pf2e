import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Update UUIDS of domain journal entries to newer pages */
export class Migration844DeityDomainUUIDs extends MigrationBase {
    static override version = 0.844;

    #updateUUIDs(text: string): string {
        return this.#idMap.reduce((oldText, data) => {
            const pattern = new RegExp(
                String.raw`\bCompendium\.pf2e\.domains\.(?:JournalEntry?\.)?(?:${data.oldId}|${data.name})\](?:\{[^}]+})?`,
                "g"
            );
            return oldText.replace(
                pattern,
                `Compendium.pf2e.journals.JournalEntry.EEZvDB1Z7ezwaxIr.JournalEntryPage.${data.pageId}]{${data.name}}`
            );
        }, text);
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "npc") {
            source.system.details.publicNotes &&= this.#updateUUIDs(source.system.details.publicNotes);
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.description.gm &&= this.#updateUUIDs(source.system.description.gm);
        source.system.description.value &&= this.#updateUUIDs(source.system.description.value);
    }

    #idMap = [
        { oldId: "0cbxczrql4MwAHwV", name: "Glyph Domain", pageId: "9g1dNytABTpmmGkG" },
        { oldId: "1BU8deh48XZFclWl", name: "Healing Domain", pageId: "A7vErdGAweYsFcW8" },
        { oldId: "1NHV4ujqoR2JVWpY", name: "Travel Domain", pageId: "bTujFcUut9RX4GCy" },
        { oldId: "1aoUqGYDrdpnPWio", name: "Family Domain", pageId: "SAnmegCTIqGW9S7S" },
        { oldId: "41qaGiMit8nDP4xv", name: "Abomination Domain", pageId: "qMS6QepvY7UQQjcr" },
        { oldId: "6klWznsb0f2bNg3T", name: "Void Domain", pageId: "xLxrtbsj4acqgsyC" },
        { oldId: "8ITGLquhimrr9CNv", name: "Indulgence Domain", pageId: "GiuzDTtkQAgtGW6n" },
        { oldId: "8pPvbTMZLIsvCwQk", name: "Darkness Domain", pageId: "CM9ZqWwl7myKn2X1" },
        { oldId: "9blxcDLIRPWenK5f", name: "Plague Domain", pageId: "hGoWOjdsUz16oJUm" },
        { oldId: "9tsJg13xeJLGzzGV", name: "Undeath Domain", pageId: "RIlgBuWGfHC1rzYu" },
        { oldId: "AaY3BmDItGry4oac", name: "Decay Domain", pageId: "cAxBEZsej32riaY5" },
        { oldId: "B40VxP6oZ0mIR4PS", name: "Fate Domain", pageId: "EC2eB0JglDG5j1gT" },
        { oldId: "BlovCvjhk4Ag07w2", name: "Dreams Domain", pageId: "0wCEUwABKPdKPj8e" },
        { oldId: "FJ9D4qpeRhJvjHai", name: "Star Domain", pageId: "6bDpXy7pQdGrd2og" },
        { oldId: "HYe7Yv1fYUANVVI3", name: "Death Domain", pageId: "798PFdS8FmefcOl0" },
        { oldId: "HpZ4NQIqBRcFihyE", name: "Wealth Domain", pageId: "mJBp4KIszuqrmnp5" },
        { oldId: "J7K7kHoIE69558Su", name: "Freedom Domain", pageId: "5MjSsuKOLBoiL8FB" },
        { oldId: "KXFxeEyD6MmJ3a6V", name: "Naga Domain", pageId: "QzsUe3Rt3SifTQvb" },
        { oldId: "KzuJAIWdjwoPjHkc", name: "Secrecy Domain", pageId: "S1gyomjojgtCdxc3" },
        { oldId: "M7koZH0zimcMgRDb", name: "Destruction Domain", pageId: "AOQZjqgfafqqtHOB" },
        { oldId: "MRHDhBQvgJhDZ1zq", name: "Cities Domain", pageId: "QSk78hQR3zskMlq2" },
        { oldId: "MktBsoHR9HsKrbbr", name: "Zeal Domain", pageId: "DI3MYGIK8iEycanU" },
        { oldId: "NA4v0iwIPgkde8DP", name: "Ambition Domain", pageId: "yaMJsfYZmWJLqbFE" },
        { oldId: "NEI4MDBGNjEtOEIy", name: "Introspection Domain", pageId: "qjnUXickBOBDBu2N" },
        { oldId: "O1qeC0mIufSf3wv5", name: "Passion Domain", pageId: "ajCEExOaxuB4C1tY" },
        { oldId: "OsM8NfP408uB6yTi", name: "Wyrmkin Domain", pageId: "nuywscaiVGXLQpZ1" },
        { oldId: "PrFvU65ewfst69Mp", name: "Water Domain", pageId: "U8WVR6EDfmUaMCbu" },
        { oldId: "TpFgfwcWrfT8zVMP", name: "Pain Domain", pageId: "FtW1gtbHgO0KofPl" },
        { oldId: "WrmaTmOHojfhiENF", name: "Truth Domain", pageId: "lgsJz7mZ1OTe340e" },
        { oldId: "X7MkBRJGUIp91k6f", name: "Sorrow Domain", pageId: "5TqEbLR9QT3gJGe3" },
        { oldId: "Xs6XznYHOZyQ0hJl", name: "Tyranny Domain", pageId: "T0JHj79aGphlZ4Mt" },
        { oldId: "Y2kOBQydrsSqGCyn", name: "Magic Domain", pageId: "DS95vr2zmTsjsMhU" },
        { oldId: "YQ6IT8DgEpqvOREx", name: "Might Domain", pageId: "MOVMHZU1SfkhNN1K" },
        { oldId: "ZAx1RUB376BjNdlF", name: "Repose Domain", pageId: "CbsAiY68e8n5vVVN" },
        { oldId: "Ze2hoTyOQHbaQ6jD", name: "Air Domain", pageId: "T2y0vuYibZCL7CH0" },
        { oldId: "ZyFTUCbA0zYrzynD", name: "Creation Domain", pageId: "ydbCjJ9PPmRzZhDN" },
        { oldId: "a0fe0kFowMMwUFZa", name: "Nightmares Domain", pageId: "R20JXF43vU5RQyUj" },
        { oldId: "c9odhpRoKId5dXmn", name: "Perfection Domain", pageId: "Czi3XXuNOSE7ISpd" },
        { oldId: "dnljU1twPjH4KFgO", name: "Swarm Domain", pageId: "rd0jQwvTK4jpv95o" },
        { oldId: "fVfFKKvGocG2JM5q", name: "Toil Domain", pageId: "EQfZepZX6rxxBRqG" },
        { oldId: "fqr2OnTww3bAq0ae", name: "Sun Domain", pageId: "CkBvj5y1lAm1jnsc" },
        { oldId: "giUsAWI9NbpdeUzl", name: "Knowledge Domain", pageId: "0GwpYEjCHWyfQvgg" },
        { oldId: "i4UU3qCjIMwejIQF", name: "Delirium Domain", pageId: "tuThzOCvMLbRVba8" },
        { oldId: "jWmGQxJvKh5y5zfB", name: "Protection Domain", pageId: "Dx47K8wpx8KZUa9S" },
        { oldId: "l2EFJssJKu7rG77m", name: "Luck Domain", pageId: "L11XsA5G89xVKlDw" },
        { oldId: "mBvjWSvg7UYdS9TL", name: "Moon Domain", pageId: "Y3DFBCWiM9GBIlfl" },
        { oldId: "p5Q5RGl1lKgs5DZZ", name: "Soul Domain", pageId: "rtobUemb6vF2Yu3Y" },
        { oldId: "rIDXRIdb9m2E3qC6", name: "Earth Domain", pageId: "zkiLWWYzzqoxmN2J" },
        { oldId: "rIZ7OoG8c4Cct42M", name: "Vigil Domain", pageId: "StXN6IHR6evRaeXF" },
        { oldId: "udASTZy5jJWFCt5w", name: "Time Domain", pageId: "3P0NWwP3s7bIiidH" },
        { oldId: "unN0otycQZanf3va", name: "Duty Domain", pageId: "uGQKjk2w4whzomky" },
        { oldId: "uy8GUGIOmEUNqIhH", name: "Trickery Domain", pageId: "xJtbGqoz3BcCjUik" },
        { oldId: "v4SDXgCuPdZqhMeL", name: "Fire Domain", pageId: "egSErNozlL3HRK1y" },
        { oldId: "wCPGej4ZwdKCNtym", name: "Change Domain", pageId: "7xrNAgAnBqBgE3yM" },
        { oldId: "wPtGuF1bh4wvKE6Q", name: "Confidence Domain", pageId: "flmxRzGxN2rRNyxZ" },
        { oldId: "xYx8UD0JnFyBHGhJ", name: "Nature Domain", pageId: "wBhgIgt47v9uspp3" },
        { oldId: "y3TTKFLPbP09HZUW", name: "Cold Domain", pageId: "jq9O1tl76g2AzLOh" },
        { oldId: "ywn4ODaUt382Z3Nz", name: "Lightning Domain", pageId: "Kca7UPuMm44tOo9n" },
        { oldId: "zec5N7EnDJANGHmy", name: "Dust Domain", pageId: "6qTjtFWaBO5b60zJ" },
    ];
}
