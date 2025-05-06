const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema({
  title: {
    type: Object,
  },
  content: {
    type: Object,
  },
  important: Boolean,
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    username: {
      type: String,
    },
    name: {
      type: String,
    },
    userType: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'viewer',
    },
  }],
  date: {
    type: Date,
    default: Date.now,
  }
})

noteSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Note', noteSchema)