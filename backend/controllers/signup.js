const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const signupRouter = require('express').Router()
const User = require('../models/user')

signupRouter.post('/', async (request, response) => {
    const { username, name, password } = request.body

    if (!username || !password) {
        return response.status(400).json({
            error: 'Username and Password are required'
        })
    }

    const existingUser = await User.findOne({ username })
    if (existingUser) {
        return response.status(400).json({
            error: 'Username is already taken'
        })
    }

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const user = new User({
        username: username,
        name: name,
        passwordHash,
    })

    const savedUser = await user.save()

    // create a token for the user
    const userForToken = {
        username: savedUser.username,
        id: savedUser._id,
    }
    const token = jwt.sign(
        userForToken,
        process.env.SECRET,
        { expiresIn: 60 * 60 }
    )

    response.status(201).json({
        token,
        username: savedUser.username,
        name: savedUser.name,
    })
})

module.exports = signupRouter