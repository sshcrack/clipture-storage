import fs from "fs"
import expressionEval from "math-expression-evaluator"

const SECRET = process.env.SECRET as string
const SAVE_DIR = process.env.SAVE_DIR as string
const MAX_SIZE_STR = process.env.MAX_SIZE
const PORT = isNaN(process.env.PORT as any) ? 5400 : parseInt(process.env.PORT as string)

if (!MAX_SIZE_STR) {
    console.error("MAX_SIZE has to be set in bytes. Max size clips can take on disk.")
    process.exit(-1)
}

const MAX_SIZE = expressionEval.eval(MAX_SIZE_STR) as unknown as number
if (typeof MAX_SIZE !== "number") {
    console.error("Invalid math expression for MAX_SIZE in env.")
    process.exit(-1)
}

if (!SECRET) {
    console.log("SECRET has to be set in .env to same as in clipture-server")
    process.exit(-1)
}

if (!SAVE_DIR) {
    console.error("SAVE_DIR has to be set. This is where files are stored.")
    process.exit(-1)
}

if (!fs.existsSync(SAVE_DIR))
    fs.mkdirSync(SAVE_DIR, { recursive: true })

export { SECRET, MAX_SIZE, SAVE_DIR, PORT};
