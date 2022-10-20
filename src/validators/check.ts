import { Request, Response } from "express"
import { SECRET } from "../util/env"

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

export function validateId(id: string) {
    const regex = /^[0-9A-Za-z]{8}-[0-9A-Za-z]{4}-4[0-9A-Za-z]{3}-[89ABab][0-9A-Za-z]{3}-[0-9A-Za-z]{12}$/g
    return regex.test(id)
}