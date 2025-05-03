const notesRouter = require('express').Router()
const Note = require('../models/note')
const User = require('../models/user')
const { userExtractor } = require('../utils/middleware')
const { ObjectId } = require('mongodb')
const { getIo } = require('../socket')

notesRouter.use(userExtractor)


// get all notes for a user
notesRouter.get('/:userId', async (request, response) => {
  const { userId } = request.params
  console.log('userId:', userId)
  const creator = new ObjectId(userId)
  const notes = await Note.find({ creator })
  console.log('notes:', notes)
  response.json(notes)
})

// get a single note with collaborators
notesRouter.get('/:noteId', async (request, response) => {
  const { noteId } = request.params

  // Validate noteId
  if (!ObjectId.isValid(noteId)) {
    return response.status(400).json({ error: 'Invalid noteId' })
  }

  // Find the note and populate collaborators
  try {
    const note = await Note.findById(noteId).populate('collaborators.user', 'username name') // populate user data
    if (!note) {
      return response.status(404).json({ error: 'Note not found' })
    }

    note.collaborators = Array.isArray(note.collaborators) ? note.collaborators : []

    response.json(note)
  } catch (error) {
    response.status(500).json({ error: 'Server error' })
  }
})

// get shared notes
notesRouter.get('/shared/:userId', async (request, response) => {
  const { userId } = request.params
  try {
    const user = await User.findById(userId).populate('shared')
    const sharedNotes = user.shared


    // empty array for new users
    if (!sharedNotes || sharedNotes.length === 0) {
      return response.json([])
    }

    response.json(sharedNotes)
  } catch (error) {
    console.error('Error fetching shared notes:', error)
    response.status(500).json({ error: 'Internal server error' })
  }
})

notesRouter.post('/', async (request, response) => {
  const body = request.body

  const creator = await User.findById(body.creator)

  if (!creator) {
    return response.status(404).json({ error: 'Creator not found' })
  }

  const note = new Note({
    title: body.title,
    content: body.content,
    important: body.important === undefined ? false : body.important,
    creator: creator,
    collaborators: [], // add empty collaborators array
  })

  const savedNote = await note.save()
  creator.notes = creator.notes.concat(savedNote._id) // add note to user
  await creator.save()

  response.status(201).json(savedNote)
})

notesRouter.delete('/:noteId/user/:userId', async (request, response) => {
  const { noteId, userId } = request.params

  const note = await Note.findById(noteId)
  if (!note) {
    return response.status(404).json({ error: 'Note not found' })
  }


  try {
    // Remove the note from the user's notes
    const creator = await User.findById(userId)
    creator.notes = creator.notes.filter(n => n.toString() !== noteId)
    await creator.save()

    note.collaborators.forEach(async (collaborator) => {
      const user = await User.findById(collaborator.userId)
      if (user) {
        user.shared = user.shared.filter(n => n.toString() !== noteId) // remove note from collaborator's shared notes
        await user.save()
      }
    })
    // Delete the note from the database
    await Note.findByIdAndDelete(noteId)

    response.status(204).end() // Successful deletion with no content to return
  } catch (error) {
    console.error('Error deleting note:', error)
    return response.status(500).json({ error: 'Failed to delete note' })
  }
})


// Update a note
notesRouter.put('/:noteId', async (request, response) => {
  const { noteId } = request.params
  const { title, content, important } = request.body
  const userId = request.user.id

  const isCreator = await Note.exists({ _id: noteId, creator: userId })
  const isEditor = await Note.exists({ _id: noteId, 'collaborators.userId': userId, 'collaborators.userType': 'editor' })

  if (!isCreator && !isEditor) {
    return response.status(403).json({ error: 'You do not have permission to edit this note' })
  }

  const updatedNote = await Note.findByIdAndUpdate(
    noteId,
    { title, content, important },
    { new: true, runValidators: true, context: 'query' }
  )

  if (!updatedNote) {
    return response.status(404).end()
  }
  response.json(updatedNote)
})


// Add collaborator to a note
notesRouter.put('/:noteId/collaborators', async (request, response) => {
  const { noteId } = request.params
  const { collaboratorId, userType } = request.body

  // Check if the collaborator exists
  const collaborator = await User.findById(collaboratorId)
  if (!collaborator) {
    return response.status(404).json({ error: 'Collaborator not found: ' + collaboratorId })
  }

  // Check if noteId is valid
  if (!ObjectId.isValid(noteId)) {
    return response.status(400).json({ error: 'Invalid noteId: ' + noteId })
  }


  const note = await Note.findById(noteId)
  console.log('Found note:', note)
  if (!note) {
    return response.status(404).json({ error: 'Note not found' })
  }

  // Check if the user is already a collaborator
  const existingCollaborator = note.collaborators.find(c => c.userId && c.userId.toString() === collaboratorId)
  if (existingCollaborator) {
    return response.status(400).json({ error: 'User is already a collaborator' })
  }

  // Check if the user is the creator of the note
  const isCreator = note.creator.toString() === request.user._id.toString()
  if (!isCreator) {
    return response.status(403).json({ error: 'You do not have permission to add collaborators' })
  }

  // Check if the userType is valid
  const validUserTypes = ['editor', 'viewer']
  if (!validUserTypes.includes(userType)) {
    return response.status(400).json({ error: 'Invalid userType' })
  }

  // Add the collaborator
  note.collaborators.push({
    userId: collaboratorId,
    username: collaborator.username,
    name: collaborator.name,
    userType
  })
  collaborator.shared.push(noteId) // add note to collaborator's shared notes
  try {
    const updatedNote = await note.save()
    const updatedCollaborator = await collaborator.save()

    response.status(200).json({ updatedNote, updatedCollaborator })
  } catch (error) {
    response.status(400).json({ error: 'Failed to add collaborator' + error })
  }
})

// Remove collaborator from a note
notesRouter.delete('/:noteId/collaborators', async (request, response) => {
  const { noteId } = request.params
  const { collaboratorId } = request.body

  const collaborator = await User.findById(collaboratorId)

  // Check if noteId is valid
  if (!ObjectId.isValid(noteId)) {
    return response.status(400).json({ error: 'Invalid noteId' })
  }

  // Check if the user is the creator of the note
  const note = await Note.findById(noteId)
  if (!note) {
    return response.status(404).json({ error: 'Note not found' })
  }

  const isCreator = note.creator.toString() === request.user._id.toString()
  console.log('isCreator:', isCreator)
  if (!isCreator) {
    return response.status(403).json({ error: 'You do not have permission to remove collaborators' })
  }

  // Remove the collaborator
  note.collaborators = note.collaborators.filter(c => c.userId && c.userId.toString() !== collaboratorId)
  collaborator.shared = collaborator.shared.filter(n => n.toString() !== noteId) // remove note from collaborator's shared notes
  try {
    const updatedNote = await note.save()
    const updatedCollaborator = await collaborator.save()
    response.status(200).json({ updatedNote, updatedCollaborator })
  } catch (error) {
    response.status(400).json({ error: 'Failed to remove collaborator' })
  }
})

// Update collaborator role
notesRouter.put('/:noteId/collaborators/:collaboratorId/role', async (request, response) => {
  const { noteId, collaboratorId } = request.params
  const { userType } = request.body

  // Check if noteId is valid
  if (!ObjectId.isValid(noteId)) {
    return response.status(400).json({ error: 'Invalid noteId' })
  }

  // Check if the user is the creator of the note
  const note = await Note.findById(noteId)
  if (!note) {
    return response.status(404).json({ error: 'Note not found' })
  }

  const isCreator = note.creator.toString() === request.user._id.toString()
  if (!isCreator) {
    return response.status(403).json({ error: 'You do not have permission to update collaborator roles' })
  }

  // Check if the userType is valid
  const validUserTypes = ['editor', 'viewer']
  if (!validUserTypes.includes(userType)) {
    return response.status(400).json({ error: 'Invalid userType' })
  }

  // Update the collaborator role
  const collaborator = note.collaborators.find(c => c.user && c.user.toString() === collaboratorId)
  if (!collaborator) {
    return response.status(404).json({ error: 'Collaborator not found' })
  }

  collaborator.userType = userType
  try {
    const updatedNote = await note.save()
    // Notify clients about the collaborator role update
    getIo().emit('collaboratorRoleUpdated', { noteId, collaboratorId, userType })
    response.status(200).json(updatedNote)
  } catch (error) {
    response.status(400).json({ error: 'Failed to update collaborator role' })
  }
})

module.exports = notesRouter