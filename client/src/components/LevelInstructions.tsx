import { type FC } from 'react';
import type { Level } from '../utils/levels';
import type { GitState } from '../utils/gitEngine';
import { playSound } from '../utils/audio';

interface LevelInstructionsProps {
  level: Level;
  gitState: GitState;
  isCompleted: boolean;
  onNextLevel: () => void;
  hasMoreLevels: boolean;
}

export const LevelInstructions: FC<LevelInstructionsProps> = ({
  level,
  gitState,
  isCompleted,
  onNextLevel,
  hasMoreLevels
}) => {
  // Dynamically compute the progress state of sub-steps based on gitState
  const getStepProgress = (instruction: string): 'todo' | 'done' => {
    const text = instruction.toLowerCase();
    
    if (text.includes('git init')) {
      return gitState.initialized ? 'done' : 'todo';
    }
    if (text.includes('git add')) {
      return gitState.stagingArea.length > 0 || Object.keys(gitState.commits).length > 0 ? 'done' : 'todo';
    }
    if (text.includes('git commit')) {
      return Object.keys(gitState.commits).length > 0 ? 'done' : 'todo';
    }
    if (text.includes('git branch')) {
      // Find if we have more branches than the initial level state
      const branchCount = Object.keys(gitState.branches).length;
      if (level.id === 'git-branch') {
        return branchCount > 1 ? 'done' : 'todo';
      }
      return 'todo';
    }
    if (text.includes('git checkout')) {
      if (level.id === 'git-branch') {
        return gitState.activeBranch === 'cyber-patch' ? 'done' : 'todo';
      }
      if (level.id === 'git-merge') {
        return gitState.activeBranch === 'main' ? 'done' : 'todo';
      }
      if (level.id === 'git-rebase') {
        return gitState.activeBranch === 'bypass-patch' ? 'done' : 'todo';
      }
    }
    if (text.includes('git merge')) {
      if (level.id === 'git-merge') {
        // merged if c2 (exploit commit) is ancestor of main
        const mainHead = gitState.branches['main']?.commitId;
        return mainHead === 'c222222' || (mainHead && Object.keys(gitState.commits).length > 2) ? 'done' : 'todo';
      }
    }
    if (text.includes('git rebase')) {
      if (level.id === 'git-rebase') {
        return isCompleted ? 'done' : 'todo';
      }
    }

    return 'todo';
  };

  const getDifficultyClass = (diff: Level['difficulty']) => {
    switch (diff) {
      case 'Beginner': return 'diff-badge beginner';
      case 'Intermediate': return 'diff-badge intermediate';
      case 'Advanced': return 'diff-badge advanced';
    }
  };

  return (
    <div className="instructions-container glass-panel">
      {/* Title Header */}
      <div className="instructions-header">
        <span className={getDifficultyClass(level.difficulty)}>
          {level.difficulty}
        </span>
        <span>OBJECTIVE MATRIX</span>
      </div>

      <h2>
        {level.title}
      </h2>
      <p className="instructions-desc">
        {level.description}
      </p>

      {/* Checklist instructions */}
      <div className="instructions-checklist">
        <h3 className="checklist-title">Instructions Check</h3>
        {level.instructions.map((inst, idx) => {
          const status = getStepProgress(inst);
          const isDone = status === 'done' || isCompleted;
          return (
            <div 
              key={idx} 
              className={`checklist-item ${isDone ? 'completed' : ''}`}
            >
              <div className="checklist-checkbox">
                {isDone ? '✓' : ''}
              </div>
              <p className="checklist-text">
                {inst}
              </p>
            </div>
          );
        })}
      </div>

      {/* Completion status panel */}
      {isCompleted ? (
        <div className="level-status-success">
          <div className="success-title">
            ✓ SYSTEM BREACH SUCCESSFUL
          </div>
          <p className="success-desc">
            Node bypassed. Git refs matching expectations.
          </p>
          {hasMoreLevels ? (
            <button
              onClick={() => { playSound('click'); onNextLevel(); }}
              className="btn-cyber-green"
              style={{ width: '100%', fontWeight: 'bold', textTransform: 'uppercase', padding: '8px', fontSize: '11px' }}
            >
              Decrypt Next Node
            </button>
          ) : (
            <div style={{ fontSize: '10px', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)', padding: '6px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>
              ★ All Hacking Nodes Bypassed ★
            </div>
          )}
        </div>
      ) : (
        <div className="level-status-footer">
          Monitor refs and execute instructions in terminal prompt.
        </div>
      )}
    </div>
  );
};
