const Note = require('../models/note')
const User = require('../models/user')

const removeNoteFromUsers = async (noteId, userId) => {
    const note = await Note.findById(noteId)
    const creatorId = note.creator
    const creator = await User.findById(creatorId)
    creator.notes = creator.notes.filter(n => n.toString() !== note.id.toString()) // remove note from user
    await creator.save()

    // Remove the note from all collaborators
    for (const collaborator of note.collaborators) {
        const user = await User.findById(collaborator.userId)
        if (user) {
            user.shared = user.shared.filter(n => n.toString() !== note.id.toString()) // remove note from collaborator's shared notes
            await user.save()
        }
    }

    await Note.findByIdAndDelete(noteId)

    return noteId
}




module.exports= { removeNoteFromUsers }