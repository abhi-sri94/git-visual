import type { GitState, Commit, LevelTargetParams } from './gitEngine';

export interface Level {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  instructions: string[];
  initialState: () => GitState;
  targetType: string;
  targetParams: LevelTargetParams;
}

export const levels: Level[] = [
  {
    id: 'git-init',
    title: '1. The Digital Sandbox',
    difficulty: 'Beginner',
    description: 'Every hacker starts by initializing their environment. Build your first repository.',
    instructions: [
      'Initialize git using: `git init`',
      'Stage the default files for tracking using: `git add .` or `git add index.html`',
      'Create your first commit with a message: `git commit -m "initial commit"`'
    ],
    initialState: () => ({
      repoName: '',
      commits: {},
      branches: {},
      activeBranch: null,
      headCommitId: null,
      stagingArea: [],
      files: [],
      initialized: false
    }),
    targetType: 'commit',
    targetParams: { count: 1 }
  },
  {
    id: 'git-branch',
    title: '2. Divergent Timelines',
    difficulty: 'Beginner',
    description: 'Branches allow you to work on separate security features without corrupting the main codebase.',
    instructions: [
      'We have pre-initialized a repository for you with one commit on `main`.',
      'Create a new branch named `cyber-patch`: `git branch cyber-patch`',
      'Switch into your new branch to activate it: `git checkout cyber-patch` (or do it in one command: `git checkout -b cyber-patch`)'
    ],
    initialState: () => {
      const c1Id = 'e2b83a1';
      const c1: Commit = {
        id: c1Id,
        message: 'initial core layout',
        parentIds: [],
        author: 'core_dev',
        timestamp: Date.now() - 3600000
      };
      return {
        repoName: 'game-repo',
        commits: { [c1Id]: c1 },
        branches: {
          main: { name: 'main', commitId: c1Id }
        },
        activeBranch: 'main',
        headCommitId: c1Id,
        stagingArea: [],
        files: [
          { name: 'index.html', status: 'committed' },
          { name: 'style.css', status: 'committed' }
        ],
        initialized: true
      };
    },
    targetType: 'checkout_branch',
    targetParams: { name: 'cyber-patch' }
  },
  {
    id: 'git-merge',
    title: '3. Re-integrating the Core',
    difficulty: 'Intermediate',
    description: 'After completing a feature on a side branch, merge it back into the main branch to deploy changes.',
    instructions: [
      'You are on the `feature-exploit` branch which has a commit not present on `main`.',
      'Switch back to the main branch: `git checkout main`',
      'Merge the exploit updates into main: `git merge feature-exploit`'
    ],
    initialState: () => {
      const c1Id = 'c111111';
      const c2Id = 'c222222';
      
      const c1: Commit = {
        id: c1Id,
        message: 'initialize network server',
        parentIds: [],
        author: 'core_dev',
        timestamp: Date.now() - 7200000
      };
      const c2: Commit = {
        id: c2Id,
        message: 'upload firewall exploit',
        parentIds: [c1Id],
        author: 'hacker',
        timestamp: Date.now() - 3600000
      };

      return {
        repoName: 'game-repo',
        commits: {
          [c1Id]: c1,
          [c2Id]: c2
        },
        branches: {
          main: { name: 'main', commitId: c1Id },
          'feature-exploit': { name: 'feature-exploit', commitId: c2Id }
        },
        activeBranch: 'feature-exploit',
        headCommitId: c2Id,
        stagingArea: [],
        files: [
          { name: 'index.html', status: 'committed' },
          { name: 'server.js', status: 'committed' },
          { name: 'exploit.py', status: 'committed' }
        ],
        initialized: true
      };
    },
    targetType: 'merge_branch',
    targetParams: { source: 'feature-exploit', target: 'main' }
  },
  {
    id: 'git-rebase',
    title: '4. Streamlining History',
    difficulty: 'Advanced',
    description: 'Rebase allows you to rewrite commit history, replaying your branch commits onto a newer base for a clean, linear log.',
    instructions: [
      'We have a diverged history: both `main` and `bypass-patch` have new commits.',
      'Check out the `bypass-patch` branch: `git checkout bypass-patch`',
      'Rebase it onto main to serialize commits: `git rebase main`',
      'Notice how the branch structure gets rewritten linearly!'
    ],
    initialState: () => {
      const c1Id = 'a100000'; // root
      const c2Id = 'b200000'; // main head
      const c3Id = 'c300000'; // bypass head

      const c1: Commit = {
        id: c1Id,
        message: 'root structure',
        parentIds: [],
        author: 'root',
        timestamp: Date.now() - 10800000
      };
      const c2: Commit = {
        id: c2Id,
        message: 'update security headers on main',
        parentIds: [c1Id],
        author: 'security_bot',
        timestamp: Date.now() - 7200000
      };
      const c3: Commit = {
        id: c3Id,
        message: 'inject sub-net bypass script',
        parentIds: [c1Id],
        author: 'hacker',
        timestamp: Date.now() - 3600000
      };

      return {
        repoName: 'game-repo',
        commits: {
          [c1Id]: c1,
          [c2Id]: c2,
          [c3Id]: c3
        },
        branches: {
          main: { name: 'main', commitId: c2Id },
          'bypass-patch': { name: 'bypass-patch', commitId: c3Id }
        },
        activeBranch: 'main',
        headCommitId: c2Id,
        stagingArea: [],
        files: [
          { name: 'index.html', status: 'committed' },
          { name: 'main.js', status: 'committed' }
        ],
        initialized: true
      };
    },
    targetType: 'rebase_branch',
    targetParams: { source: 'bypass-patch', target: 'main' }
  }
];
