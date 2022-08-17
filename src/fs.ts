import fastFolderSize from "fast-folder-size";
import { readdir, stat } from "fs/promises";
import path from "path";
import os from "os"
import { spawn, spawnSync } from "child_process"
import { promisify } from "util";


export const getFolderSize = promisify(fastFolderSize)
export async function dirSize(directory: string) {
    const files = await readdir(directory);
    const stats = files.map(file => stat(path.join(directory, file)));

    return (await Promise.all(stats)).reduce((accumulator, { size }) => accumulator + size, 0);
}


const findCmd = os.type() === "Windows_NT" ? "where" : "which"
export function commandExists(command: string) {
    return new Promise<boolean>(resolve => {
        spawn(findCmd, [command]).on("exit", c => resolve(c === 0))
    })
}

export function commandExistsSync(command: string) {
    return spawnSync(findCmd, [ command]).status === 0
}