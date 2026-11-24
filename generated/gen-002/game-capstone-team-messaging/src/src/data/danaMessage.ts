// Dana Whitcombe's Friday critique of build v0.7. Light markup:
//   "## n. Title" starts a numbered point, "- " is a bullet, blank line separates paragraphs,
//   *text* is emphasis.
export const DANA_CRITIQUE = `Hi Priya and team,

Thank you for sending v0.7 and for the playtest write-up. The numbers made it much easier to separate what I felt from what is actually happening to your players. I played through twice: once on my own, switching between both controllers so I could see each side, and once with my partner on the couch, who had never seen the game. The second run told me far more than the first. My notes are below, in three points, in the order I think they matter. Please read all three before reacting to any of them, because they are connected.

## 1. World 2 doesn't teach anything new

I'll say this plainly because I suspect you already feel it: rooms 2-1 through 2-4 are world 1 with a new coat of paint. The cave tileset is lovely and the lighting sells the mood, but mechanically every puzzle in world 2 asks for the same two skills the player learned in 1-2 and 1-3. Swap the tether anchor, then use the slack to reach across a gap. Difficulty rises because you add more gaps and more pressure plates, not because the player is asked to think differently. That is the difference between a harder level and a new level.

A rule of thumb I use with my own team is *teach, test, twist*. A room introduces a verb somewhere safe (teach). The next room asks the player to use it under mild pressure (test). A later room breaks the assumption they just formed about it (twist). World 1 does the first two beautifully. Room 1-3 is the best teaching room I have seen in a student build, because there is only one thing you can possibly do. World 2 starts at "test" and never reaches "twist". Players walk into the cave expecting to be surprised and get a harder spreadsheet.

I would rather you pick one new rule than three. Candidates, all things you already have in the build:

- Anchors that only hold one player's weight, so the tether has to be re-threaded in a particular order.
- A tether that shortens under tension. You have this half-implemented in the physics; I saw it in the debug overlay.
- A room where the two players' roles flip halfway through the puzzle.

Any one of these could carry four rooms. I would not attempt all of them. That also gives you a clean story to tell in your beta write-up: what you noticed, what you changed, and what happened when new players met it.

## 2. Puzzle 2-3 is a communication puzzle with no communication tools

Your summary says 7 of 11 testers got stuck on 2-3. My partner and I got stuck there too, and it was instructive to watch *why*. The solution needs one player to stand on the pressure plate while the other, who cannot see the plate's timer, crosses the bridge. The player on the far side has no way to know when it is safe. We ended up shouting "now? now?" at each other, and because the timer is silent we got it wrong six times in a row. By attempt four we were no longer solving a puzzle. We were having an argument.

Co-op puzzle games live or die on this. Asymmetric information is the best tool a two-player game has, and Portal 2's co-op chapters and *Keep Talking and Nobody Explodes* both prove it, but it only works when the information can actually travel between the players. Right now it can't. There is no ping, no emote and no shared audio cue. Failure is also silent: when the tether snaps, the room resets with no explanation, so the players cannot tell whether they mistimed something or the puzzle is impossible.

Two small changes would help a great deal. Give the plate timer an audible tick that both players can hear, and show a one-line reason when a room resets, something like "Anchor released too early". Both are cheap and neither needs new art.

One related observation. An 18-minute average completion time looks healthy on paper, but I suspect a big share of those minutes is spent in 2-3. If that room were fixed I would expect the average to drop toward 12. That is fine. A short build that flows beats a longer one that stalls.

## 3. For beta, cut before you add

You are in week 12, and I know it is tempting to read a critique like this and decide that world 2 must be torn down and rebuilt. Please don't. With beta due December 1, treat this as a prioritization exercise. A beta exists to give you evidence that the design works, not to hold final content. My suggestions, roughly in order:

- Fix the communication problem in 2-3 first. It is blocking most of your players and it is the cheapest fix on this list.
- Choose a single twist for world 2 and apply it to two rooms, 2-2 and 2-4, rather than all four. Leave 2-1 as a gentle on-ramp and 2-3 as your communication room.
- Cut anything in the plan that is not needed to test those changes. Cosmetic variants and extra polish passes go first. I noticed the build notes mention a bonus room for world 3. I would drop it for now.
- Then run another playtest with at least eight people, including several who have never seen the game, and write up what changed because of it. Your instructors will care more about that evidence than about a longer build.

I know that is a lot, and there are things I cannot see from outside the team, such as how much capacity you really have left for art and code over the next two and a half weeks. You know that better than I do, so push back on anything that does not fit.

## On the call

I am happy to do 30 minutes this week. I'm free Tuesday 4 to 6 pm, Wednesday 12 to 1 pm and Thursday 5 to 7 pm, all Pacific. Any of those works. To make the time count, please send me one specific question you would like us to spend it on. "What would you do about world 2?" is too broad. Something like "Given our schedule, which of these twists would you choose, and why?" is exactly the kind of thing I can actually help with. If someone else on the team has a question about their own area, feel free to bring them along.

Thanks again for letting me play this. I am looking forward to the next version.

Dana`;
