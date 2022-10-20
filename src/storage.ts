import checkDiskSpace from "check-disk-space"
import { MAX_SIZE, SAVE_DIR } from "./util/env"
import { getFolderSize } from "./util/fs"
import fs from "fs"

export class StorageManager {
    private static diskSpaceLeft = 0
    private static folderSize = Infinity

    static async initialize() {
        console.log("⏱ Initializing Storage Manager...")
        if(!fs.existsSync(SAVE_DIR))
            fs.mkdirSync(SAVE_DIR, { recursive: true })

        this.diskSpaceLeft = (await checkDiskSpace(SAVE_DIR)).free
        const res = await getFolderSize(SAVE_DIR)
        if(typeof res !== "number") {
            console.error("Could not get folder size", res)
            process.exit(-1)
        }

        this.folderSize = res
        console.log("FolderSize is", res, "DiskSpace is", this.diskSpaceLeft)
    }

    static getSpaceLeft() {
        return Math.min(MAX_SIZE - this.folderSize, this.diskSpaceLeft)
    }

    static addFile(size: number) {
        this.folderSize += size
        this.diskSpaceLeft -= size
        console.log("Size added. Folder size is now", this.folderSize, "Disk space", this.diskSpaceLeft)
    }
}
