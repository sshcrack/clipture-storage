import { commandExists } from "../util/fs"


type ValidateReturnVal = {
    valid: true
} | {
    valid: false,
    reason: string
}

export async function getDuration(inputPath: string) {
    const execa = (await eval(`import("execa")`)).execa as typeof import("execa")["execa"]
    const res = await execa("ffprobe", ["-i", inputPath, "-show_format"]).catch(e => {
      console.error("FFprobe failed", e)
      return null
    })
    const numberRes = res
        ?.stdout
        ?.split("\n")
        ?.find(e => e.includes("duration"))
        ?.split("=")
        ?.pop()

    if (!numberRes)
        throw new Error(`Could not get duration with ffprobe with clip ${inputPath}`)
    return parseFloat(numberRes)
}

export class Validator {
    private static min = NaN
    private static max = NaN

    static async initialize() {
        if (!(await commandExists("ffprobe"))) {
            throw new Error("FFprobe has to be in path in order for the storage to work.")
        }
    }

    static setVars(min: number, max: number) {
        if(max < min)
            throw new Error(`Max value (${max}) cannot be smaller than min value ${min}.`)

        this.max = max
        this.min = min
    }

    static async video(file: string): Promise<ValidateReturnVal> {
        if(isNaN(this.max) || isNaN(this.min)) {
            console.error("Max", this.max, "or min", this.min, "not set.")
            return {
                valid: false,
                reason: "Validator has not been initialized."
            }
        }

        console.log("Parsing file", file)
        const { duration, error } = await getDuration(file)
            .then(e => ({ error: null, duration: e }))
            .catch(err => ({ error: err, duration: null }))

        if (error || typeof duration === "undefined" || duration === null) {
            console.error("Error is", error)
            return {
                reason: "Invalid video",
                valid: false
            }
        }

        const valid = this.min < duration && duration < this.max
        if(valid)
            return { valid }

        return {
            valid,
            reason: `Video is too short / too long. (Duration: ${duration}s)`
        }
    }
}

