export interface Article {
  id: string
  cat: string
  title: string
  updated: string
  body: string[] // lines starting with "- " render as bullets, "## " as subheads
  keywords: string
}

export const ARTICLES: Article[] = [
  // Getting started
  {
    id: 'a1', cat: 'Getting started', title: 'What Clerkwise Assist does (and doesn’t do)', updated: 'Oct 2026',
    keywords: 'overview intro ai assistant what does',
    body: [
      'Clerkwise Assist drafts response letters and suggests redactions for public records requests. It works only from the documents you marked responsive.',
      '- It drafts. You decide. Nothing goes to a requester unless you press Send.',
      '- It can be wrong. Every suggestion comes with its reason so you can check it.',
      '- It doesn’t give legal advice. Questions about whether an exemption applies still go to County Counsel, as they always have.',
    ],
  },
  {
    id: 'a2', cat: 'Getting started', title: 'Starting a request', updated: 'Sep 2026',
    keywords: 'start open queue new request draft',
    body: [
      'Open a request from My queue, then choose Draft response. The assistant reads the documents you marked responsive and returns a draft letter and suggested redactions, usually within two minutes.',
      'You can draft again at any time. Drafting again never overwrites your edits or decisions. It shows you the differences first.',
    ],
  },
  {
    id: 'a3', cat: 'Getting started', title: 'Reviewing sources the assistant found', updated: 'Sep 2026',
    keywords: 'sources documents responsive search',
    body: [
      'Before drafting, the assistant lists the documents its search found. You mark each one responsive or not responsive.',
      'The letter’s document and page counts come only from documents you marked responsive.',
    ],
  },
  {
    id: 'a4', cat: 'Getting started', title: 'Keyboard shortcuts', updated: 'Aug 2026',
    keywords: 'keyboard shortcut keys fast',
    body: [
      'On the Redactions tab:',
      '- J / K: next or previous suggestion',
      '- A: approve the selected redaction',
      '- D: don’t redact (decline)',
      '- P: switch to the requester’s view of the page',
      'Shortcuts don’t work while you’re typing in a note or the letter.',
    ],
  },
  {
    id: 'a5', cat: 'Getting started', title: 'Getting help: training contact and office hours', updated: 'Nov 2026',
    keywords: 'help training luis ortega office hours contact it support',
    body: [
      'Luis Ortega (IT Training & Support) runs drop-in office hours for Clerkwise Assist on Tuesdays and Thursdays, 1:00–3:00 PM, in Admin Building Room 214 or by Teams.',
      'You can reserve a 15-minute slot from the Help panel. If you attach a request, Luis can open it with you read-only. Nothing changes unless you change it.',
      'Questions about whether an exemption applies go to County Counsel. Questions about how the tool works go to Luis.',
    ],
  },
  // Redactions
  {
    id: 'a6', cat: 'Redactions', title: 'What confidence levels mean', updated: 'Oct 2026',
    keywords: 'confidence medium high low meaning what does mean sure unsure',
    body: [
      'Each suggested redaction is rated High or Medium. The rating tells you how much checking a suggestion needs. It is not a prediction of whether a court would agree.',
      '## High',
      'The text clearly matches the exemption and the assistant found nothing that points the other way. Example: a resident writes “my cell is…”.',
      '## Medium',
      'The text fits the exemption, but there’s one specific fact the assistant couldn’t confirm. That fact could change the answer. A medium suggestion always tells you:',
      '- what it couldn’t confirm',
      '- how to check it',
      '- what to do depending on what you find',
      'Under AP-07 § 4, you write a short reason for your decision on any medium-confidence item. One sentence is enough, for example “Confirmed with IT: personal phone.”',
      '## Either way',
      'The rating never decides for you. A high-confidence suggestion still needs your approval, and you can decline it.',
    ],
  },
  {
    id: 'a7', cat: 'Redactions', title: 'Approving, declining, or changing a redaction', updated: 'Oct 2026',
    keywords: 'approve decline reject change exemption undo decision',
    body: [
      '- Approve: the text will be blacked out in the released record and labeled with the exemption code.',
      '- Don’t redact: the text will be released as-is.',
      '- Change exemption: keep the redaction but cite a different exemption. The letter updates automatically.',
      'You can undo any decision until the response is sent. Each decision, and each undo, is logged with your name and the time.',
    ],
  },
  {
    id: 'a8', cat: 'Redactions', title: 'Exemption PRA-6(b): personal contact information', updated: 'Jul 2026',
    keywords: 'phone personal number cell 6(b) contact privacy',
    body: [
      'PRA § 6(b) exempts personal phone numbers, home addresses, and personal email addresses of county employees and private individuals.',
      '- Personal cell numbers are exempt even if an employee used them for county business.',
      '- County-issued phones, office lines, and business numbers of contractors are not exempt.',
      'When the assistant can’t tell whether a phone is personal or county-issued, it marks the suggestion Medium.',
    ],
  },
  {
    id: 'a9', cat: 'Redactions', title: 'Exemption PRA-9(a): attorney-client privilege', updated: 'Jul 2026',
    keywords: 'attorney client privilege counsel legal advice 9(a) waiver third party',
    body: [
      'PRA § 9(a) protects confidential communications between County staff and County Counsel made to get or give legal advice.',
      '- Copying a third party can waive the privilege, unless that person is working at counsel’s direction.',
      '- Facts don’t become privileged just because they were sent to a lawyer.',
      'When in doubt, ask County Counsel. That has always been the practice and AP-07 doesn’t change it.',
    ],
  },
  {
    id: 'a10', cat: 'Redactions', title: 'Exemption PRA-11: pre-decisional deliberation', updated: 'Jul 2026',
    keywords: 'deliberative pre-decisional draft recommendation opinion 11',
    body: [
      'PRA § 11 protects opinions and recommendations made before a final decision, so staff can advise frankly.',
      '- It covers opinions, not facts. Cost tables and measurements usually must be released.',
      '- Once a recommendation is adopted or published in final form, the matching draft language usually loses protection.',
    ],
  },
  {
    id: 'a11', cat: 'Redactions', title: 'Why there’s no “approve all” button', updated: 'Oct 2026',
    keywords: 'approve all bulk batch faster why',
    body: [
      'AP-07 § 3 requires a named person to review and approve each redaction individually. Bulk approval would log decisions nobody actually made.',
      'To move quickly, use A to approve and J for the next item. Approving moves you to the next undecided item automatically.',
    ],
  },
  // Policy
  {
    id: 'a12', cat: 'Policy', title: 'AP-07 in plain language', updated: 'Mar 2026',
    keywords: 'ap-07 policy rules ai use county',
    body: [
      'County Administrative Policy AP-07, “Use of AI Drafting Tools,” took effect March 1, 2026. What it means for records responses:',
      '- § 2: You may use Clerkwise Assist to draft responses. The person who sends a response is its author.',
      '- § 3: Every redaction must be approved by a named person. The name and time are logged. No bulk approval.',
      '- § 4: For anything the assistant rates below high confidence, the reviewer records a short reason.',
      '- § 5: The sender confirms they have read the whole letter, including the parts the assistant wrote.',
      '- § 6: Letters carry a standard footer noting that drafting software was used and that staff reviewed the response.',
      '- § 7: The audit trail is kept with the request file and is itself a public record.',
    ],
  },
  {
    id: 'a13', cat: 'Policy', title: 'Can I send a letter the assistant drafted?', updated: 'Oct 2026',
    keywords: 'send letter drafted allowed permitted policy sign can i',
    body: [
      'Yes. AP-07 § 2 allows it. Once you send it, you are the letter’s author, the same as if you had typed it yourself.',
      'Before Send unlocks, the Sign-off tab checks that:',
      '- every redaction has your decision on it (§ 3)',
      '- each medium-confidence decision has a reason (§ 4)',
      '- you’ve confirmed you read the full letter (§ 5)',
      'If you’d like a second set of eyes, choose “Send to supervisor for review” instead. That is always allowed and is never seen as a mark against you.',
    ],
  },
  {
    id: 'a14', cat: 'Policy', title: 'Who is the author of an AI-assisted letter?', updated: 'Mar 2026',
    keywords: 'author responsible responsibility name signature',
    body: [
      'The person who sends it. The assistant’s draft is a starting point, like a template. Edit anything that doesn’t sound right or that you can’t stand behind.',
      'The audit trail shows which paragraphs you changed and which you kept as drafted.',
    ],
  },
  {
    id: 'a15', cat: 'Policy', title: 'When to ask for a second review', updated: 'Sep 2026',
    keywords: 'second review supervisor gail check unsure',
    body: [
      'Send to your supervisor first whenever you’re unsure. Common reasons:',
      '- an exemption decision you couldn’t confirm',
      '- a requester who is a member of the press or a party to litigation',
      '- your first few responses using the assistant',
      'Your supervisor sees your decisions and notes, and can return the response to you with comments.',
    ],
  },
  // Letters
  {
    id: 'a16', cat: 'Letters', title: 'Editing the draft letter', updated: 'Sep 2026',
    keywords: 'edit letter change wording paragraph',
    body: [
      'Click into any paragraph to edit it. Each paragraph shows whether it’s still the assistant’s wording or has been edited by you.',
      'The redactions paragraph is generated from your decisions, so it stays accurate when you change one. It can’t be edited directly.',
    ],
  },
  {
    id: 'a17', cat: 'Letters', title: 'Restoring the assistant’s original wording', updated: 'Sep 2026',
    keywords: 'restore undo original revert',
    body: [
      'Each edited paragraph has a “Restore draft” link that puts back the assistant’s wording for that paragraph only. The restore is logged, and your previous version stays in the audit trail.',
    ],
  },
  {
    id: 'a18', cat: 'Letters', title: 'The AI-assistance footer on letters', updated: 'Mar 2026',
    keywords: 'footer disclosure ai notice requester',
    body: [
      'AP-07 § 6 adds this line to every response drafted with the assistant: “This response was prepared with the help of county drafting software and was reviewed and approved by the staff member named above.”',
      'The footer can’t be removed.',
    ],
  },
  // Saving & audit
  {
    id: 'a19', cat: 'Saving & audit trail', title: 'How saving works', updated: 'Oct 2026',
    keywords: 'save saved edits lost autosave changes keep',
    body: [
      'Everything saves automatically to the request as you work: redaction decisions, notes, and letter edits. There is no Save button.',
      '- The status in the top bar shows when the last change saved.',
      '- Saved is not sent. Nothing reaches the requester until you press Send on the Sign-off tab.',
      '- You can close the request, go back to the walkthrough, or log off. Your work will be here when you return.',
    ],
  },
  {
    id: 'a20', cat: 'Saving & audit trail', title: 'What’s in the audit trail', updated: 'Oct 2026',
    keywords: 'audit trail log history record',
    body: [
      'The audit trail records, in order:',
      '- what the assistant suggested, and when',
      '- each decision, change, and undo, with the person’s name and the time',
      '- letter edits and restores',
      '- sign-off and sending',
      'Under AP-07 § 7, the audit trail is kept with the request file and can itself be requested as a public record.',
    ],
  },
  {
    id: 'a21', cat: 'Saving & audit trail', title: 'Leaving a request and coming back', updated: 'Sep 2026',
    keywords: 'leave come back return walkthrough switch',
    body: [
      'You can switch between requests, or between a request and the walkthrough, at any time. Each one saves where you left off, including the redaction you had selected.',
    ],
  },
  {
    id: 'a22', cat: 'Saving & audit trail', title: 'Statutory deadlines and extensions', updated: 'Jul 2026',
    keywords: 'deadline due date extension business days late',
    body: [
      'PRA § 4(a) gives 10 business days to respond. County holidays don’t count.',
      'One extension of up to 10 more business days is allowed if you send the requester written notice before the original deadline, stating the reason. Ask your supervisor before extending.',
    ],
  },
]

export const ARTICLE_BY_ID: Record<string, Article> = Object.fromEntries(ARTICLES.map((a) => [a.id, a]))

export function searchArticles(q: string): Article[] {
  const terms = q.toLowerCase().replace(/[^\p{L}\p{N}\s()-]/gu, ' ').split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t))
  if (!terms.length) return []
  const scored = ARTICLES.map((a) => {
    const hay = (a.title + ' ' + a.keywords).toLowerCase()
    const body = a.body.join(' ').toLowerCase()
    let s = 0
    for (const t of terms) {
      if (hay.includes(t)) s += 3
      else if (body.includes(t)) s += 1
    }
    return { a, s }
  }).filter((x) => x.s > 0)
  scored.sort((x, y) => y.s - x.s)
  return scored.map((x) => x.a)
}

const STOP = new Set(['the', 'and', 'what', 'does', 'how', 'can', 'are', 'for', 'this', 'that', 'with', 'you', 'mean', 'means', 'which', 'when', 'why', 'who', 'its', 'about', 'there', 'have', 'has', 'was', 'will', 'into', 'from', 'should', 'would', 'could'])
