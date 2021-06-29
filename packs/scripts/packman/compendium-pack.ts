import * as fs from 'fs';
import * as path from 'path';
import { sluggify } from '@module/utils';
import { ItemSourcePF2e } from '@item/data';
import { isPhysicalData } from '@item/data/helpers';

export interface PackMetadata {
    system: string;
    name: string;
    path: string;
    entity: string;
}

export const PackError = (message: string) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

type CompendiumSource = CompendiumDocument['data']['_source'];
const isActorSource = (docSource: CompendiumSource): docSource is foundry.data.ActorSource => {
    return (
        'effects' in docSource &&
        Array.isArray(docSource.effects) &&
        'items' in docSource &&
        Array.isArray(docSource.items)
    );
};

const isItemSource = (docSource: CompendiumSource): docSource is ItemSourcePF2e => {
    return 'effects' in docSource && Array.isArray(docSource.effects) && 'description' in docSource.data;
};

export class CompendiumPack {
    name: string;
    packDir: string;
    entityClass: string;
    systemId: string;
    data: CompendiumSource[];

    static outDir = path.resolve(process.cwd(), 'static/packs');
    private static namesToIds = new Map<string, Map<string, string>>();
    private static packsMetadata = JSON.parse(fs.readFileSync('system.json', 'utf-8')).packs as PackMetadata[];
    private static worldItemLinkPattern = new RegExp(
        /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]+\]/,
    );

    constructor(packDir: string, parsedData: unknown[]) {
        const metadata = CompendiumPack.packsMetadata.find(
            (pack) => path.basename(pack.path) === path.basename(packDir),
        );
        if (metadata === undefined) {
            throw PackError(`Compendium at ${packDir} has no metadata in the local system.json file.`);
        }
        this.systemId = metadata.system;
        this.name = metadata.name;
        this.entityClass = metadata.entity;

        if (!this.isPackData(parsedData)) {
            throw PackError(`Data supplied for ${this.name} does not resemble Foundry entity data.`);
        }

        this.packDir = packDir;

        CompendiumPack.namesToIds.set(this.name, new Map());
        const packMap = CompendiumPack.namesToIds.get(this.name);
        if (packMap === undefined) {
            throw PackError(`Compendium ${this.name} (${packDir}) was not found.`);
        }

        parsedData.sort((a, b) => {
            if (a._id === b._id) {
                throw PackError(`_id collision in ${this.name}: ${a._id}`);
            }
            return a._id > b._id ? 1 : -1;
        });

        this.data = parsedData;

        for (const docSource of this.data) {
            // Populate CompendiumPack.namesToIds for later conversion of compendium links
            packMap.set(docSource.name, docSource._id);

            // Check img paths
            if ('img' in docSource && typeof docSource.img === 'string') {
                const imgPaths: string[] = [docSource.img ?? ''].concat(
                    isActorSource(docSource) ? docSource.items.map((itemData) => itemData.img ?? '') : [],
                );
                const entityName = docSource.name;
                for (const imgPath of imgPaths) {
                    if (imgPath.startsWith('data:image')) {
                        const imgData = imgPath.slice(0, 64);
                        const msg = `${entityName} (${this.name}) has base64-encoded image data: ${imgData}...`;
                        throw PackError(msg);
                    }

                    const repoImgPath = path.resolve(
                        process.cwd(),
                        'static',
                        decodeURIComponent(imgPath).replace('systems/pf2e/', ''),
                    );
                    if (!imgPath.match(/^\/?icons\/svg/) && !fs.existsSync(repoImgPath)) {
                        throw PackError(`${entityName} (${this.name}) has a broken image link: ${imgPath}`);
                    }
                    if (!(imgPath == '' || imgPath.match(/\.(?:svg|webp)$/))) {
                        throw PackError(`${entityName} (${this.name}) references a non-WEBP/SVG image: ${imgPath}`);
                    }
                }
            }
            if ('type' in docSource && (docSource.type === 'chat' || docSource.type === 'script')) {
                docSource.permission = { default: 1 };
            }
        }
    }

    static loadJSON(dirPath: string): CompendiumPack {
        if (!dirPath.replace(/\/$/, '').endsWith('.db')) {
            const dirName = path.basename(dirPath);
            throw PackError(`JSON directory (${dirName}) does not end in ".db"`);
        }

        const filenames = fs.readdirSync(dirPath);
        const filePaths = filenames.map((filename) => path.resolve(dirPath, filename));
        const parsedData = filePaths.map((filePath) => {
            const jsonString = fs.readFileSync(filePath, 'utf-8');
            const entityData: CompendiumSource = (() => {
                try {
                    return JSON.parse(jsonString);
                } catch (error) {
                    throw PackError(`File ${filePath} could not be parsed: ${error.message}`);
                }
            })();

            const entityName = entityData?.name;
            if (entityName === undefined) {
                throw PackError(`Entity contained in ${filePath} has no name.`);
            }

            const filenameForm = sluggify(entityName).concat('.json');
            if (path.basename(filePath) !== filenameForm) {
                throw PackError(`Filename at ${filePath} does not reflect entity name (should be ${filenameForm}).`);
            }

            return entityData;
        });

        const dbFilename = path.basename(dirPath);
        return new CompendiumPack(dbFilename, parsedData);
    }

    private finalize(docSource: CompendiumSource) {
        // Replace all compendium entities linked by name to links by ID
        const stringified = JSON.stringify(docSource);
        const worldItemLink = CompendiumPack.worldItemLinkPattern.exec(stringified);
        if (worldItemLink !== null) {
            throw PackError(`${docSource.name} (${this.name}) has a link to a world item: ${worldItemLink[0]}`);
        }

        docSource.flags.core = { sourceId: this.sourceIdOf(docSource._id) };
        if (isItemSource(docSource)) {
            docSource.data.slug = sluggify(docSource.name);

            if (isPhysicalData(docSource)) {
                docSource.data.equipped.value = false;
            }
        }

        return JSON.stringify(docSource).replace(
            /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<entityName>[^\]]+)\]\{?/g,
            (match, packName: string, entityName: string) => {
                const namesToIds = CompendiumPack.namesToIds.get(packName);
                const link = match.replace(/\{$/, '');
                if (namesToIds === undefined) {
                    throw PackError(`${docSource.name} (${this.name}) has a bad pack reference: ${link}`);
                }
                if (!match.endsWith('{')) {
                    throw PackError(`${docSource.name} (${this.name}) has a link with no label: ${link}`);
                }

                const entityId: string | undefined = namesToIds.get(entityName);
                if (entityId === undefined) {
                    throw PackError(`${docSource.name} (${this.name}) has broken link to ${entityName} (${packName}).`);
                }

                return `@Compendium[pf2e.${packName}.${entityId}]{`;
            },
        );
    }

    private sourceIdOf(entityId: string) {
        return `Compendium.${this.systemId}.${this.name}.${entityId}`;
    }

    save(): number {
        fs.writeFileSync(
            path.resolve(CompendiumPack.outDir, this.packDir),
            this.data
                .map((datum) => this.finalize(datum))
                .join('\n')
                .concat('\n'),
        );
        console.log(`Pack "${this.name}" with ${this.data.length} entries built successfully.`);

        return this.data.length;
    }

    private isDocumentSource(entityData: {}): entityData is CompendiumSource {
        const checks = Object.entries({
            name: (data: { name?: unknown }) => typeof data.name === 'string',
            flags: (data: unknown) => typeof data === 'object' && data !== null && 'flags' in data,
            permission: (data: { permission?: { default: unknown } }) =>
                typeof data.permission === 'object' &&
                data.permission !== null &&
                Object.keys(data.permission).length === 1 &&
                Number.isInteger(data.permission.default),
        });

        const failedChecks = checks
            .map(([key, check]) => (check(entityData) ? null : key))
            .filter((key) => key !== null);

        if (failedChecks.length > 0) {
            throw PackError(`entityData in (${this.name}) has invalid or missing keys: ${failedChecks.join(', ')}`);
        }

        return true;
    }

    private isPackData(packData: unknown[]): packData is CompendiumSource[] {
        return packData.every((entityData: any) => this.isDocumentSource(entityData));
    }
}
