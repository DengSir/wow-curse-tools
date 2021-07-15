/**
 * @File   : index.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 5/17/2021, 2:57:51 PM
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { gEnv } from '../env';

export function isRemoveCondition(text: string) {
    const builds = text.split(',').filter((x) => x !== '');
    if (!builds || builds.length === 0) {
        return false;
    }

    const not = builds.filter((x) => x.startsWith('non-')).map((x) => x.substr(4));
    if (not.length > 0) {
        if (not.length > 1 || not.length !== builds.length) {
            throw Error('xml build error');
        }
        return gEnv.env.buildId === not[0];
    }

    const or = builds.filter((x) => !x.startsWith('non-'));
    if (or.length === 0) {
        throw Error('bang');
    }

    if (or.includes(gEnv.env.buildId)) {
        return false;
    }
    return true;
}

export function isNeedRemoveNode(node: Element) {
    const build = node.getAttribute('build');
    return build ? isRemoveCondition(build) : false;
}

export function isListFile(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.xml' || ext === '.toc';
}

export async function readFile(filePath: string) {
    return (await fs.readFile(filePath, { encoding: 'utf-8' })).replace(/^\uFEFF/g, '');
}

export async function writeFile(filePath: string, data: string) {
    if ((await fs.pathExists(filePath)) && (await readFile(filePath)) === data) {
        return false;
    }
    await fs.writeFile(filePath, data);
    return true;
}

export async function copyFile(filePath: string, targetPath: string) {
    if (
        (await fs.pathExists(filePath)) &&
        (await fs.pathExists(targetPath)) &&
        Buffer.compare(await fs.readFile(targetPath), await fs.readFile(filePath)) === 0
    ) {
        return false;
    }
    await fs.copyFile(filePath, targetPath);
    return true;
}

export async function readChangeLog(file: string, version: string) {
    if (!(await fs.pathExists(file))) {
        return;
    }

    const data = await readFile(file);
    const lines: string[] = [];

    for (const [line] of data.matchAll(/[^\r\n]+/g)) {
        const m = line.match(/^## \[(\d+\.\d+\.\d+)\]/);
        if (m) {
            if (m[1] !== version) {
                break;
            }
        } else {
            lines.push(line);
        }
    }
    return lines.join('\n');
}
