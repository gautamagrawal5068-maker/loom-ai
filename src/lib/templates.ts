import { EmailTemplate } from '@/types';

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // 1. School Emails
  {
    id: 'school-extension',
    category: 'School',
    title: 'Assignment Extension Request',
    description: 'Polite, respectful request for an extension on coursework due to unexpected circumstances.',
    promptTemplate:
      'Write a respectful email to my professor [Professor Name] asking for an extension on [Assignment / Project Name] (currently due [Due Date]). Explain that [Brief reason, e.g. illness or overlapping exam schedule] and ask if I may submit by [Proposed New Date]. Keep it professional and appreciative.',
  },
  {
    id: 'school-office-hours',
    category: 'School',
    title: 'Office Hours Appointment',
    description: 'Schedule time with an instructor or TA to discuss course material or project feedback.',
    promptTemplate:
      'Write a concise email to [Professor / TA Name] asking to schedule 15 minutes during office hours to review questions on [Specific Topic / Lecture / Assignment]. Offer availability on [Day, Time options] and thank them for their time.',
  },

  // 2. Workplace & Professional Communication
  {
    id: 'work-project-status',
    category: 'Workplace',
    title: 'Project Status Update',
    description: 'Structured progress update for stakeholders or team leads.',
    promptTemplate:
      'Write a crisp project status update email to [Stakeholder / Team Name] for [Project Name]. Highlight: 1) What we accomplished this week ([Key achievements]), 2) Upcoming milestones ([Next steps]), and 3) Blockers or open questions ([Any blockers, or "None"]). Use clean formatting.',
  },
  {
    id: 'work-pto-request',
    category: 'Workplace',
    title: 'Time Off / PTO Request',
    description: 'Clear, advance notification of upcoming time off with coverage plan.',
    promptTemplate:
      'Write a clear time-off request email to my manager [Manager Name] for [Dates of absence]. Confirm that [Colleague Name] has agreed to provide emergency coverage on [Specific responsibilities], and that all urgent tasks will be completed prior to departure.',
  },

  // 3. Internship & Career Inquiries
  {
    id: 'internship-cold-inquiry',
    category: 'Internships',
    title: 'Cold Internship Inquiry',
    description: 'Thoughtful outreach to a hiring manager or company lead for internship opportunities.',
    promptTemplate:
      'Write an engaging cold email to [Hiring Manager / Team Lead Name] at [Company Name] expressing admiration for their recent work on [Specific project / product]. Inquire about upcoming [Summer / Fall] internship opportunities in [Area of focus], highlighting my background in [1-2 key skills] and portfolio.',
  },
  {
    id: 'internship-post-interview',
    category: 'Internships',
    title: 'Post-Interview Thank You',
    description: 'Reflective thank-you email following an interview, reinforcing fit and enthusiasm.',
    promptTemplate:
      'Write a thoughtful post-interview thank-you email to [Interviewer Name] for interviewing me for the [Role Name] position today. Mention our discussion about [Specific topic discussed, e.g. team roadmap], reiterate my enthusiasm for the role, and offer to provide any additional information.',
  },

  // 4. Business & Outreach
  {
    id: 'outreach-partnership',
    category: 'Outreach',
    title: 'Partnership / Collaboration Proposal',
    description: 'Mutual value proposition proposal to an external company or creator.',
    promptTemplate:
      'Write a compelling partnership proposal email to [Target Partner / Founder Name] at [Company]. Introduce [Our Product / Organization], explain why a collaboration around [Specific idea or co-marketing initiative] would benefit their audience, and propose a brief 15-minute introductory call next week.',
  },

  // 5. Follow-ups
  {
    id: 'followup-gentle-ping',
    category: 'Follow-ups',
    title: 'Gentle Follow-Up on Unanswered Email',
    description: 'Polite reminder on a previous message sent several days ago.',
    promptTemplate:
      'Write a brief, polite follow-up email to [Recipient Name] checking in on the note I sent on [Day/Date] regarding [Topic / Proposal]. Acknowledge that they are likely busy, ask if they had a chance to review, and reiterate the simple next step.',
  },
  {
    id: 'followup-post-meeting',
    category: 'Follow-ups',
    title: 'Post-Meeting Action Items',
    description: 'Summarize key decisions, assigned owners, and next milestones following a meeting.',
    promptTemplate:
      'Write a post-meeting recap email to [Attendees] summarizing our discussion today regarding [Meeting Topic]. Outline the key decisions reached and list the action items: 1) [Action 1 - Owner], 2) [Action 2 - Owner]. Confirm target date of [Next Check-in Date].',
  },

  // 6. Thank You Notes
  {
    id: 'thankyou-mentor',
    category: 'Thank You',
    title: 'Mentor / Advisor Appreciation',
    description: 'Heartfelt, professional note expressing gratitude for guidance or advice.',
    promptTemplate:
      'Write a warm, genuine thank-you email to [Mentor / Advisor Name] for taking the time to speak with me on [Day]. Mention how helpful their advice was regarding [Specific topic / career step] and update them on the action I took as a result.',
  },

  // 7. Apologies & Delays
  {
    id: 'apology-deadline-delay',
    category: 'Apologies',
    title: 'Project Delay / Missed Deadline Notice',
    description: 'Proactive, accountable communication regarding a delivery schedule delay.',
    promptTemplate:
      'Write a professional, accountable email to [Client / Manager Name] notifying them of a delay on [Deliverable / Project]. Transparently explain that [Brief reason for delay], take ownership, provide the revised delivery date of [New Date/Time], and detail steps taken to ensure quality.',
  },

  // 8. Meeting Requests
  {
    id: 'meeting-coffee-chat',
    category: 'Meetings',
    title: 'Informational Coffee Chat',
    description: 'Low-pressure invitation for an informal chat or networking sync.',
    promptTemplate:
      'Write a warm, respectful invitation to [Contact Name] requesting a 15-20 minute virtual coffee chat. Explain that I have been following their career in [Industry / Field] and would love to ask 2-3 questions about their journey. Propose [2 time slots] and emphasize that I will gladly accommodate their schedule.',
  },
];
