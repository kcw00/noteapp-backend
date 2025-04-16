const jwt = require('jsonwebtoken')

const generateCollabToken = (userId, noteId, permissons) => {
    const payload = {
        userId,
        noteId,
        permissons
    }

    const secret = process.env.COLLAB_SECRET
    return jwt.sign(payload, secret, { expiresIn: '1h' })
}

module.exports = { generateCollabToken }