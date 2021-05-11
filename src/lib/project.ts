/**
 * @File   : project.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 10/28/2019, 5:28:51 PM
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { BuildInfo, CompilerEnv } from './compiler/compiler';
import { File, findFiles } from './files';

interface Addon {
    name: string;
    folder: string;
    files: File[];
}

interface Localization {
    lang: string;
    file: string;
}

interface BuildMap {
    [key: string]: BuildInfo | string;
}

interface WowPackage {
    name: string;
    // eslint-disable-next-line camelcase
    curse_id?: number;
    // eslint-disable-next-line camelcase
    old_version_style: boolean;
    builds?: BuildMap;
    localizations?: any;
}

export class Project implements Addon {
    private _name: string;
    private _version: string;
    private _curseId: number;
    private _folder: string;
    private _addons: Addon[] = [];
    private _localizations: Localization[] = [];
    private _files: File[];
    private _buildEnvs = new Map<string, CompilerEnv>();

    constructor() {}

    get name() {
        return this._name;
    }

    get folder() {
        return this._folder;
    }

    get version() {
        return this._version;
    }

    get curseId() {
        return this._curseId;
    }

    get addons() {
        return this._addons;
    }

    get localizations() {
        return this._localizations;
    }

    get files() {
        return this._files;
    }

    get buildEnvs() {
        return this._buildEnvs;
    }

    genFileName(buildId: string) {
        if (!buildId || buildId === 'none') {
            return `${this.name}-${this.version}.zip`;
        } else {
            return `${this.name}-${buildId}-${this.version}.zip`;
        }
    }

    private parseWowVersion(t: string) {
        const mm = t.match(/^(\d*)(\d\d)(\d\d)$/);
        if (mm) {
            return `${Number.parseInt(mm[1])}.${Number.parseInt(mm[2])}.${Number.parseInt(mm[3])}`;
        }
        return '';
    }

    private parseOldVersionStyle(version: string) {
        const m = version.match(/(\d+)\.(\d+)\.(\d+)-?(\d*)/);
        if (!m) {
            throw Error('version error');
        }

        const major = Number.parseInt(m[1]);
        const minor = Number.parseInt(m[2]);
        const patch = Number.parseInt(m[3]);
        const prerelease = Number.parseInt(m[4]);

        version = `${major * 10000 + minor}.${patch.toString().padStart(2, '0')}`;

        if (prerelease >= 0) {
            version = `${version}-${prerelease}`;
        }
        return version;
    }

    async init() {
        const pkg = await fs.readJson('./package.json');

        if (!pkg.wow || !pkg.wow.name) {
            throw Error('not a wow curse project');
        }

        const p: WowPackage = pkg.wow;

        this._folder = path.resolve('./');
        this._name = p.name;
        this._curseId = p.curse_id || 0;

        if (!p.old_version_style) {
            this._version = pkg.version;
        } else {
            this._version = this.parseOldVersionStyle(pkg.version);
        }

        this._files = await findFiles(this._folder, this._name);

        if (p.builds) {
            for (const [buildId, info] of Object.entries(p.builds)) {
                const buildInfo = typeof info === 'string' ? { interface: info } : info;

                this._buildEnvs.set(buildId, {
                    buildId,
                    buildInfo,
                    version: this._version,
                    wowVersion: this.parseWowVersion(buildInfo.interface),
                });
            }
        }

        if (this._buildEnvs.size === 0) {
            const toc = await fs.readFile(`./${pkg.wow.name}.toc`, { encoding: 'utf-8' });
            const m = toc.match(/##\s*Interface\s*:\s*(\d+)/);
            if (m) {
                this._buildEnvs.set('none', {
                    buildId: 'none',
                    buildInfo: { interface: m[1] },
                    version: this._version,
                    wowVersion: this.parseWowVersion(m[1]),
                });
            }
        }

        this._addons.push(this);

        if (pkg.wow.addons) {
            for (const [name, folder] of Object.entries(pkg.wow.addons) as [string, string][]) {
                this._addons.push({
                    name: name,
                    folder: folder,
                    files: await findFiles(folder, name),
                });
            }
        }

        if (pkg.wow.localizations) {
            for (const [key, v] of Object.entries(pkg.wow.localizations)) {
                this._localizations.push({
                    lang: key,
                    file: v as string,
                });
            }
        }
    }
}
