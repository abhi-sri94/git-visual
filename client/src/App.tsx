import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { GitVisualizer } from './components/GitVisualizer';
import { Terminal } from './components/Terminal';
import { LevelInstructions } from './components/LevelInstructions';
import { levels } from './utils/levels';
import { 
  getInitialState, 
  runGitCommand, 
  checkTutorialTarget, 
  type GitState, 
  type Commit,
  type Branch
} from './utils/gitEngine';
import { playSound } from './utils/audio';

// API Base URL (adjust for production)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : '';

interface User {
  id: string;
  username: string;
  completedTutorials: string[];
}

interface SavedRepo {
  _id: string;
  name: string;
  userId?: string | null;
  branches: Array<{ name: string; commitId: string }>;
  commits: Array<{ id: string; message: string; parentIds: string[]; author: string; timestamp: number }>;
  activeBranch: string | null;
  headCommitId: string | null;
  stagingArea: string[];
  files: Array<{ name: string; status: 'staged' | 'unstaged' | 'committed' }>;
  shareId?: string | null;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const arrayToRecord = <T extends object>(arr: T[], key: keyof T = 'id' as keyof T): Record<string, T> => {
  return arr.reduce((acc, curr) => {
    acc[String(curr[key])] = curr;
    return acc;
  }, {} as Record<string, T>);
};

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const cachedUser = localStorage.getItem('user');
    return cachedUser ? JSON.parse(cachedUser) : null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Layout mode: 'tutorial' or 'sandbox'
  const [mode, setMode] = useState<'tutorial' | 'sandbox'>(() => {
    const cachedMode = localStorage.getItem('git_visual_mode');
    return (cachedMode === 'sandbox' || cachedMode === 'tutorial') ? cachedMode : 'tutorial';
  });
  const [activeLevelIdx, setActiveLevelIdx] = useState<number>(() => {
    const cachedIdx = localStorage.getItem('git_visual_level_idx');
    if (cachedIdx) {
      const parsed = parseInt(cachedIdx, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < levels.length) {
        return parsed;
      }
    }
    return 0;
  });
  const [activeTab, setActiveTab] = useState<'instructions' | 'visualizer' | 'terminal'>('instructions');

  // Git states
  const [gitState, setGitState] = useState<GitState>(getInitialState());
  const [terminalHistory, setTerminalHistory] = useState<Array<{ type: 'input' | 'output'; text: string }>>([]);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);

  // Sandbox specific states
  const [sandboxName, setSandboxName] = useState('cyberpunk-hack');
  const [savedRepos, setSavedRepos] = useState<SavedRepo[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  
  // Loading states
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);
  const [isLevelCompleted, setIsLevelCompleted] = useState(false);

  const currentLevel = levels[activeLevelIdx];

  // Fetch list of saved sandboxes (if logged in)
  const fetchSavedRepos = useCallback(async (userToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/repos`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedRepos(data);
      }
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
    }
  }, []);

  // Load shared repository state from database
  const loadSharedRepository = useCallback(async (hash: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/repos/shared/${hash}`);
      if (!res.ok) throw new Error('Shared repository not found');
      
      const data = await res.json();
      
      // Update states
      setGitState({
        repoName: data.name,
        commits: arrayToRecord<Commit>(data.commits),
        branches: arrayToRecord<Branch>(data.branches, 'name'),
        activeBranch: data.activeBranch,
        headCommitId: data.headCommitId,
        stagingArea: data.stagingArea,
        files: data.files,
        initialized: true
      });
      setSandboxName(data.name);
      setShareId(data.shareId);
      setTerminalHistory([{ type: 'output', text: `Successfully loaded shared repository: "${data.name}"` }]);
      playSound('success');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      playSound('error');
      setTerminalHistory([{ type: 'output', text: `SYSTEM ERROR: Failed to load shared repository. (${error.message})` }]);
    }
  }, []);

  // Helper to load tutorial level
  const loadLevelState = useCallback((idx: number) => {
    const lvl = levels[idx];
    setGitState(lvl.initialState());
    setIsLevelCompleted(false);
    setSelectedCommit(null);
    setTerminalHistory([
      {
        type: 'output',
        text: `LOG: Connected to node "${lvl.title}"\nDifficulty: ${lvl.difficulty}\nType "git help" for CLI guide.`
      }
    ]);
  }, []);

  // 1. Keep mode synced to local storage
  useEffect(() => {
    localStorage.setItem('git_visual_mode', mode);
  }, [mode]);

  // 2. Keep activeLevelIdx synced to local storage
  useEffect(() => {
    localStorage.setItem('git_visual_level_idx', String(activeLevelIdx));
  }, [activeLevelIdx]);

  // 3. Sandbox Autosave effect
  useEffect(() => {
    if (mode === 'sandbox') {
      const dataToSave = {
        gitState,
        sandboxName,
        activeRepoId,
        shareId
      };
      localStorage.setItem('git_visual_sandbox_autosave', JSON.stringify(dataToSave));
    }
  }, [mode, gitState, sandboxName, activeRepoId, shareId]);

  // 4. Initial mounting checks (local cache profile + URL sharing load)
  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSavedRepos(token);
    }

    // Check URL parameters for sharing hashes "?share=abcdef"
    const params = new URLSearchParams(window.location.search);
    const sharedHash = params.get('share');
    if (sharedHash) {
      setMode('sandbox');
      loadSharedRepository(sharedHash);
    } else {
      const savedData = localStorage.getItem('git_visual_sandbox_autosave');
      const savedMode = localStorage.getItem('git_visual_mode') || 'tutorial';
      if (savedMode === 'sandbox' && savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed && parsed.gitState) {
            setGitState(parsed.gitState);
            setSandboxName(parsed.sandboxName || 'sandbox-repo');
            setActiveRepoId(parsed.activeRepoId || null);
            setShareId(parsed.shareId || null);
            setTerminalHistory([
              {
                type: 'output',
                text: `LOG: Restored sandbox workspace "${parsed.sandboxName || 'sandbox-repo'}" from autosave cache.`
              }
            ]);
          } else {
            loadLevelState(activeLevelIdx);
          }
        } catch (e) {
          console.error('Failed to parse sandbox autosave data:', e);
          loadLevelState(activeLevelIdx);
        }
      } else {
        loadLevelState(activeLevelIdx);
      }
    }
  }, [token, fetchSavedRepos, loadSharedRepository, loadLevelState, activeLevelIdx]);

  // Switch levels
  const handleNextLevel = () => {
    if (activeLevelIdx + 1 < levels.length) {
      const nextIdx = activeLevelIdx + 1;
      setActiveLevelIdx(nextIdx);
      loadLevelState(nextIdx);
      setActiveTab('instructions');
    }
  };

  // Sync tutorial completion to database (authenticated only)
  const saveTutorialProgress = async (lvlId: string) => {
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/tutorials/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tutorialId: lvlId })
      });
      if (res.ok) {
        const data = await res.json();
        const updatedUser = { ...user, completedTutorials: data.completedTutorials };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to sync progress:', err);
    }
  };

  // Run Git Command
  const handleExecuteCommand = (command: string) => {
    // 1. Run engine transition
    const { newState, output, success } = runGitCommand(gitState, command);
    
    // Play sound based on result
    if (success) {
      if (command.includes('commit')) {
        playSound('commit');
      } else if (command.includes('merge')) {
        playSound('merge');
      }
    } else {
      playSound('error');
    }

    // Update state
    setGitState(newState);
    setTerminalHistory(prev => [
      ...prev,
      { type: 'input', text: command },
      { type: 'output', text: output }
    ]);

    // Clear selected commit
    setSelectedCommit(null);

    // 2. Tutorial targets check
    if (mode === 'tutorial' && !isLevelCompleted) {
      const result = checkTutorialTarget(newState, currentLevel.targetType, currentLevel.targetParams);
      if (result.success) {
        setIsLevelCompleted(true);
        playSound('success');
        saveTutorialProgress(currentLevel.id);
      }
    }

    return { output, success };
  };

  // Sandbox: Save repository state
  const handleSaveRepo = async () => {
    setLoadingSave(true);
    playSound('click');

    // Convert records to arrays for Mongoose
    const bodyPayload = {
      id: activeRepoId,
      name: sandboxName,
      branches: Object.values(gitState.branches),
      commits: Object.values(gitState.commits),
      activeBranch: gitState.activeBranch,
      headCommitId: gitState.headCommitId,
      stagingArea: gitState.stagingArea,
      files: gitState.files
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/repos/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      playSound('success');
      setActiveRepoId(data.repo._id);
      
      // Update list
      if (token) {
        fetchSavedRepos(token);
      }
      
      setTerminalHistory(prev => [
        ...prev,
        { type: 'output', text: `SYSTEM SAFE: Repository "${sandboxName}" saved successfully in MongoDB.` }
      ]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      playSound('error');
      setTerminalHistory(prev => [
        ...prev,
        { type: 'output', text: `SYSTEM ERROR: Save failed. (${error.message})` }
      ]);
    } finally {
      setLoadingSave(false);
    }
  };

  // Sandbox: Load repository
  const handleLoadRepo = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/repos/load/${id}`, { headers });
      if (!res.ok) throw new Error('Failed to load');

      const data = await res.json();

      setGitState({
        repoName: data.name,
        commits: arrayToRecord<Commit>(data.commits),
        branches: arrayToRecord<Branch>(data.branches, 'name'),
        activeBranch: data.activeBranch,
        headCommitId: data.headCommitId,
        stagingArea: data.stagingArea,
        files: data.files,
        initialized: true
      });
      setSandboxName(data.name);
      setActiveRepoId(data._id);
      setShareId(data.shareId || null);
      setSelectedCommit(null);
      setTerminalHistory([{ type: 'output', text: `LOG: Decrypted and loaded repository "${data.name}"` }]);
      playSound('success');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      playSound('error');
      setTerminalHistory(prev => [...prev, { type: 'output', text: `SYSTEM ERROR: Load failed. (${error.message})` }]);
    }
  };

  // Sandbox: Publish and share repository
  const handleShareRepo = async () => {
    if (!activeRepoId) {
      // Must save first
      setTerminalHistory(prev => [...prev, { type: 'output', text: 'SYSTEM ALERT: Save repository before sharing.' }]);
      playSound('error');
      return;
    }

    setLoadingShare(true);
    playSound('click');

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/repos/share/${activeRepoId}`, {
        method: 'POST',
        headers
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to share');

      playSound('success');
      setShareId(data.shareId);
      
      setTerminalHistory(prev => [
        ...prev,
        { 
          type: 'output', 
          text: `SYSTEM PUBLISHED: Public share code established: "${data.shareId}".\nClick "Copy Share Link" above to send to recruiters.` 
        }
      ]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      playSound('error');
      setTerminalHistory(prev => [...prev, { type: 'output', text: `SYSTEM ERROR: Sharing failed. (${error.message})` }]);
    } finally {
      setLoadingShare(false);
    }
  };

  // Handle Mode Change (Tutorial vs Sandbox)
  const handleModeChange = (newMode: 'tutorial' | 'sandbox') => {
    setMode(newMode);
    setSelectedCommit(null);
    setShareId(null);
    setActiveRepoId(null);
    if (newMode === 'tutorial') {
      loadLevelState(activeLevelIdx);
    } else {
      // Restore from autosave if exists, else load default empty state
      const savedData = localStorage.getItem('git_visual_sandbox_autosave');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed && parsed.gitState) {
            setGitState(parsed.gitState);
            setSandboxName(parsed.sandboxName || 'sandbox-repo');
            setActiveRepoId(parsed.activeRepoId || null);
            setShareId(parsed.shareId || null);
            setTerminalHistory([
              {
                type: 'output',
                text: `LOG: Restored sandbox workspace "${parsed.sandboxName || 'sandbox-repo'}" from autosave cache.`
              }
            ]);
            return;
          }
        } catch (e) {
          console.error('Failed to restore sandbox autosave on mode change:', e);
        }
      }
      
      // Empty sandbox state fallback
      setGitState(getInitialState());
      setSandboxName('sandbox-repo');
      setTerminalHistory([
        {
          type: 'output',
          text: 'LOG: Entered Sandbox Mode.\nRun "git init" to create a new branch structure. Click Save Repo to sync.'
        }
      ]);
    }
  };

  // Auth Modal handlers
  const handleAuthSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    fetchSavedRepos(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setSavedRepos([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    playSound('click');
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        currentMode={mode}
        onModeChange={handleModeChange}
        savedRepos={savedRepos}
        onLoadRepo={handleLoadRepo}
        onSaveRepo={handleSaveRepo}
        onShareRepo={handleShareRepo}
        sandboxName={sandboxName}
        onSandboxNameChange={setSandboxName}
        shareId={shareId}
        loadingSave={loadingSave}
        loadingShare={loadingShare}
      />

      {/* Main Workspace Frame */}
      <div className="workspace-frame">
        
        {/* Mobile-Only Panel Tab Controls */}
        <div className="mobile-tabs">
          <button 
            onClick={() => setActiveTab('instructions')}
            className={`tab-btn ${activeTab === 'instructions' ? 'active' : ''}`}
          >
            Objectives
          </button>
          <button 
            onClick={() => setActiveTab('visualizer')}
            className={`tab-btn ${activeTab === 'visualizer' ? 'active' : ''}`}
          >
            Visualizer
          </button>
          <button 
            onClick={() => setActiveTab('terminal')}
            className={`tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          >
            Terminal
          </button>
        </div>

        {/* 1. LEVEL INSTRUCTIONS PANEL (Left column on desktop, Tab-toggle on mobile) */}
        {mode === 'tutorial' && (
          <div className={`instructions-column ${activeTab === 'instructions' ? 'active-tab' : 'inactive-tab'}`}>
            <LevelInstructions
              level={currentLevel}
              gitState={gitState}
              isCompleted={isLevelCompleted}
              onNextLevel={handleNextLevel}
              hasMoreLevels={activeLevelIdx + 1 < levels.length}
            />
          </div>
        )}

        {/* 2. MAIN VISUALIZER PANEL (Middle column on desktop, Tab-toggle on mobile) */}
        <div className={`visualizer-column ${activeTab === 'visualizer' ? 'active-tab' : 'inactive-tab'}`}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <GitVisualizer
              gitState={gitState}
              onSelectCommit={setSelectedCommit}
              selectedCommit={selectedCommit}
            />
          </div>
          
          {/* Commit Inspector Detail Drawer */}
          {selectedCommit && (
            <div className="commit-inspector glass-panel">
              <div className="inspector-text">
                <div className="inspector-title">
                  Commit Inspector Node ({selectedCommit.id.slice(0, 7)})
                </div>
                <div className="inspector-message">"{selectedCommit.message}"</div>
                <div className="inspector-meta">
                  Author: {selectedCommit.author} | Parents: {selectedCommit.parentIds.join(', ') || 'None'}
                </div>
              </div>
              <button 
                onClick={() => setSelectedCommit(null)}
                className="btn-cyber-cyan"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* 3. TERMINAL PROMPT PANEL (Right column on desktop, Tab-toggle on mobile) */}
        <div className={`terminal-column ${activeTab === 'terminal' ? 'active-tab' : 'inactive-tab'}`}>
          <Terminal
            onExecuteCommand={handleExecuteCommand}
            history={terminalHistory}
            clearHistory={() => setTerminalHistory([])}
          />
        </div>

      </div>

      {/* Login Auth popup Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        apiBaseUrl={API_BASE_URL}
      />
    </div>
  );
}
