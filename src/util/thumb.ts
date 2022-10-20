import fs from "fs"
import { generateThumbnail, lookupThumbnail } from "thumbsupply"
import { SAVE_DIR } from './env'
import { idToPath } from './fs'
import { Logger } from './logger'

const log = Logger.getLogger("Util", "Thumbnail")
export async function getThumbnail(id: string) {
    const options = {
        cacheDir: SAVE_DIR,
        timestamp: "00:00:00"
    }

    const vidPath = idToPath(id)
    let thumbnailFile = await lookupThumbnail(vidPath, { cacheDir: options.cacheDir })
        .catch(() => false)
    if (!thumbnailFile) {
        thumbnailFile = (await generateThumbnail(vidPath, options)
            .catch(e => {
                if (e?.message?.includes("Invalid data found when processing input"))
                    return true

                log.error("Failed to generate thumbnail for", vidPath, e)
                return false
            }))
        log.debug("Saving thumbnail for file", vidPath, thumbnailFile)
    }

    if (!thumbnailFile || typeof thumbnailFile === "boolean")
        throw new Error("Invalid Video File.")

    return fs.createReadStream(thumbnailFile)
}