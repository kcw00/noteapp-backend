const jwt = require('jsonwebtoken')

const generateCollabToken = (userId, noteId, permissions) => {
    const payload = {
        userId,
        noteId,
        permissions
    }

    const secret = process.env.COLLAB_SECRET
    return jwt.sign(payload, secret, { expiresIn: '1h' })
}

module.exports = { generateCollabToken }