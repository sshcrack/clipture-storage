import express, { Request, Response } from "express"
import fs from "fs"
import fsProm from "fs/promises"
import helmet from "helmet"
import path from "path"
import { StorageManager } from "./storage"
import { PORT, SAVE_DIR } from './util/env'
import { getHex, idToPath } from './util/fs'
import { getThumbnail } from './util/thumb'
import { checkSecret, validateId } from "./validators/check"
import { Validator } from "./validators/validate"

const app = express()

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}))

const getHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  if (!checkSecret(req, res))
    return null

  if (!validateId(id))
    return res.status(400).json({ error: "Invalid id" })

  const videoPath = idToPath(id)
  const exists = await fsProm.stat(videoPath).then(() => true).catch(() => false)
  if (!exists)
    return res.status(404).json({ error: "A clip with that id does not exist on this server." })


  return res.sendFile(videoPath)
}

app.get("/thumbnail/:id", async (req, res) => {
  const { id } = req.params
  if (!checkSecret(req, res))
    return null

  if (!validateId(id))
    return res.status(400).json({ error: "Invalid id" })

  const stream = await getThumbnail(id)
    .catch(() => {
      res.status(500).json({ error: "Could not generate thumbnail." })
      return false
    })

  if (!stream || typeof stream === "boolean")
    return


  stream.pipe(res)
  await new Promise<void>(resolve => {
    stream.on("end", () => resolve())
    stream.on("error", () => resolve())
  });
})

app.get("/get/:id", getHandler)
app.get("/api/clip/get/cdn/:server/:id", getHandler)

app.get("/info", async (req, res) => {
  console.log("Checking secret...")
  if (!checkSecret(req, res))
    return

  console.log("Getting size left...")
  const sizeLeft = StorageManager.getSpaceLeft()
  console.log("Size left", sizeLeft)
  if (!sizeLeft)
    return res.status(400).json({ error: "Could not get size left" })

  return res.json({ sizeLeft })
})

app.get("/delete", async (req, res) => {
  if (!checkSecret(req, res))
    return

  const id = req.query.id
  if (typeof id !== "string")
    return res.status(400).json({ error: "Id has to be a string" })

  const file = path.join(SAVE_DIR, id + ".mp4")
  await fsProm.unlink(file)
    .then(() => res.json({ success: true }))
    .catch(() => res.status(404).json({ error: "File not found" }))
})

app.post("/upload", async (req, res) => {
  if (!checkSecret(req, res))
    return

  const sizeStr = req.query.size
  const id = req.query.id
  if (!sizeStr || typeof sizeStr !== "string")
    return res.status(400).json({ error: "Size has to be given." })

  if (!id || typeof id !== "string" || id?.includes(".."))
    return res.status(400).json({ error: "Id has to be a string" })

  if (isNaN(sizeStr as any))
    return res.status(400).json({ error: "Size has to be a number" })


  const size = parseInt(sizeStr)
  const sizeLeft = StorageManager.getSpaceLeft()
  if (typeof sizeLeft !== "number")
    return res.status(500).json({ error: "Could not get space left." })

  if (sizeLeft < size)
    return res.status(500).json({ error: "Not enough disk space." })

  const file = path.join(SAVE_DIR, id + ".mp4")
  const writeStream = fs.createWriteStream(file)
  let currSize = 0
  let aborted = false

  await new Promise<void>(resolve => {
    req.on("data", chunk => {
      if (aborted)
        return

      currSize += chunk.length
      writeStream.write(chunk)

      if (currSize > size) {
        aborted = true
        writeStream.close()
        console.log("Deleting file", file)
        fs.promises.unlink(file)
        console.log("Payload is too large", currSize, size)
        res.status(500).json({ error: `Payload too large. (${currSize} / ${size})` })
        resolve()
      }
    })

    req.on("end", () => {
      if (aborted)
        return

      writeStream.close()
      if (currSize !== size) {
        aborted = true
        fs.promises.unlink(file)
        console.log("Invalid size was given.")
        res.status(400).json({ error: `Invalid size given, size is ${size} but received ${currSize}` })
      }

      console.log("Done.")
      resolve()
    })
  })

  if (aborted)
    return

  const validateRes = await Validator.video(file)
  if (!validateRes.valid) {
    fs.promises.unlink(file)
    return res.status(400).json({ error: validateRes.reason })
  }

  const hex = await getHex(file)

  StorageManager.addFile(size)
  return res.json({ uploaded: currSize, success: true, hex })
})

app.get("/set", (req, res) => {
  if (!checkSecret(req, res))
    return

  const { min, max } = req.query
  if (typeof min !== "string" || typeof max !== "string" || isNaN(min as any) || isNaN(max as any))
    return res.json({ error: "Min and max in query have to be a number" })

  const minInt = parseFloat(min)
  const maxInt = parseFloat(max)

  if (maxInt < minInt)
    return res.json({ error: "Max has to be greater than min." })

  Validator.setVars(minInt, maxInt)
  res.json({ success: true })
})


app.use((_, res) => {
  res.status(404).json({ error: "404 not found." })
})


const run = async () => {
  await StorageManager.initialize()
  await Validator.initialize()
  app.listen(PORT, () => console.log(`⚡ Listening on port ${PORT}`))
}
run()
