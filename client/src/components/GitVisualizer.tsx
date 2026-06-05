import { useMemo, type FC } from 'react';
import type { GitState, Commit } from '../utils/gitEngine';

interface GitVisualizerProps {
  gitState: GitState;
  onSelectCommit: (commit: Commit | null) => void;
  selectedCommit: Commit | null;
}

export const GitVisualizer: FC<GitVisualizerProps> = ({
  gitState,
  onSelectCommit,
  selectedCommit
}) => {
  const { commits, branches, activeBranch, headCommitId } = gitState;

  // Topological / chronological sorting of commits
  const sortedCommits = useMemo(() => {
    const list = Object.values(commits);
    // Sort by timestamp (chronological) to ensure parents render above children
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [commits]);

  // Compute 2D layout coordinates for each commit node
  const layout = useMemo(() => {
    const commitCoords: Record<string, { x: number; y: number; column: number }> = {};
    const columnNextAvailableY: Record<number, number> = {};
    
    // Assign columns to branches to keep tracks consistent
    // E.g., main is 0, others are 1, 2, 3...
    const branchNames = Object.keys(branches);
    const branchToCol: Record<string, number> = {};
    
    // Always put main in the center (column 0)
    branchToCol['main'] = 0;
    let colIdx = 1;
    branchNames.forEach(b => {
      if (b !== 'main') {
        branchToCol[b] = colIdx++;
      }
    });

    const spacingX = 80;
    const spacingY = 75;
    const startY = 50;

    sortedCommits.forEach((commit, index) => {
      const y = startY + index * spacingY;
      let column: number;

      // 1. Determine column/track index
      if (commit.parentIds.length === 0) {
        // Root commit goes to main column
        column = 0;
      } else {
        const firstParentId = commit.parentIds[0];
        const parentCoord = commitCoords[firstParentId];
        
        if (parentCoord) {
          // If first parent's column hasn't been used at this Y level yet
          const parentCol = parentCoord.column;
          const lastY = columnNextAvailableY[parentCol] || 0;
          
          if (y > lastY) {
            column = parentCol;
          } else {
            // Split branch - find new column
            column = colIdx++;
          }
        } else {
          column = 0;
        }
      }

      // Check if this commit has a branch label directly on it
      const pointingBranches = Object.values(branches).filter(b => b.commitId === commit.id);
      if (pointingBranches.length > 0) {
        // Shift column to match the branch if possible
        const primaryBranch = pointingBranches.find(b => b.name === activeBranch) || pointingBranches[0];
        if (branchToCol[primaryBranch.name] !== undefined) {
          column = branchToCol[primaryBranch.name];
        }
      }

      columnNextAvailableY[column] = y;

      // Map x coordinate centered on column 0
      // Col 0 = center (e.g. offset = 180)
      // Col 1 = center + 80, Col 2 = center + 160
      // Col 3 = center - 80, Col 4 = center - 160 (alternating left/right)
      let xOffset = 0;
      if (column > 0) {
        if (column % 2 === 1) {
          xOffset = Math.ceil(column / 2) * spacingX; // right side
        } else {
          xOffset = -Math.ceil(column / 2) * spacingX; // left side
        }
      }

      commitCoords[commit.id] = {
        x: xOffset,
        y,
        column
      };
    });

    return commitCoords;
  }, [sortedCommits, branches, activeBranch]);

  // Generate SVG dimensions
  const svgHeight = useMemo(() => {
    const margin = 100;
    if (sortedCommits.length === 0) return 150;
    return sortedCommits.length * 75 + margin;
  }, [sortedCommits]);

  // Determine branch colors
  const getBranchColor = (colIdx: number): string => {
    const colors = [
      '#00f0ff', // main: cyan
      '#ff007f', // track 1: neon pink
      '#39ff14', // track 2: neon green
      '#ffff00', // track 3: yellow
      '#bd00ff', // track 4: purple
      '#ff5a00'  // track 5: orange
    ];
    return colors[colIdx % colors.length];
  };

  if (sortedCommits.length === 0) {
    return (
      <div className="visualizer-uninitialized">
        <div className="pulse-icon">
          <span>Git</span>
        </div>
        <p className="uninitialized-title">Repository uninitialized.</p>
        <p className="uninitialized-subtitle">Run "git init" in the terminal to view branch visualization.</p>
      </div>
    );
  }

  // Find branches pointing to each commit ID
  const getCommitBranches = (commitId: string) => {
    return Object.values(branches).filter(b => b.commitId === commitId);
  };

  return (
    <div className="visualizer-container custom-scrollbar">
      {/* Visual Ambient Scanline Grid background */}
      <div className="scanline-overlay" />
      
      <div className="visualizer-content">
        <svg
          width="100%"
          height={svgHeight}
          style={{ maxWidth: '600px', overflow: 'visible' }}
          viewBox={`-250 0 500 ${svgHeight}`}
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-active" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feColorMatrix type="matrix" values="0 0 0 0 0   0 1 0 0 0   0 0 1 0 0  0 0 0 1 0" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Draw connecting lines (edges) with bezier curves */}
          {sortedCommits.map(commit => {
            const childCoord = layout[commit.id];
            if (!childCoord) return null;

            return commit.parentIds.map(parentId => {
              const parentCoord = layout[parentId];
              if (!parentCoord) return null;

              const x1 = parentCoord.x;
              const y1 = parentCoord.y;
              const x2 = childCoord.x;
              const y2 = childCoord.y;

              const color = getBranchColor(childCoord.column);

              // Render smooth bezier curves between parents and children
              // This handles branching out and merging in beautifully
              let dPath: string;
              if (x1 === x2) {
                dPath = `M ${x1} ${y1} L ${x2} ${y2}`;
              } else {
                const dy = y2 - y1;
                dPath = `M ${x1} ${y1} C ${x1} ${y1 + dy / 2}, ${x2} ${y2 - dy / 2}, ${x2} ${y2}`;
              }

              return (
                <path
                  key={`${parentId}-${commit.id}`}
                  d={dPath}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeOpacity="0.8"
                  style={{ filter: 'url(#glow)' }}
                />
              );
            });
          })}

          {/* 2. Draw commit nodes */}
          {sortedCommits.map(commit => {
            const coord = layout[commit.id];
            if (!coord) return null;

            const isHead = commit.id === headCommitId;
            const isSelected = selectedCommit && selectedCommit.id === commit.id;
            const color = getBranchColor(coord.column);

            const pointingBranches = getCommitBranches(commit.id);
            const hasLabels = pointingBranches.length > 0;

            return (
              <g key={commit.id} className="cursor-pointer" onClick={() => onSelectCommit(commit)}>
                {/* Active HEAD indicator ring (pulses) */}
                {isHead && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="14"
                    fill="none"
                    stroke="#39ff14"
                    strokeWidth="1.5"
                    opacity="0.7"
                    className="pulse-ping"
                    style={{ transformOrigin: `${coord.x}px ${coord.y}px` }}
                  />
                )}

                {/* Outer Glow Ring for selection */}
                {isSelected && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="11"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ filter: 'url(#glow)' }}
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r="7.5"
                  fill="#0c0d12"
                  stroke={isHead ? '#39ff14' : color}
                  strokeWidth={isHead || isSelected ? '4.5' : '3'}
                  style={{ filter: isHead ? 'url(#glow-active)' : 'url(#glow)' }}
                />

                {/* Node Label (Hash abbreviated) */}
                <text
                  x={coord.x + 14}
                  y={coord.y + 4}
                  fill={isHead ? '#39ff14' : isSelected ? '#ffffff' : '#a1a1aa'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                >
                  {commit.id.slice(0, 7)}
                </text>

                {/* Branch reference tags */}
                {hasLabels && (
                  <g transform={`translate(${coord.x}, ${coord.y - 10})`}>
                    {pointingBranches.map((branch, bIdx) => {
                      const isActiveBr = branch.name === activeBranch;
                      const labelText = branch.name + (isActiveBr ? ' (HEAD)' : '');
                      const labelWidth = Math.max(70, labelText.length * 5.5 + 10);
                      return (
                        <g key={branch.name} transform={`translate(${-labelWidth - 15}, ${bIdx * 16})`}>
                          {/* Label background */}
                          <rect
                            x="0"
                            y="0"
                            width={labelWidth}
                            height="14"
                            rx="3"
                            fill={isActiveBr ? '#052e16' : '#1e1b4b'}
                            stroke={isActiveBr ? '#39ff14' : '#bd00ff'}
                            strokeWidth="1"
                          />
                          {/* Label Text */}
                          <text
                            x={labelWidth / 2}
                            y="10"
                            fill={isActiveBr ? '#39ff14' : '#e0e7ff'}
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {labelText}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
