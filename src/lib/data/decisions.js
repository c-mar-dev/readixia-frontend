// Shared decision data and configuration
// Used by all views: main queue, inbox, focus, and entity timeline

export const mockDecisions = [
  // --- 1. Triage Card ---
  {
    id: 'd_triage1',
    decisionType: 'triage',
    status: 'pending',
    subject: { type: 'task', id: 't_triage1', title: 'Write Q1 report', source: 'todoist', originalText: 'Write Q1 report, need by EOY' },
    project: 'Q1 Planning',
    priority: 'normal',
    question: 'Route this item',
    created: '2m ago',
    data: {
      destination: ['Quick Win (Todoist)', 'Project Task (Obsidian)', 'Reference'],
      suggestedDestination: 'Project Task (Obsidian)',
      suggestedProject: 'Q1 Planning',
      suggestedPriority: 'p2'
    }
  },

  // --- 2. Specification Card ---
  {
    id: 'd_spec1',
    decisionType: 'specification',
    status: 'pending',
    subject: { type: 'task', id: 't_spec1', title: 'Write Q1 report', source: 'todoist' },
    project: 'Q1 Planning',
    priority: 'high',
    question: 'Define spec',
    created: '5m ago',
    data: {
      context: 'Project [[Q1 Planning]], Source: Todoist',
      aiSpec: {
        objective: 'Draft a comprehensive Q1 report covering key metrics and achievements.',
        targetAudience: 'Executive Team',
        format: 'PDF Report',
        keyThemes: 'Economic impact, legislative feasibility'
      },
      successCriteria: [
        { id: 'sc1', text: 'Must include executive summary', checked: true },
        { id: 'sc2', text: 'Must cite at least 3 sources', checked: true }
      ],
      contextFiles: [
        { name: 'Q1 Planning', status: 'included' },
        { name: 'Q4 Report', status: 'excluded', reason: 'outdated' }
      ]
    }
  },

  // --- 3. Clarification Card ---
  {
    id: 'd_clarify1',
    decisionType: 'clarification',
    status: 'pending',
    subject: { type: 'task', id: 't_clarify1', title: 'Write Q1 report', source: 'manual' },
    project: 'Legal Compliance',
    priority: 'urgent',
    question: 'Claude needs 3 answers before starting',
    created: '10m ago',
    clarificationQuestions: [
      { id: 'q1', type: 'choice', text: 'You mentioned "the standard format" - do you mean:', options: ['Internal Brief format', 'External Publication format', 'Other'] },
      { id: 'q2', type: 'text', text: 'I see "Senator Smith" in context, but no recent meeting notes. Should I rely on his 2023 voting record, or do you have newer intel?' },
      { id: 'q3', type: 'number', text: 'What is the maximum word count?' }
    ]
  },

  // --- 4. Verification Card ---
  {
    id: 'd_verify1',
    decisionType: 'verification',
    status: 'pending',
    subject: { type: 'task', id: 't_verify1', title: 'Write Q1 report', source: 'todoist' },
    project: 'Marketing Site',
    priority: 'high',
    question: 'Verification Results',
    created: '5m ago',
    data: {
      attempt: 2,
      maxAttempts: 3,
      verifier: 'Claude Sonnet',
      criteriaResults: [
        { text: 'Must include executive summary', status: 'pass', note: 'PASS' },
        { text: 'Must cite at least 3 sources', status: 'pass', note: 'PASS - found 4' },
        { text: 'Tone must be "Neutral/Academic"', status: 'fail', note: 'FAIL - too persuasive' },
        { text: 'Word count 400-600', status: 'pass', note: 'PASS - 523 words' }
      ],
      feedback: 'The introduction uses persuasive language ("clearly" and "obviously"). Suggest replacing with neutral alternatives.'
    }
  },

  // --- 5. Review Card ---
  {
    id: 'd_review1',
    decisionType: 'review',
    status: 'pending',
    subject: { type: 'task', id: 't_review1', title: 'Write Q1 report', source: 'manual' },
    project: 'Backend API',
    priority: 'urgent',
    question: 'Review work',
    created: '1h ago',
    data: {
      completedBy: 'Claude (2 attempts)',
      verified: true,
      specSummary: {
        objective: 'Draft Q1 report...',
        criteria: ['Executive summary', '3+ citations', 'Neutral tone', '400-600 words']
      },
      resultSummary: {
        preview: 'Executive Summary:\nThe Q1 report outlines...',
        fullDocLink: '#',
        diffLink: '#'
      }
    }
  },

  // --- 6. Conflict Card ---
  {
    id: 'd_conflict1',
    decisionType: 'conflict',
    status: 'pending',
    subject: { type: 'task', id: 't_conflict1', title: 'Write Q1 report', source: 'manual' },
    priority: 'urgent',
    question: 'Conflict detected',
    created: 'Just now',
    data: {
      filePath: 'tasks/write-q1-report.md',
      conflictType: 'concurrent',
      myVersion: {
        seq: 47,
        timestamp: '2 min ago',
        actor: 'You (Obsidian)',
        changes: ['priority: p2', '_state: specifying'],
        // Deprecated fields for backwards compat
        modified: '2 min ago',
        by: 'You (Obsidian)'
      },
      incomingVersion: {
        seq: 47,
        timestamp: '1 min ago',
        actor: 'Claude (worker)',
        changes: ['priority: p1', '_state: specified'],
        // Deprecated fields for backwards compat
        modified: '1 min ago',
        by: 'Claude (worker)'
      }
    }
  },

  // --- 7. Escalation Card ---
  {
    id: 'd_escalate1',
    decisionType: 'escalation',
    status: 'pending',
    subject: { type: 'task', id: 't_escalate1', title: 'Write Q1 report', source: 'manual' },
    priority: 'urgent',
    question: 'Needs your help',
    created: '5m ago',
    data: {
      reason: 'Max retries exceeded',
      attempts: 3,
      lastError: 'Criterion #2 failed',
      history: [
        'Attempt 1: "Tone too persuasive" -> Retried with feedback',
        'Attempt 2: "Still using \'clearly\'" -> Retried with feedback',
        'Attempt 3: "Word \'obviously\' found" -> Max retries exceeded'
      ],
      draftPreview: '"The Q1 results clearly show that our strategy is working..."'
    }
  },

  // --- 8. Enrichment Card ---
  {
    id: 'd_enrich1',
    decisionType: 'enrichment',
    status: 'pending',
    subject: { type: 'transcript', id: 't_enrich1', title: 'team-meeting-2024-12-15.md', source: 'upload' },
    project: null,
    priority: 'normal',
    question: 'Enrich transcript',
    created: '2h ago',
    data: {
      duration: '45 min',
      autoDetected: 'Product discussion',
      preview: '...so for Q1 we need to prioritize the mobile app launch...', 
      suggestedProject: 'Product Launch',
      speakers: [
        { name: 'John Smith (Product)', selected: true },
        { name: 'Sarah Chen (Engineering)', selected: true }
      ],
      date: 'Dec 15, 2024'
    }
  },

    // --- ADDITIONAL EXAMPLES ---
  
    // 10. Triage (Email Source)
    {
      id: 'd_triage2',
      decisionType: 'triage',
      status: 'pending',
      subject: { type: 'email', id: 't_triage2', title: 'Fwd: Invoice attached', source: 'email', originalText: 'Please pay this by Friday' },
      project: 'Finance',
      priority: 'high',
      question: 'Route this item',
      created: '15m ago',
      data: {
        destination: ['Quick Win', 'Reference', 'Delegate'],
        suggestedDestination: 'Quick Win',
        suggestedProject: 'Finance',
        suggestedPriority: 'p1'
      }
    },
  
    // 11. Specification (Technical Task)
    {
      id: 'd_spec2',
      decisionType: 'specification',
      status: 'pending',
      subject: { type: 'task', id: 't_spec2', title: 'Optimize database queries', source: 'manual' },
      project: 'Backend API',
      priority: 'normal',
      question: 'Define spec',
      created: '30m ago',
      data: {
        context: 'Project [[Backend API]], Source: Manual',
        aiSpec: {
          objective: 'Reduce latency of /users endpoint by 50%.',
          constraints: 'Must not break existing tests.',
          techStack: 'PostgreSQL, Node.js'
        },
        successCriteria: [
          { id: 'sc1', text: 'p99 latency < 200ms', checked: false },
          { id: 'sc2', text: 'All tests pass', checked: true }
        ]
      }
    },
  
      // 12. Review (Rejected)
      {
        id: 'd_review2',
        decisionType: 'review',
        status: 'pending',
        subject: { type: 'task', id: 't_review2', title: 'New Logo Design', source: 'manual' },
        project: 'Marketing',
        priority: 'normal',
        question: 'Review work',
        created: '2h ago',
        data: {
          completedBy: 'Claude (1 attempt)',
          verified: true,
          specSummary: {
            objective: 'Create a modern, minimalist logo.',
            format: 'SVG'
          },
          resultSummary: {
            preview: '[SVG Image Placeholder]',
            fullDocLink: '#'
          }
        }
      },
    
        // 13. Meeting Triage (Restored)
    
        {
    
          id: 'd_mt1',
    
          decisionType: 'meeting_tasks',
    
          status: 'pending',
    
          subject: {
    
            type: 'transcript',
    
            id: 'mt1',
    
            title: 'Q1 Planning Kickoff',
    
            source: 'zoom',
    
            date: 'Dec 10, 2024',
    
            duration: '52 min'
    
          },
    
          project: 'Q1 Planning',
    
          priority: 'normal',
    
          question: 'Which tasks from this meeting should be added to your queue?',
    
          created: '2h ago',
    
          data: {
    
            extractedTasks: [
    
              { id: 'mt1_t1', title: 'Draft Q1 OKRs document', assignee: 'You', priority: 'high', checked: true },
    
              { id: 'mt1_t2', title: 'Schedule 1:1s with team leads', assignee: 'You', priority: 'normal', checked: false },
    
              { id: 'mt1_t3', title: 'Review budget allocation spreadsheet', assignee: 'Team', priority: 'normal', checked: false },
    
              { id: 'mt1_t4', title: 'Set up Q1 project tracking board', assignee: 'You', priority: 'normal', checked: true },
    
              { id: 'mt1_t5', title: 'Send recap email to stakeholders', assignee: 'You', priority: 'high', checked: false }
    
            ]
    
          }
    
        },
    
      
    
        // 14. Standard Task (From Slack)
    
        {
    
          id: 'd_triage3',
    
          decisionType: 'triage',
    
          status: 'pending',
    
          subject: { type: 'task', id: 't_slack1', title: 'Update API Docs for v2', source: 'slack', originalText: 'Can you update the docs? They are outdated.' },
    
          project: 'Backend API',
    
          priority: 'normal',
    
          question: 'Route this item',
    
          created: '3h ago',
    
          data: {
    
            destination: ['Quick Win', 'Project Task', 'Delegate'],
    
            suggestedDestination: 'Project Task',
    
            suggestedProject: 'Backend API',
    
            suggestedPriority: 'p2'
    
          }
    
        },
    
      
    
        // 15. Clarification (Missing Info)
    
        {
    
          id: 'd_clarify2',
    
          decisionType: 'clarification',
    
          status: 'pending',
    
          subject: { type: 'task', id: 't_clarify2', title: 'Prepare slide deck', source: 'manual' },
    
          project: 'Marketing',
    
          priority: 'normal',
    
          question: 'Claude needs answers',
    
          created: '4h ago',
    
          clarificationQuestions: [
    
            { id: 'q1', type: 'text', text: 'Who is the target audience for this presentation?' },

            { id: 'q2', type: 'choice', text: 'How many slides roughly?', options: ['5-10', '10-20', '20+'] }

          ]

        },

    // --- 16. Checkpoint Card ---
    {
      id: 'd_checkpoint1',
      decisionType: 'checkpoint',
      status: 'pending',
      subject: { type: 'task', id: 't_checkpoint1', title: 'Optimize database queries', source: 'manual' },
      project: 'Backend API',
      priority: 'high',
      question: 'Agent needs clarification to continue',
      created: 'Just now',
      clarificationQuestions: [
        { id: 'cp1', type: 'choice', text: 'Should I prioritize read performance or write performance?', options: ['Read performance', 'Write performance', 'Balanced'] },
        { id: 'cp2', type: 'text', text: 'Are there any specific tables I should avoid modifying?' }
      ],
      data: {
        taskContext: 'Optimizing /users endpoint queries',
        agentName: 'Claude Executor',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        progress: 'Step 2 of 5'
      }
    },

    // --- 17. Approval Card ---
    {
      id: 'd_approval1',
      decisionType: 'approval',
      status: 'pending',
      subject: { type: 'task', id: 't_approval1', title: 'Deploy to production', source: 'ci' },
      project: 'Backend API',
      priority: 'urgent',
      question: 'Approve production deployment?',
      created: '5m ago',
      data: {
        action: 'Deploy version 2.4.1 to production',
        context: 'All tests passed. This release includes 3 bug fixes and 1 new feature (user avatars).',
        implications: 'This will affect all active users. Rollback is available within 30 minutes.',
        requestedBy: 'CI Pipeline',
        requestedAt: '5 minutes ago'
      }
    },

    // --- 19. Categorize Card ---
    {
      id: 'd_categorize1',
      decisionType: 'categorize',
      status: 'pending',
      subject: { type: 'email', id: 'e_cat1', title: 'Re: Q1 Budget Review', source: 'email' },
      project: null,
      priority: 'normal',
      question: 'Categorize this item',
      created: '30m ago',
      data: {
        preview: 'Hi Team, Please review the attached Q1 budget spreadsheet and let me know if you have any questions...',
        suggestedCategory: 'Reference',
        categories: ['Task Source', 'Reference', 'Archive', 'Spam'],
        suggestedProject: 'Finance',
        projects: ['Finance', 'Q1 Planning', 'Marketing', 'Backend API'],
        showTypeSelector: false,
        additionalFields: [
          { name: 'From', value: 'finance@company.com', editable: false },
          { name: 'Tags', value: 'budget, review', editable: true }
        ]
      }
    }

      ];// Decision type configuration with colors and styling
export const decisionTypeConfig = {
  enrichment: {
    icon: '🎙️',
    label: 'Enrichment',
    color: 'amber',
    bgClass: 'bg-amber-900/20',
    borderClass: 'border-l-amber-500',
    hoverBgClass: 'hover:bg-amber-900/30'
  },
  triage: {
    icon: '📋',
    label: 'Triage',
    color: 'purple',
    bgClass: 'bg-purple-900/20',
    borderClass: 'border-l-purple-500',
    hoverBgClass: 'hover:bg-purple-900/30',
    deprecated: true // Use 'categorize' or 'meeting_tasks' instead
  },
  specification: {
    icon: '✏️',
    label: 'Specification',
    color: 'orange',
    bgClass: 'bg-orange-900/20',
    borderClass: 'border-l-orange-500',
    hoverBgClass: 'hover:bg-orange-900/30'
  },
  review: {
    icon: '👁️',
    label: 'Review',
    color: 'cyan',
    bgClass: 'bg-cyan-900/20',
    borderClass: 'border-l-cyan-500',
    hoverBgClass: 'hover:bg-cyan-900/30'
  },
  categorize: {
    icon: '📁',
    label: 'Categorize',
    color: 'pink',
    bgClass: 'bg-pink-900/20',
    borderClass: 'border-l-pink-500',
    hoverBgClass: 'hover:bg-pink-900/30'
  },
  meeting_tasks: {
    icon: '📋🎙️',
    label: 'Meeting Tasks',
    color: 'emerald',
    bgClass: 'bg-emerald-900/20',
    borderClass: 'border-l-emerald-500',
    hoverBgClass: 'hover:bg-emerald-900/30'
  },
  clarification: {
    icon: '🤔',
    label: 'Clarification',
    color: 'yellow',
    bgClass: 'bg-yellow-900/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]', // Glow effect
    borderClass: 'border-l-yellow-500',
    hoverBgClass: 'hover:bg-yellow-900/30'
  },
  verification: {
    icon: '🛡️',
    label: 'Verification',
    color: 'purple',
    bgClass: 'bg-purple-900/20',
    borderClass: 'border-l-purple-500',
    hoverBgClass: 'hover:bg-purple-900/30'
  },
  conflict: {
    icon: '⚔️',
    label: 'Conflict',
    color: 'red',
    bgClass: 'bg-red-900/20',
    borderClass: 'border-l-red-500',
    hoverBgClass: 'hover:bg-red-900/30'
  },
  escalation: {
    icon: '🚨',
    label: 'Escalation',
    color: 'red',
    bgClass: 'bg-red-900/30 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    borderClass: 'border-l-red-500',
    hoverBgClass: 'hover:bg-red-900/40'
  },
  checkpoint: {
    icon: '⏸️',
    label: 'Checkpoint',
    color: 'yellow',
    bgClass: 'bg-yellow-900/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
    borderClass: 'border-l-yellow-500',
    hoverBgClass: 'hover:bg-yellow-900/30'
  },
  approval: {
    icon: '✅',
    label: 'Approval',
    color: 'emerald',
    bgClass: 'bg-emerald-900/20',
    borderClass: 'border-l-emerald-500',
    hoverBgClass: 'hover:bg-emerald-900/30'
  },
  delegation: {
    icon: '👥',
    label: 'Delegation',
    color: 'blue',
    bgClass: 'bg-blue-900/20',
    borderClass: 'border-l-blue-500',
    hoverBgClass: 'hover:bg-blue-900/30'
  }
};

// Decision type groups for workflow phases
export const decisionTypeGroups = {
  intake: {
    label: 'Intake',
    icon: '📥',
    description: 'New items entering the system',
    types: ['categorize', 'meeting_tasks'],
    order: 1
  },
  refinement: {
    label: 'Refinement',
    icon: '🔧',
    description: 'Defining and clarifying work',
    types: ['specification', 'clarification', 'enrichment'],
    order: 2
  },
  execution: {
    label: 'Execution',
    icon: '⚡',
    description: 'Work in progress',
    types: ['checkpoint'],
    order: 3
  },
  verification: {
    label: 'Verification',
    icon: '✓',
    description: 'Reviewing completed work',
    types: ['verification', 'review'],
    order: 4
  },
  exceptions: {
    label: 'Exceptions',
    icon: '⚠️',
    description: 'Issues requiring attention',
    types: ['escalation', 'conflict', 'approval', 'delegation'],
    order: 5
  }
};

/**
 * Get the group key for a decision type.
 * @param {string} type - The decision type
 * @returns {string|null} - The group key or null if not found
 */
export function getDecisionTypeGroup(type) {
  for (const [groupKey, group] of Object.entries(decisionTypeGroups)) {
    if (group.types.includes(type)) {
      return groupKey;
    }
  }
  return null;
}

/**
 * Get all decision types in a group.
 * @param {string} groupKey - The group key (e.g., 'intake', 'refinement')
 * @returns {string[]} - Array of decision types in the group
 */
export function getTypesInGroup(groupKey) {
  const group = decisionTypeGroups[groupKey];
  return group ? group.types : [];
}

/**
 * Get sorted group entries for UI rendering.
 * @returns {Array<[string, object]>} - Sorted array of [groupKey, groupConfig] entries
 */
export function getSortedGroups() {
  return Object.entries(decisionTypeGroups).sort((a, b) => a[1].order - b[1].order);
}

// Thing type configuration
export const thingTypeConfig = {
  task: { icon: '✓', label: 'Tasks' },
  transcript: { icon: '🎙️', label: 'Transcripts' },
  email: { icon: '✉️', label: 'Emails' },
  source: { icon: '📄', label: 'Sources' },
  project: { icon: '🚀', label: 'Projects' },
  person: { icon: '👤', label: 'People' }
};

// Known speakers for autocomplete
export const knownSpeakers = [
  'John (PM)',
  'Sarah (Eng)',
  'Mike (Design)',
  'Lisa (Marketing)',
  'David (Sales)',
  'Emma (Support)',
  'Alex (DevOps)',
  'Chris (QA)',
  'Rachel (HR)',
  'Tom (Finance)'
];

// Extract unique projects from decisions
export const allProjects = [...new Set(mockDecisions.map(d => d.project).filter(Boolean))].sort();

// Entity history for the timeline view
// Maps entity IDs to their state progression
export const entityHistory = {
  'task1': [
    {
      state: 'created',
      timestamp: '2024-12-14 08:30',
      input: null,
      output: {
        title: '[URGENT] Fix production auth bug',
        source: 'email',
        priority: 'urgent'
      }
    }
  ]
};

// Helper to get entity info by ID
export function getEntityById(entityId) {
  const decision = mockDecisions.find(d => d.subject.id === entityId);
  return decision ? decision.subject : null;
}

// Helper to get decision by entity ID
export function getDecisionByEntityId(entityId) {
  return mockDecisions.find(d => d.subject.id === entityId);
}