const Note = require('../models/note')
const User = require('../models/user')

const initialNotes = [
  {
    title: 'first note',
    content: 'first note content',
    important: false
  },
  {
    title: 'second note',
    content: 'second note content',
    important: true
  }
]

const nonExistingId = async() => {
  const note = new Note({ content: 'willremovethissoon ' })
  await note.save()
  await note.deleteOne()

  return note._id.toString()
}

const notesInDb = async() => {
  const notes = await Note.find({})
  return notes.map(note => note.toJSON())
}

const usersInDb = async() => {
  const users = await User.find({})
  return users.map(u => u.toJSON())
}

module.exports = {
  initialNotes,
  nonExistingId,
  notesInDb,
  usersInDb,
}