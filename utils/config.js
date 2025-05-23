require('dotenv').config()

const PORT = process.env.PORT
const ADDRESS = process.env.SERVER_ADDRESS
const FRONTEND_URL = process.env.FRONTEND_URL

const MONGODB_URI = process.env.NODE_ENV === 'test'
  ? process.env.TEST_MONGODB_URI
  : process.env.MONGODB_URI

module.exports = {
  MONGODB_URI,
  PORT,
  ADDRESS,
  FRONTEND_URL,
}