import { Request, Response } from "express"
import { SECRET } from "./env"

export function checkSecret(req: Request, res: Response) {
    const localSecret = req.query.secret
    if (!localSecret) {
        res.status(400).json({ error: "secret has to be set." })
        return false
    }

    if (SECRET !== localSecret) {
        res.status(400).json({ error: "Secret is not valid." })
        return false
    }

    console.log("Secret is valid.")
    return true
}