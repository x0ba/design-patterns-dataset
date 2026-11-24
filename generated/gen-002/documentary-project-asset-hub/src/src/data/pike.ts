import type { Turn } from './types';

// [HH:MM:SS, speaker, text]  I = interviewer, S = subject
const RAW: [string, 'I' | 'S', string][] = [
  ['00:02:10', 'I', 'Let’s start simply. Tell me your name and what you did for work.'],
  ['00:02:22', 'S', 'Leonard Pike. I worked the Halloran wharf thirty-five years, 1961 to ’96. Tally clerk first, then I drove the hopper crane, then back on the tally board at the end on account of my knees.'],
  ['00:08:40', 'I', 'Where did you grow up?'],
  ['00:08:48', 'S', 'Dock Street, number nine. From the bedroom window you could see the Customs House clock, and if the wind was right you could hear the whistle from the works across the flats. My father was on the wharf before me and his father drove a cart on Route 9. Nobody in my family was ever asked what they’d like to do.'],
  ['00:14:30', 'I', 'And how did you come to start at seventeen?'],
  ['00:14:37', 'S', 'The gate was hiring on a Monday. My father walked me down, introduced me to a man, and walked back up the hill. That was the interview.'],
  ['00:19:05', 'I', 'Tell me about the first day.'],
  ['00:19:12', 'S', 'I was seventeen. Fog so thick you couldn’t see the end of Pier 2. A man called Ned Garrity put a tally board in my hand and said, count what goes up, count what comes down, and if the two don’t agree you’ll hear about it from me and then from God. I counted four hundred and eleven sacks that morning and I have never been so sure of a number in my life.'],
  ['00:19:43', 'S', 'Salt weighs differently wet. Nobody tells you that, you find out with your back. By ten o’clock it had started to rain and the sacks drank it, and Ned looked at me and said, well, now you’re a docker. That was the whole ceremony.'],
  ['00:20:10', 'I', 'Did it feel like belonging to something?'],
  ['00:20:18', 'S', 'It felt like belonging to a rota. The belonging came later, about the time somebody lent me the price of a bus ticket and wouldn’t take it back.'],
  ['00:31:20', 'I', 'What was the union to you, in those years?'],
  ['00:31:29', 'S', 'The hall on Quay Lane. Local 418. It was where you went to find out whether you had work on Thursday, and where you went to be told you were a fool, which I generally was. Hattie Osei’s father ran the hiring board and he could say a man’s whole character with how he held the chalk.'],
  ['00:46:10', 'I', 'Did you ever think of leaving?'],
  ['00:46:16', 'S', 'Every winter. Then spring would come and the salt freighters would be lined up outside the bar and you’d think, well, somebody has to.'],
  ['00:58:40', 'I', 'What was the wharf like in the early seventies?'],
  ['00:58:49', 'S', 'Busy and tired. Crane 7 had gone in and the company wanted the same number of ships through with the same number of men, so overtime was the thing. You’d do a double and come home and your wife would have already put your dinner back in the oven twice.'],
  ['01:08:20', 'I', 'Let’s go to March of 1974. Where were you?'],
  ['01:08:31', 'S', 'Gate 4. Third night. They’d let the foremen’s cars through at six and the evening before we’d stood in front of one and a man’s wing mirror came off. Nobody planned that. After that the police came, with the dog.'],
  ['01:10:50', 'I', 'How did it feel from inside?'],
  ['01:11:05', 'S', 'Like the longest shift of my life with no pay at the end of it. But warm, too, strange to say. Hattie’s father brought tea in a milk churn. There was a man with a mouth organ by the fire barrel until two in the morning, and he was terrible.'],
  ['01:12:31', 'I', 'When the cameras showed up that night, what were they pointed at?'],
  ['01:12:40', 'S', 'They pointed at the fire barrel. That’s the picture, isn’t it? Men with their hands out over a flame, a policeman with a dog, all very clear for the six o’clock. What they didn’t point at was the gate itself, the side where the foremen’s cars came and went, because that’s where the real argument was. Half the men on that line had a brother-in-law on the other side of it.'],
  ['01:13:12', 'S', 'A young reporter came along the line asking did anybody want to say something to the camera. I said I’d like to say it to the man who owned the wharf. He said, well, he isn’t here, Mr. Pike. And I said, no, that’s what I’d like to say. They kept that in. They cut the half hour before it, where I was a good deal more polite.'],
  ['01:13:41', 'S', 'Caption on the screen said Leonard Pyke, with a y. My mother rang the pay phone at the gate before the item had finished to tell me my tie was crooked. I wasn’t wearing a tie. I’ve never asked her what she was looking at.'],
  ['01:14:05', 'I', 'Did you ever see the item itself?'],
  ['01:14:12', 'S', 'Years later. Hartwell put on a screening at the library for the twentieth anniversary. I sat at the back. It’s shorter than I remember, and so is everybody’s temper.'],
  ['01:16:50', 'I', 'How did the strike end for you?'],
  ['01:16:58', 'S', 'It didn’t end, it wore out. In the autumn they locked the gate, which was the same thing wearing a different coat. We went back on half shifts the next year and nobody said who’d won.'],
  ['01:24:15', 'I', 'Was there anyone you stopped speaking to?'],
  ['01:24:22', 'S', 'My cousin Dougie. Fifteen years. Then his wife died and I went to the funeral and he shook my hand and that was that. We never discussed it. You don’t.'],
  ['01:38:12', 'I', 'And now? What do you do with your days?'],
  ['01:38:20', 'S', 'People ask what I do now. I mend things. Clocks, mostly, and gutters for people who can’t manage the ladder. A clock’s the same job as the tally board, really. You find the place where the count goes wrong and you put it right, and nobody thanks you, but it keeps time.'],
  ['01:39:06', 'S', 'My wife says I took the wharf home with me. She’s right. I just took the quiet half of it.'],
  ['01:46:40', 'I', 'What happens to a place like this, do you think?'],
  ['01:46:50', 'S', 'It gets looked at. Which is better than not. But I’d like it used, not just looked at. A tide table needs somebody to read it.'],
  ['01:50:30', 'I', 'Anything you’d like to add?'],
  ['01:50:38', 'S', 'Only that when you’ve finished, come back and tell us how it ends. We’d all like to know.'],
];

const wps = 2.4;
export function pikeTurns(): Turn[] {
  const toS = (s: string) => { const [h, m, x] = s.split(':').map(Number); return h * 3600 + m * 60 + x; };
  return RAW.map(([t, who, text], i) => {
    const start = toS(t);
    const next = RAW[i + 1] ? toS(RAW[i + 1][0]) : start + 20;
    const est = Math.round(text.split(/\s+/).length / wps);
    return { start, end: Math.min(next, start + Math.max(4, est)), who, text };
  });
}
