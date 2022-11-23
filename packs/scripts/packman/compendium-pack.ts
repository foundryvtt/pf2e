import * as fs from "fs";
import * as path from "path";
import { isObject, setHasElement, sluggify, tupleHasValue } from "@util";
import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { ActorSourcePF2e } from "@actor/data";
import { RuleElementSource } from "@module/rules";
import { FEAT_TYPES } from "@item/feat/values";
import { SIZES } from "@module/data";

export interface PackMetadata {
    system: string;
    name: string;
    path: string;
    type: string;
}

export const PackError = (message: string) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

/** A rule element, possibly an Aura, ChoiceSet, GrantItem */
export interface REMaybeWithUUIDs extends RuleElementSource {
    effects?: unknown[];
    choices?: Record<string, string | { value?: string }>;
    uuid?: unknown;
}

type CompendiumSource = CompendiumDocument["data"]["_source"];
export function isActorSource(docSource: CompendiumSource): docSource is ActorSourcePF2e {
    return (
        "system" in docSource && isObject(docSource.system) && "items" in docSource && Array.isArray(docSource.items)
    );
}

export function isItemSource(docSource: CompendiumSource): docSource is ItemSourcePF2e {
    return (
        "system" in docSource &&
        "type" in docSource &&
        !("text" in docSource) &&
        isObject(docSource.system) &&
        !isActorSource(docSource)
    );
}

export class CompendiumPack {
    packId: string;
    packDir: string;
    documentType: string;
    systemId: string;
    data: CompendiumSource[];

    static outDir = path.resolve(process.cwd(), "static/packs");
    private static namesToIds = new Map<string, Map<string, string>>();
    private static packsMetadata = JSON.parse(fs.readFileSync("system.json", "utf-8")).packs as PackMetadata[];

    static LINK_PATTERNS = {
        world: /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]{16}\]|@UUID\[(?:Item|JournalEntry|Actor)/g,
        compendium: /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<docName>[^\]]+)\]\{?/g,
        uuid: /@UUID\[Compendium\.pf2e\.(?<packName>[^.]+)\.(?<docName>[^\]]+)\]\{?/g,
    };

    constructor(packDir: string, parsedData: unknown[]) {
        const metadata = CompendiumPack.packsMetadata.find(
            (pack) => path.basename(pack.path) === path.basename(packDir)
        );
        if (metadata === undefined) {
            throw PackError(`Compendium at ${packDir} has no metadata in the local system.json file.`);
        }
        this.systemId = metadata.system;
        this.packId = metadata.name;
        this.documentType = metadata.type;

        if (!this.isPackData(parsedData)) {
            throw PackError(`Data supplied for ${this.packId} does not resemble Foundry document source data.`);
        }

        this.packDir = packDir;

        CompendiumPack.namesToIds.set(this.packId, new Map());
        const packMap = CompendiumPack.namesToIds.get(this.packId);
        if (!packMap) {
            throw PackError(`Compendium ${this.packId} (${packDir}) was not found.`);
        }

        parsedData.sort((a, b) => {
            if (a._id === b._id) {
                throw PackError(`_id collision in ${this.packId}: ${a._id}`);
            }
            return a._id > b._id ? 1 : -1;
        });

        this.data = parsedData;

        for (const docSource of this.data) {
            // Populate CompendiumPack.namesToIds for later conversion of compendium links
            packMap.set(docSource.name, docSource._id);

            // Check img paths
            if ("img" in docSource && typeof docSource.img === "string") {
                const imgPaths: string[] = [docSource.img ?? ""].concat(
                    isActorSource(docSource) ? docSource.items.map((itemData) => itemData.img ?? "") : []
                );
                const documentName = docSource.name;
                for (const imgPath of imgPaths) {
                    if (imgPath.startsWith("data:image")) {
                        const imgData = imgPath.slice(0, 64);
                        const msg = `${documentName} (${this.packId}) has base64-encoded image data: ${imgData}...`;
                        throw PackError(msg);
                    }

                    const repoImgPath = path.resolve(
                        process.cwd(),
                        "static",
                        decodeURIComponent(imgPath).replace("systems/pf2e/", "")
                    );
                    if (!imgPath.match(/^\/?icons\/svg/) && !fs.existsSync(repoImgPath)) {
                        throw PackError(`${documentName} (${this.packId}) has a broken image link: ${imgPath}`);
                    }
                    if (!(imgPath === "" || imgPath.match(/\.(?:svg|webp)$/))) {
                        throw PackError(`${documentName} (${this.packId}) references a non-WEBP/SVG image: ${imgPath}`);
                    }
                }
            }
            if ("type" in docSource && docSource.type === "script") {
                docSource.ownership ??= { default: 1 };
            }
        }
    }

    static loadJSON(dirPath: string): CompendiumPack {
        if (!dirPath.replace(/\/$/, "").endsWith(".db")) {
            const dirName = path.basename(dirPath);
            throw PackError(`JSON directory (${dirName}) does not end in ".db"`);
        }

        const filenames = fs.readdirSync(dirPath);
        const filePaths = filenames.map((f) => path.resolve(dirPath, f));
        const parsedData = filePaths.map((filePath) => {
            const jsonString = fs.readFileSync(filePath, "utf-8");
            const packSource: CompendiumSource = (() => {
                try {
                    return JSON.parse(jsonString);
                } catch (error) {
                    if (error instanceof Error) {
                        throw PackError(`File ${filePath} could not be parsed: ${error.message}`);
                    }
                }
            })();

            const documentName = packSource?.name;
            if (documentName === undefined) {
                throw PackError(`Document contained in ${filePath} has no name.`);
            }

            const filenameForm = sluggify(documentName).concat(".json");
            if (path.basename(filePath) !== filenameForm) {
                throw PackError(`Filename at ${filePath} does not reflect document name (should be ${filenameForm}).`);
            }

            return packSource;
        });

        const dbFilename = path.basename(dirPath);
        return new CompendiumPack(dbFilename, parsedData);
    }

    private finalize(docSource: CompendiumSource) {
        // Replace all compendium documents linked by name to links by ID
        const stringified = JSON.stringify(docSource);
        const worldItemLink = CompendiumPack.LINK_PATTERNS.world.exec(stringified);
        if (worldItemLink !== null) {
            throw PackError(`${docSource.name} (${this.packId}) has a link to a world item: ${worldItemLink[0]}`);
        }

        docSource.flags ??= {};
        docSource.flags.core = { sourceId: this.sourceIdOf(docSource._id) };
        if (isActorSource(docSource)) {
            this.assertSizeValid(docSource);
            docSource.system.schema = { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION, lastMigration: null };
            for (const item of docSource.items) {
                item.system.schema = { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION, lastMigration: null };
            }
        }

        if (isItemSource(docSource)) {
            docSource.system.slug = sluggify(docSource.name);
            docSource.system.schema = { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION, lastMigration: null };

            if (isPhysicalData(docSource)) {
                docSource.system.equipped = { carryType: "worn" };
            } else if (docSource.type === "feat") {
                const featType = docSource.system.featType.value;
                if (!setHasElement(FEAT_TYPES, featType)) {
                    throw PackError(`${docSource.name} has an unrecognized feat type: ${featType}`);
                }
            }

            // Convert uuids with names in GrantItem REs to well-formedness
            CompendiumPack.convertRuleUUIDs(docSource, { to: "ids", map: CompendiumPack.namesToIds });
        }

        const replace = (match: string, packId: string, docName: string): string => {
            if (match.includes("JournalEntryPage")) return match;

            const namesToIds = CompendiumPack.namesToIds.get(packId);
            const link = match.replace(/\{$/, "");
            if (namesToIds === undefined) {
                throw PackError(`${docSource.name} (${this.packId}) has a bad pack reference: ${link}`);
            }

            const documentId: string | undefined = namesToIds.get(docName);
            if (documentId === undefined) {
                throw PackError(`${docSource.name} (${this.packId}) has broken link to ${docName} (${packId}).`);
            }
            const sourceId = this.sourceIdOf(documentId, { packId });
            const labelBrace = match.endsWith("{") ? "{" : "";

            return `@UUID[${sourceId}]${labelBrace}`;
        };

        return JSON.stringify(docSource)
            .replace(CompendiumPack.LINK_PATTERNS.uuid, replace)
            .replace(CompendiumPack.LINK_PATTERNS.compendium, replace);
    }

    private sourceIdOf(documentId: string, { packId = this.packId } = {}): string {
        return `Compendium.${this.systemId}.${packId}.${documentId}`;
    }

    /** Convert UUIDs in REs to resemble links by name or back again */
    static convertRuleUUIDs(
        source: ItemSourcePF2e,
        { to, map }: { to: "ids" | "names"; map: Map<string, Map<string, string>> }
    ): void {
        const hasUUIDChoices = (choices: object | string | undefined): choices is Record<string, { value: string }> =>
            typeof choices === "object" &&
            Object.values(choices ?? {}).every(
                (c): c is { value: unknown } => typeof c.value === "string" && c.value.startsWith("Compendium.")
            );

        const toNameRef = (uuid: string): string => {
            const parts = uuid.split(".");
            const [packId, docId] = parts.slice(2, 4);
            const docName = map.get(packId)?.get(docId);
            if (docName) {
                return parts.slice(0, 3).concat(docName).join(".");
            } else {
                throw PackError(`Unable to find document name corresponding with ${uuid}`);
            }
        };

        const toIDRef = (uuid: string): string => {
            const match = /(?<=^Compendium\.pf2e\.)([^.]+)\.(.+)$/.exec(uuid);
            const [, packId, docName] = match ?? [null, null, null];
            const docId = map.get(packId ?? "")?.get(docName ?? "");
            if (docName && docId) {
                return uuid.replace(docName, docId);
            } else {
                throw PackError(`Unable to resolve UUID in ${source.name}: ${uuid}`);
            }
        };

        const convert = to === "ids" ? toIDRef : toNameRef;
        const rules: REMaybeWithUUIDs[] = source.system.rules;

        for (const rule of rules) {
            if (rule.key === "Aura" && Array.isArray(rule.effects)) {
                for (const effect of rule.effects) {
                    if (isObject<{ uuid?: unknown }>(effect) && typeof effect.uuid === "string") {
                        effect.uuid = convert(effect.uuid);
                    }
                }
            } else if (rule.key === "GrantItem" && typeof rule.uuid === "string" && !rule.uuid.startsWith("{")) {
                rule.uuid = convert(rule.uuid);
            } else if (rule.key === "ChoiceSet" && hasUUIDChoices(rule.choices)) {
                for (const [key, choice] of Object.entries(rule.choices)) {
                    rule.choices[key].value = convert(choice.value);
                }
            }
        }
    }

    save(): number {
        fs.writeFileSync(
            path.resolve(CompendiumPack.outDir, this.packDir),
            this.data
                .map((datum) => this.finalize(datum))
                .join("\n")
                .concat("\n")
        );
        console.log(`Pack "${this.packId}" with ${this.data.length} entries built successfully.`);

        return this.data.length;
    }

    private isDocumentSource(maybeDocSource: unknown): maybeDocSource is CompendiumSource {
        if (!isObject(maybeDocSource)) return false;
        const checks = Object.entries({
            name: (data: { name?: unknown }) => typeof data.name === "string",
            permission: (data: { permission?: { default: unknown } }) =>
                !data.permission ||
                (typeof data.permission === "object" &&
                    data.permission !== null &&
                    Object.keys(data.permission).length === 1 &&
                    Number.isInteger(data.permission.default)),
        });

        const failedChecks = checks
            .map(([key, check]) => (check(maybeDocSource) ? null : key))
            .filter((key) => key !== null);

        if (failedChecks.length > 0) {
            throw PackError(
                `Document source in (${this.packId}) has invalid or missing keys: ${failedChecks.join(", ")}`
            );
        }

        return true;
    }

    private isPackData(packData: unknown[]): packData is CompendiumSource[] {
        return packData.every((maybeDocSource: unknown) => this.isDocumentSource(maybeDocSource));
    }

    private assertSizeValid(source: ActorSourcePF2e | ItemSourcePF2e): void {
        if (source.type === "npc" || source.type === "vehicle") {
            if (!tupleHasValue(SIZES, source.system.traits.size.value)) {
                throw PackError(`Actor size on ${source.name} (${source._id}) is invalid.`);
            }
        }
    }
}
