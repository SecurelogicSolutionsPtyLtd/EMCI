export const timelineData = {
  academic: [
    { date: '2025-01-15', score: 75 },
    { date: '2025-02-10', score: 78 },
    { date: '2025-03-05', score: 82 },
    { date: '2025-04-20', score: 80 },
    { date: '2025-05-15', score: 72 }, // Drop
    { date: '2025-06-10', score: 68 }, // Drop
    { date: '2025-07-25', score: 75 }, // Recovery
    { date: '2025-09-10', score: 85 },
    { date: '2025-10-15', score: 88 },
    { date: '2025-11-20', score: 86 },
    { date: '2026-01-15', score: 89 },
    { date: '2026-02-20', score: 91 },
    { date: '2026-03-10', score: 90 },
  ],
  attendance: [
    { date: '2025-01-01', rate: 100 },
    { date: '2025-02-01', rate: 98 },
    { date: '2025-03-01', rate: 95 },
    { date: '2025-04-01', rate: 96 },
    { date: '2025-05-01', rate: 85 }, // Warning
    { date: '2025-06-01', rate: 75 }, // Risk
    { date: '2025-07-01', rate: 90 },
    { date: '2025-08-01', rate: 95 },
    { date: '2025-09-01', rate: 98 },
    { date: '2025-10-01', rate: 100 },
    { date: '2025-11-01', rate: 99 },
    { date: '2026-01-01', rate: 100 },
    { date: '2026-02-01', rate: 98 },
    { date: '2026-03-01', rate: 100 },
  ],
  events: [
    {
      id: 'step-1',
      date: '2025-02-01',
      modifiedDate: '2025-02-01',
      type: 'referral',
      title: 'EMCI Referral',
      status: 'Active',
      by: 'Liam Duffy',
      description: 'Initial referral received from school counsellor.',
      notes: 'Initial referral received from school counsellor.',
      track: 'above'
    },
    {
      id: 'step-2',
      date: '2025-03-15',
      modifiedDate: '2025-03-15',
      type: 'consent',
      title: 'EMCI Consent',
      status: 'Active',
      by: 'Liam Duffy',
      description: 'Parental consent obtained for the EMCI programme.',
      notes: 'Parental consent obtained for the EMCI programme.',
      track: 'above'
    },
    {
      id: 'step-3',
      date: '2025-07-15',
      modifiedDate: '2025-07-15',
      type: 'session',
      title: 'EMCI Session',
      status: 'Active',
      by: 'Liam Duffy',
      description: 'Morrisby unpacking and career planning',
      sessionLength: '30 Minutes',
      interventionType: 'Unpack',
      notes: 'Completed intensive 4-month career guidance programme.',
      track: 'above'
    },
    {
      id: 'step-4',
      date: '2025-08-20',
      modifiedDate: '2025-08-20',
      type: 'survey',
      title: 'EMCI Student Initial Survey',
      status: 'Active',
      by: 'Liam Duffy',
      description: 'Survey',
      notes: 'Student has successfully completed the journey.',
      track: 'above'
    }
  ],
  riskPeriods: [
    { start: '2025-01-01', end: '2025-04-30', level: 'low' },
    { start: '2025-05-01', end: '2025-07-15', level: 'high' },
    { start: '2025-07-16', end: '2026-03-17', level: 'low' }
  ]
};
