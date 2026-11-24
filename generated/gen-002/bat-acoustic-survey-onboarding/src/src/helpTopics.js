// Help centre: 60 topics. A few have full articles (body); the rest show a short answer.

export const TOPIC_CATEGORIES = [
  'Getting started', 'Importing', 'Noise and filtering', 'Classification',
  'Manual vetting', 'Detectors and sites', 'Reports and export', 'Account and data',
];

const t = (id, cat, title, summary, body) => ({ id, cat, title, summary, body });

export const TOPICS = [
  // Getting started (8)
  t('gs-1', 'Getting started', 'The nine-step setup walkthrough', 'The walkthrough takes a new project from import to an interim report. You can leave and return at any step; progress is saved per project.'),
  t('gs-2', 'Getting started', 'Projects, detectors, nights and files', 'A project holds detectors; each detector holds nightly recordings. Every count in Echolog is a count of files.'),
  t('gs-3', 'Getting started', 'Reading the Setup guide progress bar', 'Steps turn green when their checks pass. Step 5 (noise filter) completes when you mark it done; Echolog does not decide for you.'),
  t('gs-4', 'Getting started', 'Keyboard shortcuts', 'In Vetting: 1–5 assign a species or group, 6 marks noise, Enter accepts the Echolog label, S skips, B goes back, Z undoes the last decision.'),
  t('gs-5', 'Getting started', 'Where did my old program’s settings go?', 'Settings are not carried over. Use the Terms compared tab to map each old setting to its Echolog equivalent, then check them in Settings.'),
  t('gs-6', 'Getting started', 'Re-running the classifier', 'Changing a sensitivity setting and choosing Apply re-runs the noise filter and classifier on every file. Your manual labels are kept.'),
  t('gs-7', 'Getting started', 'Working across several projects', 'Use the project switcher in the sidebar. Settings, vetted labels and reports are stored per project.'),
  t('gs-8', 'Getting started', 'Sample project for practice', 'A small practice project with 120 files lets you try vetting and export without touching client data.'),

  // Importing (8)
  t('im-1', 'Importing', 'Importing from other detectors', 'Echolog reads full-spectrum WAV from any detector. Check the sample rate and filename pattern in the detector profile before you import.', [
    'Echolog imports full-spectrum WAV recordings. The sample rate is read from each file header and compared with the rate set in the detector profile; a mismatch is flagged on the import summary rather than silently corrected.',
    'Zero-crossing and compressed formats are not imported. If a detector writes both, import the full-spectrum files only.',
    'Time-expanded recordings need the expansion factor entered in the detector profile (for example ×10). Without it every pulse looks ten times too long and ten times too low, and most files fail the noise filter.',
    'Filename patterns tell Echolog the detector, date and time. If your files come from a mix of units, create one detector profile per unit and match files by pattern, or by folder.',
    'After import, open Setup guide step 5. The sample-rate check there compares header rates with profile rates for every file and lists any mismatches.',
  ]),
  t('im-2', 'Importing', 'Supported sample rates', 'Echolog analyses 192 kHz and above natively. Nyquist limits (128 kHz at 256 kHz sampling, 192 kHz at 384 kHz) are far above the range used for North American bats.'),
  t('im-3', 'Importing', 'Time-expanded recordings', 'Enter the expansion factor in the detector profile. Leaving it at ×1 for time-expanded files is the most common cause of mass noise labels.'),
  t('im-4', 'Importing', 'Filename patterns and timestamps', 'Echolog reads detector, date and time from the filename. If the clock was wrong, apply a time offset in the detector profile.'),
  t('im-5', 'Importing', 'Importing a second batch into a project', 'New files are added alongside existing ones. Duplicates are skipped by filename and checksum.'),
  t('im-6', 'Importing', 'Mixed sample rates in one project', 'Allowed. Each detector keeps its own rate, and the classifier handles both. Compare noise rates by rate in Setup guide step 5.'),
  t('im-7', 'Importing', 'Import errors and skipped files', 'Corrupt or zero-length files are listed with the reason. They are not counted in project totals.'),
  t('im-8', 'Importing', 'Importing earlier surveys for comparison', 'Add earlier seasons as separate projects. Cross-project comparison is available in Reports.'),

  // Noise and filtering (8)
  t('nf-1', 'Noise and filtering', 'Noise filter vs. classifier confidence', 'Two separate gates: the noise filter decides whether a file contains bat calls at all; classifier confidence decides how sure Echolog is about the species.', [
    'Every file passes two gates in order.',
    'Gate 1, the noise filter, looks for bat-like calls using three settings: the signal threshold (dB above background), the minimum calls per sequence, and the minimum call frequency. It also rejects insect and broadband noise and clipped files. A file that fails is labeled Noise and the classifier never sees it.',
    'Gate 2, the classifier, compares the calls with the regional pack and returns a label with a confidence. If no species or group is confident enough, the file is labeled Unclassified: there is a bat, but Echolog will not name it.',
    'Noise and Unclassified are therefore different things. Many older programs fold both into a single "no ID" bucket. Changing classifier confidence never turns a Noise file into a species, and changing the noise filter never changes the confidence of a file that already passed.',
    'If you have too many Noise files, look at Setup guide step 5 to see which rule rejected them. If you have too many Unclassified files, vet them by hand or check that the right classifier pack is active.',
  ]),
  t('nf-2', 'Noise and filtering', 'Why is a detector near water mostly noise?', 'Insects and frogs produce dense broadband or tonal energy that passes for pulses at first glance. Echolog rejects it before classification.'),
  t('nf-3', 'Noise and filtering', 'Signal threshold explained', 'Minimum height of a pulse above the background floor, in dB. Lowering it admits fainter calls but also more background.'),
  t('nf-4', 'Noise and filtering', 'Minimum calls per sequence', 'A sequence needs at least this many calls to be kept. One- and two-pulse files from distant bats are the usual casualties.'),
  t('nf-5', 'Noise and filtering', 'Minimum call frequency', 'Energy whose peak is below this value is ignored. The default of 15 kHz keeps hoary bats and removes most wind noise.'),
  t('nf-6', 'Noise and filtering', 'Insect and broadband rejection', 'Repeating, evenly spaced energy across a wide band is classed as insect noise. This step is not controlled by the three sensitivity settings.'),
  t('nf-7', 'Noise and filtering', 'Clipped and truncated files', 'Overloaded or cut-short recordings are rejected because pulse shape cannot be measured reliably.'),
  t('nf-8', 'Noise and filtering', 'Previewing a settings change', 'Sliders in step 5 show how many files would change label before you apply anything. Apply re-runs the whole project.'),

  // Classification (9)
  t('cl-1', 'Classification', 'What a classifier pack is', 'A pack is a regional set of species and call models. Eastern US v4.2 outputs Myotis spp., Eastern red bat, hoary bat and a big brown/silver-haired group.'),
  t('cl-2', 'Classification', 'Choosing the right pack', 'Pick the pack that matches the survey region and season. A pack from the wrong region will still return labels, but they will be unreliable.'),
  t('cl-3', 'Classification', 'Reading classifier confidence', 'A 0–100% score for the winning label against the other labels in the pack. Do not compare it directly with scores from other programs.'),
  t('cl-4', 'Classification', 'Why Myotis is reported as a group', 'The pack does not separate Myotis species from echolocation calls alone, so they are reported as Myotis spp.'),
  t('cl-5', 'Classification', 'Big brown / silver-haired group', 'Calls of the two species overlap in frequency and shape. Echolog reports the group rather than guessing.'),
  t('cl-6', 'Classification', 'What Unclassified means', 'Bat calls are present, but no label reached the confidence cut-off. These files are the best candidates for manual review.'),
  t('cl-7', 'Classification', 'Updating a classifier pack', 'Updates are applied per project and re-run the classifier. A change report lists which file labels changed.'),
  t('cl-8', 'Classification', 'Low-frequency migrants at height', 'Hoary and red bats dominate at turbine height in autumn. The summary view lets you filter results by detector height.'),
  t('cl-9', 'Classification', 'Rare-species flags', 'Files with possible protected-species calls are flagged for manual review regardless of confidence.'),

  // Manual vetting (8)
  t('mv-1', 'Manual vetting', 'How to vet calls manually', 'Open Vetting, choose a queue, check the spectrogram against the classifier label, and assign your own. Your label overrides the automatic one in results.'),
  t('mv-2', 'Manual vetting', 'Choosing a queue', 'Borderline noise, low confidence, unclassified, a random QA sample and a noise spot-check are available. Start with the QA sample to estimate error.'),
  t('mv-3', 'Manual vetting', 'Building a QA sample for a client report', 'A stratified random sample per detector gives you a defensible agreement rate to quote alongside the counts.'),
  t('mv-4', 'Manual vetting', 'Vetting files the noise filter rejected', 'Rejected files can be relabeled to a species, group or Unclassified. They are then counted in results and flagged as manually recovered.'),
  t('mv-5', 'Manual vetting', 'Reading the spectrogram', 'The excerpt shows 0.4 s from 0 to 100 kHz. The dashed amber line is your minimum call frequency.'),
  t('mv-6', 'Manual vetting', 'Undo and audit trail', 'Every decision is time-stamped. Undo reverses the last one; the export lists the original and vetted label side by side.'),
  t('mv-7', 'Manual vetting', 'Agreement rate', 'Percentage of vetted files where your label matched the classifier. Shown in Vetting and Results.'),
  t('mv-8', 'Manual vetting', 'Vetting as a team', 'Reviewer initials are stored per decision. Conflicting labels are listed for resolution.'),

  // Detectors and sites (6)
  t('ds-1', 'Detectors and sites', 'Detector profiles', 'A profile stores sample rate, microphone height, filename pattern and time offset for one unit.'),
  t('ds-2', 'Detectors and sites', 'Microphone height and what it changes', 'Height is recorded for reporting and filtering. It does not change the classifier.'),
  t('ds-3', 'Detectors and sites', 'Tower and nacelle deployments', 'Elevated microphones record faint, distant calls and a lot of wind. Expect more single-pulse files.'),
  t('ds-4', 'Detectors and sites', 'Detectors near water', 'Ponds and streams attract calling insects and frogs. Expect a high noise share; spot-check it rather than lowering the threshold.'),
  t('ds-5', 'Detectors and sites', 'Clock drift and time offsets', 'If a detector clock was off, enter an offset and the nightly grouping is corrected.'),
  t('ds-6', 'Detectors and sites', 'Detector comparison view', 'Side-by-side nightly activity and noise share for each unit in the project.'),

  // Reports and export (8)
  t('rp-1', 'Reports and export', 'Exporting an interim report', 'Results includes a species-by-detector table and a CSV of every file with automatic and vetted labels.'),
  t('rp-2', 'Reports and export', 'What the CSV contains', 'One row per file: detector, night, time, sample rate, duration, calls, SNR, automatic label, vetted label and effective label.'),
  t('rp-3', 'Reports and export', 'Reporting counts of files vs. bat passes', 'Echolog reports files. If your client template expects passes, state the definition in the methods section.'),
  t('rp-4', 'Reports and export', 'Describing your methods', 'The methods summary lists software version, pack, settings and the vetting protocol you used.'),
  t('rp-5', 'Reports and export', 'Activity per detector-night', 'Counts are divided by recording nights so that detectors with different effort can be compared.'),
  t('rp-6', 'Reports and export', 'Handling unvetted files in a report', 'Unvetted files keep their automatic label. The summary states how many files were vetted.'),
  t('rp-7', 'Reports and export', 'Branding and client templates', 'Add your logo and contact block to exported summaries under Account settings.'),
  t('rp-8', 'Reports and export', 'Re-issuing a report after changes', 'Reports are snapshots. Re-export after applying new settings or vetting more files.'),

  // Account and data (5)
  t('ac-1', 'Account and data', 'Where your recordings are stored', 'Recordings stay on your computer. Echolog stores only analysis results and settings.'),
  t('ac-2', 'Account and data', 'Backing up a project', 'Export a project bundle, which includes settings, labels and notes but not audio.'),
  t('ac-3', 'Account and data', 'Licence and activations', 'One licence covers two computers. Deactivate one to move to another.'),
  t('ac-4', 'Account and data', 'Software updates', 'Updates are announced in-app. A project keeps the version it was analysed with until you re-run it.'),
  t('ac-5', 'Account and data', 'Contacting support', 'Send the project diagnostics bundle with your question; it contains no audio.'),
];

// Older programs' vocabulary, grouped by what you are trying to do.
export const TERMS = [
  {
    term: 'Recording', group: 'Files and counts',
    meaning: 'One WAV file from a detector (3–15 s in this project). Every total in Echolog is a count of files.',
    older: ['file', 'recording', 'pass file'],
    watch: 'A file with two bats still counts once, and a bat that straddles two files counts twice. If your client template asks for bat passes, say in the methods that you are reporting files.',
  },
  {
    term: 'Call', group: 'Files and counts',
    meaning: 'A single echolocation pulse detected in a file.',
    older: ['pulse', 'syllable', 'call'],
    watch: 'Call counts drive the minimum-calls rule below.',
  },
  {
    term: 'Sequence', group: 'Files and counts',
    meaning: 'A run of calls in one file that look like one bat in one flight.',
    older: ['pulse train', 'call sequence', 'pass'],
    watch: 'Echolog applies Minimum calls per sequence to this, not to the whole file.',
  },
  {
    term: 'Noise', group: 'Filtering',
    meaning: 'The file was rejected by the noise filter before classification. It has no species label.',
    older: ['Noise', 'non-bat', 'filtered out'],
    watch: 'In some programs Noise also holds files with real but unidentifiable bat calls. In Echolog those are Unclassified. Compare like with like before judging a noise percentage.',
    to: 'guide',
  },
  {
    term: 'Signal threshold', group: 'Filtering',
    meaning: 'How far a pulse must stand above the background floor, in dB, to count as a call. Yours is {thr} dB.',
    older: ['trigger level', 'detection threshold', 'sensitivity', 'minimum SNR'],
    watch: 'It is applied to the recording after import, not at the detector. It is relative to the background, not absolute level, so it does not map one-to-one onto a hardware trigger or gain setting.',
    to: 'settings',
  },
  {
    term: 'Minimum calls per sequence', group: 'Filtering',
    meaning: 'A sequence with fewer calls than this is dropped. Yours is {minCalls}.',
    older: ['minimum number of pulses', 'minimum calls per pass'],
    watch: 'Programs differ in whether a one- or two-pulse file is kept as "Unclassified" or discarded. Echolog discards it as Noise.',
    to: 'settings',
  },
  {
    term: 'Minimum call frequency', group: 'Filtering',
    meaning: 'Peak energy below this frequency is ignored. Yours is {minFreq} kHz.',
    older: ['low-frequency cutoff', 'frequency filter', 'minimum Fc'],
    watch: 'Hoary bats call near 18–25 kHz, so floors above about 18 kHz will start rejecting them.',
    to: 'settings',
  },
  {
    term: 'Unclassified', group: 'Classification',
    meaning: 'Bat calls are present, but no species or group reached the pack’s confidence cut-off.',
    older: ['NoID', 'no ID', 'unknown bat', 'unidentified'],
    watch: 'These are not noise. They are the first place to look for calls the classifier could not decide on.',
  },
  {
    term: 'Classifier pack', group: 'Classification',
    meaning: 'The regional species and call models Echolog uses. You have Eastern US v4.2.',
    older: ['region', 'species library', 'classifier', 'species list'],
    watch: 'Switching pack re-runs every file, so do it before vetting.',
    to: 'settings',
  },
  {
    term: 'Classifier confidence', group: 'Classification',
    meaning: 'A 0–100% score for the winning label compared with the other labels in the pack.',
    older: ['probability', 'discriminant score', 'match ratio', 'percent agreement'],
    watch: 'Scores are not comparable across programs. Do not carry a confidence cut-off over from your old software; use vetting to check calibration on your own data.',
  },
  {
    term: 'Group ID', group: 'Classification',
    meaning: 'A label covering species that cannot be separated reliably, such as Big brown / silver-haired.',
    older: ['phonic group', 'species complex', 'species group'],
    watch: 'A group label is a deliberate result, not a downgrade. Myotis are reported as a single group in this pack.',
  },
  {
    term: 'Vetting', group: 'Review',
    meaning: 'Manual review of a file’s spectrogram and assignment of your own label.',
    older: ['manual ID', 'manual vetting', 'visual review'],
    watch: 'Your label overrides the automatic label in results. The original automatic label is kept and exported next to it.',
    to: 'vetting',
  },
  {
    term: 'Detector profile', group: 'Files and counts',
    meaning: 'Per-unit settings: sample rate, microphone height, filename pattern, time offset.',
    older: ['site file', 'detector setup', 'metadata'],
    watch: 'A wrong sample rate or missing time-expansion factor in the profile is the usual cause of an entire detector turning to noise.',
    to: 'settings',
  },
  {
    term: 'Night', group: 'Files and counts',
    meaning: 'One survey night, from the evening it starts to the following morning. Files after midnight belong to the previous date.',
    older: ['deployment night', 'survey night', 'bat night'],
    watch: 'A file stamped 02:10 on Nov 10 is part of the Nov 9 night.',
  },
];
