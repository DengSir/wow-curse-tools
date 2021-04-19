/**
 * @File   : index.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 10/29/2019, 3:30:57 PM
 */
import * as path from 'path';
import * as fs from 'fs-extra';
import { CodeFilesFinder } from './code';
import { ResFilesFinder } from './res';

export interface File {
    file: string;
    relative: string;
    noCompile: boolean;
}

export async function findFiles(folder: string, name: string): Promise<File[]> {
    const files = [
        ...(await new CodeFilesFinder().findFiles(path.resolve(folder, name + '.toc'))),
        ...(await new ResFilesFinder().findFiles(folder)),
    ];

    const folders = (
        await Promise.all(
            Array.from(new Set(files.map((file) => path.dirname(file)))).map(async (folder) => {
                return {
                    folder,
                    noCompile: await fs.pathExists(path.resolve(folder, '.nocompile')),
                };
            })
        )
    )
        .filter((item) => item.noCompile)
        .map((item) => item.folder);

    const ret = files.map((file) => ({
        file,
        relative: path.join(name, path.relative(folder, file)),
        noCompile: folders.map((folder) => path.relative(folder, file).startsWith('..')).filter((s) => !s).length > 0,
    }));
    return ret;
}
