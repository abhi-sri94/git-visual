import React, { useState } from 'react';
import { playSound } from '../utils/audio';
import type { SavedRepo, User } from '../utils/gitEngine';

interface NavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  currentMode: 'tutorial' | 'sandbox';
  onModeChange: (mode: 'tutorial' | 'sandbox') => void;
  savedRepos: SavedRepo[];
  onLoadRepo: (id: string) => void;
  onSaveRepo: () => void;
  onShareRepo: () => void;
  sandboxName: string;
  onSandboxNameChange: (name: string) => void;
  shareId: string | null;
  loadingSave: boolean;
  loadingShare: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  currentMode,
  onModeChange,
  savedRepos,
  onLoadRepo,
  onSaveRepo,
  onShareRepo,
  sandboxName,
  onSandboxNameChange,
  shareId,
  loadingSave,
  loadingShare
}) => {
  const [showLoadDropdown, setShowLoadDropdown] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const handleCopyLink = () => {
    if (!shareId) return;
    playSound('click');
    const fullUrl = `${window.location.origin}?share=${shareId}`;
    navigator.clipboard.writeText(fullUrl);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <nav className="navbar glass-panel">
      {/* Brand logo */}
      <div className="navbar-brand">
        <div className="brand-logo">
          <span>G</span>
        </div>
        <div className="brand-text">
          <h1>
            GIT-VISUAL <span>v1.0</span>
          </h1>
          <p>Cyber Branch Simulator</p>
        </div>
      </div>

      {/* Mode Switches */}
      <div className="navbar-mode-selector">
        <button
          onClick={() => { playSound('click'); onModeChange('tutorial'); }}
          className={`mode-btn ${currentMode === 'tutorial' ? 'active' : ''}`}
        >
          Tutorials
        </button>
        <button
          onClick={() => { playSound('click'); onModeChange('sandbox'); }}
          className={`mode-btn ${currentMode === 'sandbox' ? 'active' : ''}`}
        >
          Sandbox
        </button>
      </div>

      {/* Sandbox controls or info */}
      {currentMode === 'sandbox' && (
        <div className="sandbox-controls">
          <input
            type="text"
            value={sandboxName}
            onChange={(e) => onSandboxNameChange(e.target.value)}
            placeholder="sandbox-repo"
            className="sandbox-input"
          />

          <button
            onClick={() => { playSound('click'); onSaveRepo(); }}
            disabled={loadingSave}
            className="btn-cyber-cyan text-xs py-1 px-2.5"
          >
            {loadingSave ? 'Saving...' : 'Save Repo'}
          </button>

          {/* Load Dropdown */}
          <div className="dropdown-container">
            <button
              onClick={() => { playSound('click'); setShowLoadDropdown(!showLoadDropdown); }}
              className="btn-cyber-purple border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white text-xs py-1 px-2.5 border rounded"
            >
              Load ({savedRepos.length})
            </button>
            {showLoadDropdown && (
              <div className="dropdown-menu custom-scrollbar">
                {savedRepos.length === 0 ? (
                  <div className="text-[10px] text-zinc-600 p-2 text-center">No saved repos.</div>
                ) : (
                  savedRepos.map(repo => (
                    <button
                      key={repo._id}
                      onClick={() => {
                        playSound('click');
                        onLoadRepo(repo._id);
                        setShowLoadDropdown(false);
                      }}
                      className="dropdown-item"
                    >
                      {repo.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={onShareRepo}
            disabled={loadingShare}
            className="btn-cyber-green text-xs py-1 px-2.5"
          >
            {loadingShare ? 'Sharing...' : 'Share'}
          </button>

          {shareId && (
            <button
              onClick={handleCopyLink}
              className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 rounded px-2 py-1.5 flex items-center space-x-1"
            >
              <span>{showCopied ? 'Link Copied!' : 'Copy Share Link'}</span>
            </button>
          )}
        </div>
      )}

      {/* Auth details & action */}
      <div className="navbar-user-panel">
        {user ? (
          <>
            <div className="user-info">
              <div className="username">{user.username}</div>
              <div className="user-stats">
                Tutorials: {user.completedTutorials.length} / 4
              </div>
            </div>
            <div className="user-avatar">
              <span>
                {user.username.slice(0, 2)}
              </span>
            </div>
            <button
              onClick={() => { playSound('click'); onLogout(); }}
              className="logout-btn"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Guest Session</span>
            <button
              onClick={() => { playSound('click'); onOpenAuth(); }}
              className="btn-cyber-cyan text-xs py-1 px-3"
            >
              Sign In
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
