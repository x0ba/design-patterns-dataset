# Lost in the Middle

U-shaped curve: accuracy best when the relevant doc is first or last, worst in the middle. Even for models advertised with long contexts.

Experiments
- multi-doc QA (NaturalQuestions-Open), 10/20/30 docs, gold doc position varied
- synthetic key-value retrieval (JSON), 75/140/300 pairs

Implication for us: when we feed the full discharge summary, are codes mentioned mid-note (e.g. *Hospital Course*) under-detected? -> **position analysis by section** for Ch4. Sections: Chief Complaint, HPI, PMH, Hospital Course, Discharge Diagnosis, Discharge Meds.

[Med-PaLM](SPF7KY9K56) doesn't look at this at all.
