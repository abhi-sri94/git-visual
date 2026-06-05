import React, { useState, useRef, useEffect } from 'react';
import { playSound } from '../utils/audio';

interface TerminalProps {
  onExecuteCommand: (command: string) => { output: string; success: boolean };
  history: Array<{ type: 'input' | 'output'; text: string }>;
  clearHistory: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  onExecuteCommand,
  history,
  clearHistory
}) => {
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll terminal to the bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Play subtle typing sound
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      playSound('click');
    }

    if (e.key === 'Enter') {
      const command = input.trim();
      if (!command) return;

      // Reset index
      setHistoryIndex(-1);
      
      // Add to command history list
      setCmdHistory(prev => [...prev, command]);
      
      // Execute command
      onExecuteCommand(command);
      
      // Reset input
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      
      const newIndex = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(cmdHistory[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      
      const newIndex = historyIndex + 1;
      if (newIndex >= cmdHistory.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(cmdHistory[newIndex]);
      }
    }
  };

  const handleShortcutClick = (cmd: string) => {
    playSound('click');
    if (cmd === 'clear') {
      clearHistory();
    } else if (cmd === 'git cherry-pick ') {
      setInput('git cherry-pick ');
    } else {
      onExecuteCommand(cmd);
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  // Convert ANSI escape codes (e.g. \x1b[32m) into colored React spans
  const formatText = (text: string) => {
    if (!text) return '';
    
    // Split lines
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Regex to find color codes: \x1b[33m etc or standard esc [33m
      // eslint-disable-next-line no-control-regex
      const parts = line.split(/(\x1b\[\d+m)/g);
      let currentColorClass = 'text-zinc-300';

      const elements = parts.map((part, partIdx) => {
        if (part.startsWith('\x1b[') || part.startsWith('\x1B[')) {
          const code = part.match(/\d+/)?.[0];
          switch (code) {
            case '32': // Green
              currentColorClass = 'text-emerald-400 font-semibold';
              break;
            case '33': // Yellow
              currentColorClass = 'text-amber-400 font-semibold';
              break;
            case '31': // Red
              currentColorClass = 'text-rose-500 font-semibold';
              break;
            case '36': // Cyan
              currentColorClass = 'text-cyan-400 font-semibold';
              break;
            case '0': // Reset
            default:
              currentColorClass = 'text-zinc-300';
              break;
          }
          return null; // Don't render the code itself
        }
        return part ? (
          <span key={partIdx} className={currentColorClass}>
            {part}
          </span>
        ) : null;
      });

      return (
        <div key={lineIdx} className="min-h-[1.2rem] whitespace-pre-wrap font-mono text-xs md:text-sm">
          {elements}
        </div>
      );
    });
  };

  return (
    <div className="terminal-container">
      {/* Terminal Title Bar */}
      <div className="terminal-header">
        <div className="terminal-dots">
          <div className="dot dot-red" />
          <div className="dot dot-yellow" />
          <div className="dot dot-green" />
          <span className="terminal-title">bash - git-simulator</span>
        </div>
        <button 
          onClick={clearHistory}
          className="clear-logs-btn"
        >
          Clear Logs
        </button>
      </div>

      {/* Terminal Output Area */}
      <div 
        className="terminal-body custom-scrollbar select-text"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="terminal-welcome">
          HackerTerminal v1.0.4 initialized.<br />
          Type <span className="cli-command">"git help"</span> or tap shortcut buttons below.
        </div>

        {history.map((item, idx) => {
          if (item.type === 'input') {
            return (
              <div key={idx} className="cli-line">
                <span className="cli-prompt">hacker@terminal:~$</span>
                <span className="cli-command">{item.text}</span>
              </div>
            );
          } else {
            return (
              <div key={idx} className="cli-output-block">
                {formatText(item.text)}
              </div>
            );
          }
        })}
        <div ref={terminalEndRef} />
      </div>

      {/* Mobile Command Macro panel */}
      <div className="terminal-macros">
        <span className="macros-label">Macros:</span>
        <button onClick={() => handleShortcutClick('git init')} className="macro-btn">init</button>
        <button onClick={() => handleShortcutClick('git status')} className="macro-btn">status</button>
        <button onClick={() => handleShortcutClick('git add .')} className="macro-btn">add .</button>
        <button onClick={() => handleShortcutClick('git commit -m "patch security"')} className="macro-btn">commit</button>
        <button onClick={() => handleShortcutClick('git log')} className="macro-btn">log</button>
        <button onClick={() => handleShortcutClick('git branch')} className="macro-btn">branch</button>
        <button onClick={() => handleShortcutClick('git checkout -b patch-branch')} className="macro-btn">checkout -b</button>
        <button onClick={() => handleShortcutClick('git cherry-pick ')} className="macro-btn">cherry-pick</button>
        <button onClick={() => handleShortcutClick('clear')} className="macro-btn clear-btn">clear</button>
      </div>

      {/* Input Form Prompt */}
      <div className="terminal-prompt-bar">
        <span className="cli-prompt animate-pulse">hacker@terminal:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          className="terminal-input-field"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>
    </div>
  );
};
