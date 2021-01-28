import * as fs from 'fs';
import * as path from 'path';

export interface PackMetadata {
    system: string;
    name: string;
    path: string;
    entity: string;
}

export interface PackEntityData {
    _id: string;
    name: string;
    type?: string;
    img?: string;
    slug?: string;
    data: Record<string, unknown>;
    flags: Record<string, unknown>;
    permission: { default: 0 };
    items?: { img: string }[];
    token?: { img: string };
}

export const PackError = (message: string) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

export class CompendiumPack {
    name: string;
    packDir: string;
    entityClass: string;
    systemId: string;
    data: PackEntityData[];

    static outDir = path.resolve(process.cwd(), 'static/packs');
    static _namesToIds = new Map<string, Map<string, string>>();
    static _systemPackData = JSON.parse(fs.readFileSync('system.json', 'utf-8')).packs as PackMetadata[];
    static _worldItemLinkPattern = new RegExp(/@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]+\]/);

    constructor(packDir: string, parsedData: unknown[]) {
        if (this.isPackData(parsedData)) {
            this.packDir = packDir;
            const compendium = CompendiumPack._systemPackData.find(
                (pack) => path.basename(pack.path) === path.basename(packDir),
            );
            if (compendium === undefined) {
                throw PackError(`Compendium at ${packDir} has no name in the local system.json file.`);
            }
            this.systemId = compendium.system;
            this.name = compendium.name;
            this.entityClass = compendium.entity;

            CompendiumPack._namesToIds.set(this.name, new Map());
            const packMap = CompendiumPack._namesToIds.get(this.name);
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

            for (const entityData of this.data) {
                // Populate CompendiumPack._namesToIds for later conversion of compendium links
                packMap.set(entityData.name, entityData._id);

                // Check img paths
                if (typeof entityData.img === 'string') {
                    const imgPaths = [entityData.img ?? ''].concat(
                        Array.isArray(entityData.items) ? entityData.items.map((itemData) => itemData.img ?? '') : [],
                    );
                    const entityName = entityData.name;
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
                    }
                }
            }
        } else {
            throw PackError(`Data supplied for ${this.name} does not resemble Foundry entity data.`);
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
            const entityData: PackEntityData = (() => {
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

            const filenameForm = entityName
                .toLowerCase()
                .replace(/[^a-z0-9]/gi, ' ')
                .trim()
                .replace(/\s+/g, '-')
                .replace(/-{2,}/g, '-')
                .concat('.json');

            if (path.basename(filePath) !== filenameForm) {
                throw PackError(`Filename at ${filePath} does not reflect entity name (should be ${filenameForm}).`);
            }

            return entityData;
        });

        const dbFilename = path.basename(dirPath);
        return new CompendiumPack(dbFilename, parsedData);
    }

    private finalize(entityData: PackEntityData) {
        // Replace all compendium entities linked by name to links by ID
        const stringified = JSON.stringify(entityData);
        const worldItemLink = CompendiumPack._worldItemLinkPattern.exec(stringified);
        if (worldItemLink !== null) {
            throw PackError(`${entityData.name} (${this.name}) has a link to a world item: ${worldItemLink[0]}`);
        }

        entityData.flags.core = { sourceId: this.sourceIdOf(entityData._id) };
        if (this.entityClass === 'Item') {
            entityData.data.slug = this.sluggify(entityData.name);
        }

        return JSON.stringify(entityData).replace(
            /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<entityName>[^\]]+)\]\{?/g,
            (match, packName: string, entityName: string) => {
                const namesToIds = CompendiumPack._namesToIds.get(packName);
                const link = match.replace(/\{$/, '');
                if (namesToIds === undefined) {
                    throw PackError(`${entityData.name} (${this.name}) has a bad pack reference: ${link}`);
                }
                if (!match.endsWith('{')) {
                    throw PackError(`${entityData.name} (${this.name}) has a link with no label: ${link}`);
                }

                const entityId: string | undefined = namesToIds.get(entityName);
                if (entityId === undefined) {
                    throw PackError(
                        `${entityData.name} (${this.name}) has broken link to ${entityName} (${packName}).`,
                    );
                }

                return `@Compendium[pf2e.${packName}.${entityId}]{`;
            },
        );
    }

    private sourceIdOf(entityId: string) {
        return `CompendiumPack.${this.systemId}.${this.name}.${entityId}`;
    }

    private sluggify(entityName: string) {
        return entityName
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, ' ')
            .trim()
            .replace(/\s+|-{2,}/g, '-');
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

    private isEntityData(entityData: {}): entityData is PackEntityData {
        const checks = Object.entries({
            name: (data: any) => typeof data.name === 'string',
            // type: (data: any) => typeof data.type === "string",
            flags: (data: any) => typeof data.flags === 'object',
            permission: (data: any) =>
                data.permission !== undefined && JSON.stringify(data.permission) === '{"default":0}',
        });

        const failedChecks = checks
            .map(([key, check]) => (check(entityData) ? null : key))
            .filter((key) => key !== null);

        if (failedChecks.length > 0) {
            throw PackError(`entityData in (${this.name}) has invalid or missing keys: ${failedChecks.join(', ')}`);
        }

        return true;
    }

    private isPackData(packData: unknown[]): packData is PackEntityData[] {
        return packData.every((entityData: any) => this.isEntityData(entityData));
    }
}
