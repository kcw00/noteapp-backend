const logger = require('./logger')

const requestLogger = (request, response, next) => {
  console.log('requestreceived')
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  if (request.method === 'GET') {
    logger.info('Status code:', response.statusCode)
  } else {
    logger.info('Body:  ', request.body)
  }
  logger.info('---')
  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  logger.error(error.message)
  logger.error(error.stack)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'MongoServerError' && error.message.includes('E11000 duplicate key error')) {
    return response.status(400).json({
      error: 'expected `username` to be uniqued'
    })
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({
      error: 'token invalid'
    })
  } else if (error.name === 'TokenExpiredError') {
    return response.status(401).json({
      error: 'token expired'
    })
  }

  next(error)
}


const jwt = require('jsonwebtoken')
const User = require('../models/user')

const userExtractor = async (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.substring(7)

    try {
      const decodedToken = jwt.verify(token, process.env.SECRET)

      if (!decodedToken.id) {
        return response.status(401).json({ error: 'Token is missing or invalid' })
      }

      const user = await User.findById(decodedToken.id)
      request.user = user // Attach user information to the request object
      next()
    } catch (error) {
      return response.status(401).json({ error: 'Token missing or invalid' })
    }
  } else {
    return response.status(401).json({ error: 'Token missing or invalid' })
  }
}


module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  userExtractor
}