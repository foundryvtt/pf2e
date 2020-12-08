import * as path from "path";
import * as fs from "fs";

interface ObjectWithKeys {
  [key: string]: unknown;
}
type NotUndefined<T> = T extends undefined ? never: T;
interface ObjectWithDefinedValues extends ObjectWithKeys {
  [key: string]: NotUndefined<string | ObjectWithKeys>;
}

interface PackEntityData extends ObjectWithDefinedValues {
  _id: string;
  name: string;
  type?: string;
  data: ObjectWithDefinedValues;
  flags: { [key: string]: ObjectWithDefinedValues };
  permission: { default: 0 };
}

class Compendium {
  name: string;
  packDir: string;
  data: PackEntityData[];

  static outDir = path.resolve(process.cwd(), "static/packs");
  static _namesToIds = new Map<string, Map<string, string>>();
  static _systemPackData = JSON.parse(
    fs.readFileSync("system.json", "utf-8")
  ).packs as { name: string, path: string }[];

  constructor(packDir: string, jsonData: PackEntityData[]) {
    this.packDir = packDir;
    const packName = Compendium._systemPackData.find(
      (pack) => path.basename(pack.path) === path.basename(packDir)
    ).name;
    Compendium._namesToIds.set(packName, new Map());
    const packMap = Compendium._namesToIds.get(packName);
    for (const jsonDatum of jsonData) {
      packMap.set(jsonDatum.name, jsonDatum._id);
    }

    if (this._isPackData(jsonData, packName)) {
      this.name = packName;

      jsonData.sort((a, b) => {
        if (a._id === b._id) {
          throw Error(`_id collision in ${packName}: ${a._id}`)
        }
        return a._id > b._id ? 1 : -1;
      });

      this.data = jsonData;

    } else {
      throw Error(`Data supplied for ${packName} does not resemble Foundry entity data.`);
    }
  }

  _finalize(entryData: PackEntityData) {
    // Replace all compendium entities linked by name to links by ID
    return JSON.stringify(entryData).replace(
      /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<entityName>[^\]]+)\]/g,
      (_match, packName: string, entityName: string) => {
        const entityId: string | undefined = Compendium._namesToIds.get(packName).get(entityName);
        if (entityId === undefined ) {
          console.warn(`Couldn't find ${entityName} in ${packName}.`);
          return `@Compendium[pf2e.${packName}.${entityName}]`;
        } else {
          return `@Compendium[pf2e.${packName}.${entityId}]`;
        }
      }
    );
  }

  async save(): Promise<number> {
    await fs.promises.writeFile(
      path.resolve(Compendium.outDir, this.packDir),
      this.data.map(this._finalize).join("\n") + "\n"
    );

    console.log(`Pack "${this.name}" with ${this.data.length} entries built successfully.`);
    return this.data.length;
  }

  _isEntityData(entityData: any, packName: string): entityData is PackEntityData {
    const checks = Object.entries({
      name: (data: any) => typeof data.name === "string",
      // type: (data: any) => typeof data.type === "string",
      flags: (data: any) => typeof data.flags === "object",
      permission: (data: any) =>
        data.permission !== undefined && JSON.stringify(data.permission) === '{"default":0}'
    });

    const failedChecks = checks.map(
      ([key, check]) => check(entityData) ? null : key
    ).filter((key) => key !== null);

    if (failedChecks.length > 0) {
      console.warn(
        `${entityData.name} (${packName}) has invalid or missing keys: ` +
          `${failedChecks.join(", ")}`
      );

      return true;
      // return false;
    }

    return true;
  }

  _isPackData(packData: any, packName: string): packData is PackEntityData[] {
    return packData.every((entityData: any) => this._isEntityData(entityData, packName));
  }

}

export async function buildPacks(): Promise<void> {
  const packsDataPath = path.resolve(process.cwd(), "packs/data");

  const packDirs = await fs.promises.readdir(packsDataPath);

  // ¡Aviso!
  // Loads all packs into memory for the sake of making all entity name/id mappings available
  const packs = await Promise.all(packDirs.map(async (packDir) => {
    console.log(`Collecting data from ${packDir}.`);
    const filenames = await fs.promises.readdir(path.resolve(packsDataPath, packDir));
    const filePaths = filenames.map((filename) => path.resolve(packsDataPath, packDir, filename));
    const jsonData = await Promise.all(filePaths.map(async (filePath) => {
      const jsonString = await fs.promises.readFile(filePath, "utf-8");
      try {
        return JSON.parse(jsonString) as Promise<PackEntityData>;
      } catch (error) {
        throw Error(`File ${filePath} could not be parsed: ${error.message}`);
      }
    }));

    return new Compendium(packDir, jsonData);
  }));

  const entityCounts = await Promise.all(packs.map(async (pack) => pack.save()));
  const total = entityCounts.reduce(
    (runningTotal, entityCount) => runningTotal + entityCount, 0
  );

  if (entityCounts.length > 0) {
    console.log(`Created ${entityCounts.length} packs with ${total} entities.`);
  } else {
    console.warn('No data available to build packs.');
  }
}

buildPacks();
