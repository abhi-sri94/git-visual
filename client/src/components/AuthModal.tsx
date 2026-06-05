import React, { useState } from 'react';
import { playSound } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, user: { id: string; username: string; completedTutorials: string[] }) => void;
  apiBaseUrl: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  apiBaseUrl
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playSound('click');
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      playSound('success');
      onAuthSuccess(data.token, data.user);
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      playSound('error');
      setError(error.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="modal-header">
          <span className="text-cyan-400 font-mono text-xs">
            {isRegister ? 'system@auth:~$ new_connection' : 'system@auth:~$ login_access'}
          </span>
          <button 
            onClick={() => { playSound('click'); onClose(); }}
            className="clear-logs-btn"
          >
            ESC
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          <div>
            <h2>
              {isRegister ? 'REGISTER HACKER ID' : 'ENTER DECEN-NET'}
            </h2>
            <p>
              {isRegister ? 'Secure database credentials for sync' : 'Decrypt saved repositories'}
            </p>
          </div>

          {error && (
            <div className="modal-error">
              SYSTEM ERROR: {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Hacker Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Neo101"
              className="input-cyber font-mono"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Access Keycode (Password)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-cyber font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn-cyber-cyan ${loading ? 'opacity-50' : ''}`}
            style={{ width: '100%', fontWeight: 'bold', textTransform: 'uppercase', padding: '10px' }}
          >
            {loading ? 'Decrypting Connection...' : isRegister ? 'Establish Identity' : 'Decrypt Key'}
          </button>

          <div style={{ textAlign: 'center', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs font-mono text-zinc-500 hover:text-cyan-400 transition-colors"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {isRegister ? 'Already registered? Login instead' : 'Need a new keycode? Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
