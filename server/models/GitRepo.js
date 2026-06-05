const mongoose = require('mongoose');

const CommitSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  parentIds: {
    type: [String],
    default: []
  },
  author: {
    type: String,
    default: 'hacker'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const BranchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  commitId: {
    type: String,
    required: true
  }
});

const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['staged', 'unstaged', 'committed'],
    default: 'unstaged'
  }
});

const GitRepoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Null allows guest repositories to be saved/shared
  },
  branches: [BranchSchema],
  commits: [CommitSchema],
  activeBranch: {
    type: String,
    default: 'main'
  },
  headCommitId: {
    type: String,
    default: null
  },
  stagingArea: {
    type: [String], // Array of filenames currently staged
    default: []
  },
  files: [FileSchema],
  isPublic: {
    type: Boolean,
    default: false
  },
  shareId: {
    type: String,
    unique: true,
    sparse: true // Allows null/undefined if not public
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GitRepo', GitRepoSchema);
