const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const GitRepo = require('../models/GitRepo');
const { authMiddleware } = require('./auth');

// Optional auth helper to check if user is logged in but not block if they are a guest
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'cyberpunk_git_secret_key_1029';
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore token decode error and continue as guest
    }
  }
  next();
};

// List user's saved repositories (requires login)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const repos = await GitRepo.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(repos);
  } catch (error) {
    console.error('List repos error:', error);
    res.status(500).json({ error: 'Server error listing repositories' });
  }
});

// Save repository state (authenticated or guest)
router.post('/save', optionalAuth, async (req, res) => {
  try {
    const { id, name, branches, commits, activeBranch, headCommitId, stagingArea, files } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    const userId = req.user ? req.user.id : null;
    let repo;

    if (id) {
      // Update existing repository
      repo = await GitRepo.findById(id);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      // Check ownership: if repo belongs to a user, but current session is guest or different user
      if (repo.userId) {
        if (!userId || repo.userId.toString() !== userId) {
          return res.status(403).json({ error: 'Unauthorized: You do not own this repository' });
        }
      }
      
      // Update fields
      repo.name = name;
      repo.branches = branches;
      repo.commits = commits;
      repo.activeBranch = activeBranch;
      repo.headCommitId = headCommitId;
      repo.stagingArea = stagingArea;
      repo.files = files;
    } else {
      // Create new repository
      repo = new GitRepo({
        name,
        userId,
        branches,
        commits,
        activeBranch,
        headCommitId,
        stagingArea,
        files
      });
    }

    await repo.save();
    res.status(200).json({
      message: 'Repository saved successfully',
      repo
    });
  } catch (error) {
    console.error('Save repo error:', error);
    res.status(500).json({ error: 'Server error saving repository' });
  }
});

// Get repository details by ID
router.get('/load/:id', optionalAuth, async (req, res) => {
  try {
    const repo = await GitRepo.findById(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Access control: if it has an owner and is not public, verify owner
    if (repo.userId && !repo.isPublic) {
      const userId = req.user ? req.user.id : null;
      if (!userId || repo.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Access denied to this private repository' });
      }
    }

    res.json(repo);
  } catch (error) {
    console.error('Load repo error:', error);
    res.status(500).json({ error: 'Server error loading repository' });
  }
});

// Delete repository (requires login)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const repo = await GitRepo.findById(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    if (!repo.userId || repo.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this repository' });
    }

    await GitRepo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Repository deleted successfully' });
  } catch (error) {
    console.error('Delete repo error:', error);
    res.status(500).json({ error: 'Server error deleting repository' });
  }
});

// Make repository public and generate a share link
router.post('/share/:id', optionalAuth, async (req, res) => {
  try {
    const repo = await GitRepo.findById(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Owner check if owner exists
    if (repo.userId) {
      const userId = req.user ? req.user.id : null;
      if (!userId || repo.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Unauthorized to share this repository' });
      }
    }

    // Generate unique shareId if not already public
    if (!repo.isPublic || !repo.shareId) {
      repo.isPublic = true;
      repo.shareId = crypto.randomBytes(6).toString('hex'); // 12-char hex string
      await repo.save();
    }

    res.json({
      message: 'Repository published successfully',
      shareId: repo.shareId,
      isPublic: repo.isPublic
    });
  } catch (error) {
    console.error('Share repo error:', error);
    res.status(500).json({ error: 'Server error publishing repository' });
  }
});

// Load repository state by shareId (public)
router.get('/shared/:shareId', async (req, res) => {
  try {
    const repo = await GitRepo.findOne({ shareId: req.params.shareId });
    if (!repo) {
      return res.status(404).json({ error: 'Shared repository not found' });
    }

    res.json(repo);
  } catch (error) {
    console.error('Load shared repo error:', error);
    res.status(500).json({ error: 'Server error loading shared repository' });
  }
});

module.exports = router;
