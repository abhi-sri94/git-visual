export interface Commit {
  id: string;
  message: string;
  parentIds: string[];
  author: string;
  timestamp: number;
}

export interface LevelTargetParams {
  count?: number;
  name?: string;
  source?: string;
  target?: string;
}

export interface User {
  id: string;
  username: string;
  completedTutorials: string[];
}

export interface SavedRepo {
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

export interface Branch {
  name: string;
  commitId: string;
}

export interface GitFile {
  name: string;
  status: 'staged' | 'unstaged' | 'committed';
}

export interface GitState {
  repoName: string;
  commits: Record<string, Commit>;
  branches: Record<string, Branch>;
  activeBranch: string | null; // null if detached HEAD
  headCommitId: string | null;
  stagingArea: string[];
  files: GitFile[];
  initialized: boolean;
}

// Initial state for an uninitialized repository
export const getInitialState = (): GitState => ({
  repoName: '',
  commits: {},
  branches: {},
  activeBranch: null,
  headCommitId: null,
  stagingArea: [],
  files: [],
  initialized: false
});

// Helper to generate short hashes
const generateHash = (): string => {
  return Math.floor((1 + Math.random()) * 0x10000000)
    .toString(16)
    .substring(1, 8);
};

// Parser to split command line string into arguments respecting quotes
export const parseCommand = (cmdStr: string): string[] => {
  const matches = cmdStr.match(/[^"\s]+|"[^"]*"/g);
  if (!matches) return [];
  return matches.map(arg => arg.replace(/^"|"$/g, ''));
};

// Find the Lowest Common Ancestor (LCA) of two commits in the DAG
export const findLCA = (
  commits: Record<string, Commit>,
  commitIdA: string | null,
  commitIdB: string | null
): string | null => {
  if (!commitIdA || !commitIdB) return null;
  if (commitIdA === commitIdB) return commitIdA;

  // Gather all ancestors of commitIdA
  const visitedA = new Set<string>();
  const queueA = [commitIdA];

  while (queueA.length > 0) {
    const current = queueA.shift()!;
    if (visitedA.has(current)) continue;
    visitedA.add(current);
    const commit = commits[current];
    if (commit) {
      queueA.push(...commit.parentIds);
    }
  }

  // BFS from commitIdB to find the first ancestor in visitedA
  const queueB = [commitIdB];
  const visitedB = new Set<string>();

  while (queueB.length > 0) {
    const current = queueB.shift()!;
    if (visitedB.has(current)) continue;
    visitedB.add(current);

    if (visitedA.has(current)) {
      return current; // Found the common ancestor
    }

    const commit = commits[current];
    if (commit) {
      queueB.push(...commit.parentIds);
    }
  }

  return null;
};

// Check if commit A is an ancestor of commit B
const isAncestor = (
  commits: Record<string, Commit>,
  ancestorId: string,
  descendantId: string
): boolean => {
  if (ancestorId === descendantId) return true;
  const queue = [descendantId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current === ancestorId) return true;

    const commit = commits[current];
    if (commit) {
      queue.push(...commit.parentIds);
    }
  }

  return false;
};

// Main state transition function
export const runGitCommand = (
  state: GitState,
  commandStr: string
): { newState: GitState; output: string; success: boolean } => {
  const trimmed = commandStr.trim();
  if (!trimmed) {
    return { newState: state, output: '', success: true };
  }

  const args = parseCommand(trimmed);
  if (args.length === 0) {
    return { newState: state, output: '', success: true };
  }

  const baseCmd = args[0];
  if (baseCmd !== 'git') {
    return {
      newState: state,
      output: `bash: ${baseCmd}: command not found. (Use 'git' commands to interact)`,
      success: false
    };
  }

  if (args.length < 2) {
    return {
      newState: state,
      output: 'git: missing command. Type "git help" for options.',
      success: false
    };
  }

  const subCmd = args[1];

  // Help command
  if (subCmd === 'help') {
    const helpText = [
      'Git-Visual Hacking Console v1.0 - Available Commands:',
      '  git init                Initialize an empty local repository',
      '  git status              Show the working tree status',
      '  git add <file> | .      Stage files for commit',
      '  git commit -m "msg"     Record staging area changes to the history',
      '  git branch              List all branches',
      '  git branch <name>       Create a new branch at HEAD',
      '  git branch -d <name>    Delete a branch',
      '  git checkout <target>   Switch branches or commits (detached HEAD)',
      '  git checkout -b <name>  Create and switch to a new branch',
      '  git merge <branch>      Merge branch into current branch',
      '  git rebase <branch>     Rebase current branch onto target branch',
      '  git cherry-pick <hash>  Cherry-pick an existing commit onto HEAD',
      '  git log                 Show commit history logs'
    ].join('\n');
    return { newState: state, output: helpText, success: true };
  }

  // Repository initialization
  if (subCmd === 'init') {
    if (state.initialized) {
      return {
        newState: state,
        output: 'Reinitialized existing Git repository in /workspace',
        success: true
      };
    }
    const defaultFiles: GitFile[] = [
      { name: 'index.html', status: 'unstaged' },
      { name: 'style.css', status: 'unstaged' }
    ];
    const newState: GitState = {
      ...state,
      repoName: 'game-repo',
      initialized: true,
      activeBranch: 'main',
      branches: {
        main: { name: 'main', commitId: '' } // Points to empty commit initially
      },
      files: defaultFiles,
      headCommitId: null,
      commits: {},
      stagingArea: []
    };
    return {
      newState,
      output: 'Initialized empty Git repository in /workspace\nCreated files: index.html, style.css',
      success: true
    };
  }

  // All other commands require repository initialization
  if (!state.initialized) {
    return {
      newState: state,
      output: 'fatal: not a git repository (or any of the parent directories): .git\nRun "git init" first.',
      success: false
    };
  }

  switch (subCmd) {
    case 'status': {
      const active = state.activeBranch ? `On branch ${state.activeBranch}` : 'HEAD detached';
      const staged = state.files.filter(f => f.status === 'staged');
      const unstaged = state.files.filter(f => f.status === 'unstaged');

      let statusText = `${active}\n`;

      if (staged.length > 0) {
        statusText += '\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)\n';
        staged.forEach(f => {
          statusText += `\tstaged:    ${f.name}\n`;
        });
      }

      if (unstaged.length > 0) {
        statusText += '\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n';
        unstaged.forEach(f => {
          statusText += `\tmodified:  ${f.name}\n`;
        });
      }

      if (staged.length === 0 && unstaged.length === 0) {
        statusText += '\nnothing to commit, working tree clean';
      } else if (staged.length === 0) {
        statusText += '\nno changes added to commit (use "git add")';
      }

      return { newState: state, output: statusText, success: true };
    }

    case 'add': {
      if (args.length < 3) {
        return { newState: state, output: 'Nothing specified, nothing added.', success: false };
      }
      const target = args[2];
      let filesToStage: string[];

      if (target === '.' || target === '-A') {
        filesToStage = state.files.map(f => f.name);
      } else {
        const found = state.files.find(f => f.name === target);
        if (!found) {
          // Dynamic file creation: let them add files they make up
          filesToStage = [target];
        } else {
          filesToStage = [target];
        }
      }

      const updatedFiles = [...state.files];
      const newStaging = [...state.stagingArea];

      filesToStage.forEach(filename => {
        const index = updatedFiles.findIndex(f => f.name === filename);
        if (index >= 0) {
          updatedFiles[index] = { ...updatedFiles[index], status: 'staged' };
        } else {
          updatedFiles.push({ name: filename, status: 'staged' });
        }
        if (!newStaging.includes(filename)) {
          newStaging.push(filename);
        }
      });

      return {
        newState: {
          ...state,
          files: updatedFiles,
          stagingArea: newStaging
        },
        output: `staged ${filesToStage.length} file(s): ${filesToStage.join(', ')}`,
        success: true
      };
    }

    case 'commit': {
      // Find index of -m flag
      const mIndex = args.indexOf('-m');
      if (mIndex === -1 || mIndex === args.length - 1) {
        return {
          newState: state,
          output: 'error: switch `m\' requires a value\nUsage: git commit -m "commit message"',
          success: false
        };
      }

      const commitMsg = args[mIndex + 1];
      if (!commitMsg) {
        return { newState: state, output: 'error: empty commit message is not allowed.', success: false };
      }

      if (state.stagingArea.length === 0) {
        return {
          newState: state,
          output: 'On branch ' + (state.activeBranch || 'detached') + '\nnothing to commit, working tree clean',
          success: true
        };
      }

      const commitId = generateHash();
      const parentIds = state.headCommitId ? [state.headCommitId] : [];

      const newCommit: Commit = {
        id: commitId,
        message: commitMsg,
        parentIds,
        author: 'hacker',
        timestamp: Date.now()
      };

      const newCommits = { ...state.commits, [commitId]: newCommit };
      const newBranches = { ...state.branches };

      if (state.activeBranch) {
        newBranches[state.activeBranch] = {
          ...newBranches[state.activeBranch],
          commitId: commitId
        };
      }

      const committedFiles = state.files.map(f => {
        if (state.stagingArea.includes(f.name)) {
          return { ...f, status: 'committed' as const };
        }
        return f;
      });

      return {
        newState: {
          ...state,
          commits: newCommits,
          branches: newBranches,
          headCommitId: commitId,
          stagingArea: [],
          files: committedFiles
        },
        output: `[${state.activeBranch || 'detached-head'} ${commitId}] ${commitMsg}\n ${state.stagingArea.length} file(s) changed.`,
        success: true
      };
    }

    case 'branch': {
      if (args.length === 2) {
        // List branches
        const branchList = Object.keys(state.branches)
          .map(b => (b === state.activeBranch ? `* \x1b[32m${b}\x1b[0m` : `  ${b}`))
          .join('\n');
        return { newState: state, output: branchList || 'no branches', success: true };
      }

      // Check if delete flag
      if (args[2] === '-d' || args[2] === '-D') {
        const deleteName = args[3];
        if (!deleteName) {
          return { newState: state, output: 'fatal: branch name required.', success: false };
        }
        if (deleteName === state.activeBranch) {
          return { newState: state, output: `fatal: Cannot delete branch '${deleteName}' checked out at HEAD`, success: false };
        }
        if (!state.branches[deleteName]) {
          return { newState: state, output: `error: branch '${deleteName}' not found.`, success: false };
        }

        const newBranches = { ...state.branches };
        delete newBranches[deleteName];

        return {
          newState: { ...state, branches: newBranches },
          output: `Deleted branch ${deleteName} (was ${state.branches[deleteName].commitId.slice(0, 7) || 'empty'}).`,
          success: true
        };
      }

      // Create branch
      const branchName = args[2];
      if (!/^[a-zA-Z0-9_/-]+$/.test(branchName)) {
        return { newState: state, output: `fatal: '${branchName}' is not a valid branch name.`, success: false };
      }
      if (state.branches[branchName]) {
        return { newState: state, output: `fatal: A branch named '${branchName}' already exists.`, success: false };
      }

      const newBranches = {
        ...state.branches,
        [branchName]: {
          name: branchName,
          commitId: state.headCommitId || '' // points to current HEAD
        }
      };

      return {
        newState: { ...state, branches: newBranches },
        output: `Created branch '${branchName}' pointing to HEAD.`,
        success: true
      };
    }

    case 'checkout': {
      if (args.length < 3) {
        return { newState: state, output: 'fatal: Branch name or commit ID required.', success: false };
      }

      let checkoutName = args[2];
      let createNew = false;

      if (checkoutName === '-b') {
        createNew = true;
        checkoutName = args[3];
        if (!checkoutName) {
          return { newState: state, output: 'fatal: branch name required after -b.', success: false };
        }
      }

      if (createNew) {
        if (state.branches[checkoutName]) {
          return { newState: state, output: `fatal: A branch named '${checkoutName}' already exists.`, success: false };
        }
        // Create new branch and checkout
        const newBranches = {
          ...state.branches,
          [checkoutName]: {
            name: checkoutName,
            commitId: state.headCommitId || ''
          }
        };
        return {
          newState: {
            ...state,
            branches: newBranches,
            activeBranch: checkoutName,
            headCommitId: state.headCommitId
          },
          output: `Switched to a new branch '${checkoutName}'`,
          success: true
        };
      }

      // Check if checkoutName is an existing branch
      if (state.branches[checkoutName]) {
        const targetCommitId = state.branches[checkoutName].commitId || null;
        return {
          newState: {
            ...state,
            activeBranch: checkoutName,
            headCommitId: targetCommitId
          },
          output: `Switched to branch '${checkoutName}'` + (targetCommitId ? ` at commit ${targetCommitId}` : ' (empty branch)'),
          success: true
        };
      }

      // Check if checkoutName is a commit ID (detached HEAD)
      if (state.commits[checkoutName] || checkoutName.length >= 4) {
        // Look for partial matching hash
        const matchingId = Object.keys(state.commits).find(id => id.startsWith(checkoutName));
        if (matchingId) {
          return {
            newState: {
              ...state,
              activeBranch: null, // Detached
              headCommitId: matchingId
            },
            output: `Note: switching to '${matchingId.slice(0, 7)}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\ncommits and discard them.`,
            success: true
          };
        }
      }

      return { newState: state, output: `error: pathspec '${checkoutName}' did not match any file(s) known to git.`, success: false };
    }

    case 'log': {
      if (!state.headCommitId) {
        return { newState: state, output: 'fatal: your current branch \'' + (state.activeBranch || 'detached') + '\' does not have any commits yet.', success: false };
      }

      let logOutput = '';
      let currentId: string | null = state.headCommitId;
      const visited = new Set<string>();

      // Walk single parent line for traditional log output
      while (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);

        const commitNode: Commit | undefined = state.commits[currentId as string];
        if (!commitNode) break;

        const dateStr = new Date(commitNode.timestamp).toUTCString();
        logOutput += `\x1b[33mcommit ${commitNode.id}\x1b[0m\n`;
        logOutput += `Author: ${commitNode.author}\n`;
        logOutput += `Date:   ${dateStr}\n\n`;
        logOutput += `    ${commitNode.message}\n\n`;

        // Advance to first parent
        currentId = commitNode.parentIds.length > 0 ? commitNode.parentIds[0] : null;
      }

      return { newState: state, output: logOutput.trim(), success: true };
    }

    case 'merge': {
      if (args.length < 3) {
        return { newState: state, output: 'fatal: specify branch to merge.', success: false };
      }
      const targetBranch = args[2];
      if (!state.branches[targetBranch]) {
        return { newState: state, output: `merge: target branch '${targetBranch}' not found.`, success: false };
      }

      const activeCommitId = state.headCommitId;
      const targetCommitId = state.branches[targetBranch].commitId;

      if (!targetCommitId) {
        return { newState: state, output: `Already up to date. Target branch '${targetBranch}' is empty.`, success: true };
      }

      if (!activeCommitId) {
        // Fast forward empty active branch to target branch
        const newBranches = { ...state.branches };
        if (state.activeBranch) {
          newBranches[state.activeBranch] = {
            ...newBranches[state.activeBranch],
            commitId: targetCommitId
          };
        }
        return {
          newState: {
            ...state,
            branches: newBranches,
            headCommitId: targetCommitId
          },
          output: `Fast-forward: merged '${targetBranch}' into current branch.`,
          success: true
        };
      }

      // Check if activeCommitId is ancestor of targetCommitId (Fast-Forward possible)
      if (isAncestor(state.commits, activeCommitId, targetCommitId)) {
        const newBranches = { ...state.branches };
        if (state.activeBranch) {
          newBranches[state.activeBranch] = {
            ...newBranches[state.activeBranch],
            commitId: targetCommitId
          };
        }
        return {
          newState: {
            ...state,
            branches: newBranches,
            headCommitId: targetCommitId
          },
          output: `Updating ${activeCommitId.slice(0, 7)}..${targetCommitId.slice(0, 7)}\nFast-forward merge successful.`,
          success: true
        };
      }

      // Check if targetCommitId is ancestor of activeCommitId (Already merged)
      if (isAncestor(state.commits, targetCommitId, activeCommitId)) {
        return { newState: state, output: 'Already up to date.', success: true };
      }

      // Three-way merge: Find LCA
      const lca = findLCA(state.commits, activeCommitId, targetCommitId);

      // Create new merge commit
      const mergeCommitId = generateHash();
      const mergeMsg = `Merge branch '${targetBranch}' into ${state.activeBranch || 'HEAD'}`;

      const mergeCommit: Commit = {
        id: mergeCommitId,
        message: mergeMsg,
        parentIds: [activeCommitId, targetCommitId],
        author: 'hacker',
        timestamp: Date.now()
      };

      const newCommits = {
        ...state.commits,
        [mergeCommitId]: mergeCommit
      };

      const newBranches = { ...state.branches };
      if (state.activeBranch) {
        newBranches[state.activeBranch] = {
          ...newBranches[state.activeBranch],
          commitId: mergeCommitId
        };
      }

      return {
        newState: {
          ...state,
          commits: newCommits,
          branches: newBranches,
          headCommitId: mergeCommitId
        },
        output: `Merge made by the 'recursive' strategy.\n  Common ancestor: ${lca ? lca.slice(0, 7) : 'None'}\n  Created merge commit: ${mergeCommitId}`,
        success: true
      };
    }

    case 'rebase': {
      if (args.length < 3) {
        return { newState: state, output: 'fatal: specify target branch to rebase onto.', success: false };
      }
      const targetBranchName = args[2];
      const targetBranch = state.branches[targetBranchName];
      if (!targetBranch) {
        return { newState: state, output: `rebase: target branch '${targetBranchName}' not found.`, success: false };
      }

      const activeCommitId = state.headCommitId;
      const targetCommitId = targetBranch.commitId;

      if (!activeCommitId) {
        return { newState: state, output: 'fatal: current branch has no commits to rebase.', success: false };
      }
      if (!targetCommitId) {
        return { newState: state, output: `Already up to date. Target branch '${targetBranchName}' is empty.`, success: true };
      }

      // If activeCommitId is ancestor of targetCommitId, rebase is just a fast-forward merge
      if (isAncestor(state.commits, activeCommitId, targetCommitId)) {
        const newBranches = { ...state.branches };
        if (state.activeBranch) {
          newBranches[state.activeBranch] = {
            ...newBranches[state.activeBranch],
            commitId: targetCommitId
          };
        }
        return {
          newState: {
            ...state,
            branches: newBranches,
            headCommitId: targetCommitId
          },
          output: `Fast-forwarding to ${targetBranchName} (HEAD is up-to-date with rebase target).`,
          success: true
        };
      }

      // Find common ancestor LCA
      const lca = findLCA(state.commits, activeCommitId, targetCommitId);
      if (!lca) {
        return { newState: state, output: 'fatal: No common ancestor found. Cannot rebase disjoint histories.', success: false };
      }

      // Gather commits to replay: from LCA up to activeCommitId
      // We perform BFS or simple trace up from activeCommitId back to LCA
      const commitsToReplay: Commit[] = [];
      let currentId: string | null = activeCommitId;

      while (currentId && currentId !== lca) {
        const commitNode: Commit | undefined = state.commits[currentId as string];
        if (!commitNode) break;
        commitsToReplay.push(commitNode);
        currentId = commitNode.parentIds.length > 0 ? commitNode.parentIds[0] : null;
      }

      // We want to apply them in chronological order: reverse the list
      commitsToReplay.reverse();

      if (commitsToReplay.length === 0) {
        return { newState: state, output: 'Already up to date.', success: true };
      }

      // Replay commits one by one onto targetCommitId
      const newCommits = { ...state.commits };
      let lastCommitId = targetCommitId;
      const logDetails: string[] = [];

      for (const commit of commitsToReplay) {
        const replayedId = generateHash();
        const replayedCommit: Commit = {
          id: replayedId,
          message: `${commit.message} (rebased)`,
          parentIds: [lastCommitId],
          author: commit.author,
          timestamp: Date.now()
        };

        newCommits[replayedId] = replayedCommit;
        logDetails.push(`Replaying commit: ${commit.id.slice(0, 7)} -> ${replayedId} (${commit.message})`);
        lastCommitId = replayedId;
      }

      const newBranches = { ...state.branches };
      if (state.activeBranch) {
        newBranches[state.activeBranch] = {
          ...newBranches[state.activeBranch],
          commitId: lastCommitId
        };
      }

      return {
        newState: {
          ...state,
          commits: newCommits,
          branches: newBranches,
          headCommitId: lastCommitId
        },
        output: `Successfully rebased and updated refs/heads/${state.activeBranch || 'HEAD'}.\n\nRebase Summary:\n` + logDetails.join('\n'),
        success: true
      };
    }

    case 'cherry-pick': {
      if (args.length < 3) {
        return { newState: state, output: 'fatal: commit hash required.', success: false };
      }

      const targetHash = args[2];
      let targetCommitId = targetHash;
      let targetCommit = state.commits[targetCommitId];

      if (!targetCommit) {
        // Find matching commit hash by prefix
        const matchingId = Object.keys(state.commits).find(id => id.startsWith(targetHash));
        if (matchingId) {
          targetCommitId = matchingId;
          targetCommit = state.commits[targetCommitId];
        }
      }

      if (!targetCommit) {
        return { newState: state, output: `fatal: commit '${targetHash}' not found.`, success: false };
      }

      if (!state.headCommitId) {
        return { newState: state, output: 'fatal: cherry-pick is not possible because you have no commits yet.', success: false };
      }

      if (targetCommitId === state.headCommitId) {
        return { newState: state, output: `The commit '${targetCommitId.slice(0, 7)}' is already the current HEAD. Nothing to cherry-pick.`, success: true };
      }

      // Check if targetCommit is an ancestor of current HEAD
      if (isAncestor(state.commits, targetCommitId, state.headCommitId)) {
        return { newState: state, output: `The commit '${targetCommitId.slice(0, 7)}' is already an ancestor of HEAD. Nothing to cherry-pick.`, success: true };
      }

      // Create new cherry-picked commit node
      const newCommitId = generateHash();
      const newCommitMsg = targetCommit.message;

      const newCommit: Commit = {
        id: newCommitId,
        message: newCommitMsg,
        parentIds: [state.headCommitId],
        author: targetCommit.author,
        timestamp: Date.now()
      };

      const newCommits = {
        ...state.commits,
        [newCommitId]: newCommit
      };

      const newBranches = { ...state.branches };
      if (state.activeBranch) {
        newBranches[state.activeBranch] = {
          ...newBranches[state.activeBranch],
          commitId: newCommitId
        };
      }

      // Mark files as committed
      const committedFiles = state.files.map(f => ({ ...f, status: 'committed' as const }));

      return {
        newState: {
          ...state,
          commits: newCommits,
          branches: newBranches,
          headCommitId: newCommitId,
          files: committedFiles,
          stagingArea: []
        },
        output: `[${state.activeBranch || 'detached-head'} ${newCommitId}] ${newCommit.message}\n Cherry-picked commit ${targetCommitId.slice(0, 7)} successfully.`,
        success: true
      };
    }

    default:
      return {
        newState: state,
        output: `git: '${subCmd}' is not a git command. See 'git help'.`,
        success: false
      };
  }
};

// Check if a tutorial goal has been reached
export const checkTutorialTarget = (
  state: GitState,
  targetType: string,
  params: LevelTargetParams
): { success: boolean; message: string } => {
  if (!state.initialized) {
    return { success: false, message: 'Repository is not initialized yet. Run "git init"' };
  }

  switch (targetType) {
    case 'init':
      return { success: true, message: 'Excellent! Repository initialized successfully.' };

    case 'commit': {
      const minCommits = params.count || 1;
      const totalCommits = Object.keys(state.commits).length;
      if (totalCommits >= minCommits) {
        return { success: true, message: `Awesome! You created a commit.` };
      }
      return { success: false, message: `You need to create at least ${minCommits} commit(s) using "git commit -m"` };
    }

    case 'create_branch': {
      const branchName = params.name;
      if (branchName && state.branches[branchName]) {
        return { success: true, message: `Great! Branch '${branchName}' created.` };
      }
      return { success: false, message: `You need to create a branch named '${branchName || ''}' using "git branch ${branchName || ''}"` };
    }

    case 'checkout_branch': {
      const branchName = params.name;
      if (branchName && state.activeBranch === branchName) {
        return { success: true, message: `Well done! Checked out '${branchName}'.` };
      }
      return { success: false, message: `You need to checkout branch '${branchName || ''}' using "git checkout ${branchName || ''}"` };
    }

    case 'merge_branch': {
      const source = params.source; // e.g. "feature"
      const target = params.target; // e.g. "main"
      
      if (!source || !target) {
        return { success: false, message: 'Source and target branches must be specified.' };
      }

      const targetBranch = state.branches[target];
      const sourceBranch = state.branches[source];

      if (!targetBranch || !sourceBranch) {
        return { success: false, message: `Both ${target} and ${source} branches must exist.` };
      }

      // Check if source branch is merged into target branch
      // This means sourceCommit is ancestor of targetCommit
      if (isAncestor(state.commits, sourceBranch.commitId, targetBranch.commitId) && state.activeBranch === target) {
        return { success: true, message: `Incredible! Branch '${source}' merged successfully into '${target}'.` };
      }
      return { success: false, message: `Ensure you are on '${target}' and run "git merge ${source}"` };
    }

    case 'rebase_branch': {
      const source = params.source; // the branch we rebased (e.g. "feature")
      const target = params.target; // the branch we rebased onto (e.g. "main")

      if (!source || !target) {
        return { success: false, message: 'Source and target branches must be specified.' };
      }

      const sourceBranch = state.branches[source];
      const targetBranch = state.branches[target];

      if (!sourceBranch || !targetBranch) {
        return { success: false, message: `Both branches must exist for rebase.` };
      }

      // After rebase, the rebased branch's commit (source) should have the target's commit as an ancestor,
      // and it should NOT be a simple merge node (should have linear parents back to target).
      if (isAncestor(state.commits, targetBranch.commitId, sourceBranch.commitId)) {
        // Walk parents of source branch commit to check if we hit target branch commit in a linear line (1 parent)
        let curr = sourceBranch.commitId;
        let linear = true;
        while (curr && curr !== targetBranch.commitId) {
          const c = state.commits[curr];
          if (!c) { linear = false; break; }
          if (c.parentIds.length > 1) {
            linear = false; // Merge commit detected, which is not rebase
            break;
          }
          curr = c.parentIds.length > 0 ? c.parentIds[0] : '';
        }
        if (linear && curr === targetBranch.commitId) {
          return { success: true, message: `Brilliant! '${source}' successfully rebased onto '${target}' linearly.` };
        }
      }
      return { success: false, message: `Rebase '${source}' onto '${target}' using "git checkout ${source}" and "git rebase ${target}"` };
    }

    default:
      return { success: false, message: 'Unknown tutorial target criteria.' };
  }
};
