// Rulebook for Saltwind Exchange v0.7. Each rule: [id, title, text].
// Blocks are separated by blank lines; "- " lines are bullets, "1. " lines are numbered steps, **x** is bold.

export const SECTION_TITLES: Record<number, string> = {
  1: 'Overview',
  2: 'Setup',
  3: 'Turn Structure',
  4: 'Ships and Docking',
  5: 'The Market',
  6: 'Harbors',
  7: 'Contracts',
  8: 'Events',
  9: 'Endgame and Scoring',
  10: 'Variants',
  11: 'Quick Reference',
};

export const RULES: [string, string, string][] = [
  ['1.1', 'The Goal',
`You are a merchant captain working the harbor town of Saltwind. Over six rounds you will commission ships, haul cargo from harbor to harbor, play Market cards to bend prices in your favor, and build Harbors that pay you every time traffic passes through. When the sixth round ends, the captain with the most Renown wins.

Saltwind Exchange is for two to five players, ages twelve and up, and takes about ninety minutes once everyone knows the rules. The first game usually takes a little longer.`],

  ['1.2', 'Components',
`Before you begin, check that the box contains the following:

- 84 cards in five decks: 18 Ship cards, 12 Harbor cards, 24 Market cards, 20 Event cards and 10 Contract cards
- 1 Price Board with five price tracks
- 5 price markers, one for each kind of cargo
- 120 coin tokens in values of 1, 5 and 10
- 100 cargo tokens: 20 each of Salt, Timber, Cloth, Spice and Pearl
- 5 berth boards, one for each player
- 1 Gull marker, which shows who is the first player this round
- 5 player aid cards and this rulebook`],

  ['1.3', 'Reading the Cards',
`Every card has a name in its title band, a cost in the coin at the top left, effect text in the middle and a line of flavor text at the bottom. Flavor text has no effect on the game. It exists because somebody who designs board games on their evenings off believes that a ship should have a personality.

If a card contradicts this rulebook, the card wins. If two cards contradict each other, the card that was played most recently wins. If you still cannot agree, the player who is not involved in the dispute and sits closest to the Gull marker decides, and nobody is allowed to grumble for more than a minute.

Whenever an effect asks you to divide something and the result is not a whole number, round down. Prices can never fall below 1 or rise above 8, no matter what a card says.`],

  ['2.1', 'Preparing the Table',
`Place the Price Board in the middle of the table within reach of everyone. Set the five price markers to their starting prices:

- Salt starts at 2
- Timber starts at 3
- Cloth starts at 4
- Spice starts at 5
- Pearl starts at 6

Each player begins the game with 10 coins. Keep your coins in a visible pile. Coin counts are public information, and anyone may ask to count your purse at any time, so do not be shy about it.`],

  ['2.2', 'Shuffling and Dealing',
`Separate the cards by the symbol in the corner of the back. Shuffle each of the five decks on its own and place them face down within reach of everyone, with the Event deck closest to the Price Board.

Before you shuffle the Ship deck, find the card named Skiff Marigold and deal one copy to each player. This is your first ship and it begins the game docked at no harbor in particular. If you are playing with fewer than five players, return the unused copies to the box.

Next, deal each player two Contract cards and two Market cards. Look at your cards without showing them. Choose one of your two Contract cards to keep and return the other to the bottom of the Contract deck. You keep both of your Market cards.

Finally, reveal the top two cards of the Harbor deck and place them face up beside the Price Board. These are the Harbors that can be built in the first round. Whenever a Harbor is built, replace it from the deck.`],

  ['2.3', 'Choosing the First Player',
`The player who most recently crossed water on a boat of any size takes the Gull marker and is the first player. If nobody at the table has done so in the last year, the player with the saltiest sense of humor takes it.

Once everyone has their cards, coins and ship, flip the top card of the Event deck face up beside the Price Board. This is the weather for round one, and the first round begins.`],

  ['3.1', 'The Round',
`The game lasts six rounds. Each round has six phases, which are always played in the same order:

1. **Tide.** Reveal the top Event card and resolve it.
2. **Market.** Players take turns buying and playing Market cards. Prices drift.
3. **Sail.** Players take turns commissioning ships, sailing, docking, loading and unloading.
4. **Trade.** Everyone sells cargo at the current prices.
5. **Harbor.** Players build Harbors and collect Harbor income.
6. **Tally.** Pay upkeep, pass the Gull marker and check for the end of the game.

Within a phase, play proceeds in turn order, starting with the player holding the Gull marker and moving clockwise. Phases two, three and five give each player one turn. Phases one, four and six are resolved by everyone at the same time, except where a card says otherwise.`],

  ['3.2', 'Tide and Market Phases',
`**Tide.** Flip the top card of the Event deck and read it aloud. Most Events take effect immediately and last for the round. A few have a lasting effect that stays in play until the card says it ends. See section 8 for the different kinds of Events.

**Market.** Starting with the first player, each player may buy any number of Market cards from the display and may play any number of Market cards from their hand, one at a time. To play a Market card, pay its cost in coins to the bank, read the card aloud and apply it to the Price Board. The prices are final once everyone has had a turn.

At the end of the Market phase, every price marker that was moved this round drifts one step back toward its starting price. See rule 5.3 for the details of drifting.`],

  ['3.3', 'Sail and Trade Phases',
`**Sail.** Starting with the first player, each player takes one turn. On your turn you may do the following in any order, as many times as you wish, provided you can pay for it:

- Commission a ship by paying its cost (rule 4.1)
- Sail a ship to a harbor and moor it there (rule 4.2)
- Load or unload cargo on a docked ship (rule 4.3)

Ships that are moored at the end of the round stay where they are. They do not need to sail again, but they also do not earn anything unless something happens at their harbor.

**Trade.** All players simultaneously sell cargo from their docked ships at the prices on the Price Board. You may sell any amount of cargo that is on a docked ship. Sold cargo goes back to the common supply. Cargo that is still at sea at the end of the Trade phase cannot be sold this round and returns with the ship next round.`],

  ['3.4', 'Harbor and Tally Phases',
`**Harbor.** Starting with the first player, each player may build one Harbor from the display by paying its cost. Then everyone collects income from the Harbors they own. See section 6.

**Tally.** Players pay the upkeep printed on their ships, if any. Any player who cannot pay upkeep must retire one ship for each coin they are short; see rule 4.4. Then pass the Gull marker one seat clockwise and discard the Event card that was flipped at the start of the round, unless it has a lasting effect.

If this was the sixth round, the game ends and you proceed to section 9. Otherwise a new round begins with the Tide phase.`],

  ['4.1', 'Commissioning a Ship',
`During the Sail phase, you may commission a ship from the Ship deck. Draw the top three Ship cards and look at them. Choose one, pay its cost in coins to the bank, and place it on your berth board. Return the other two to the bottom of the Ship deck in any order.

You may have at most four ships on your berth board at one time. If you want to commission a fifth, you must first retire one of your ships (rule 4.4).

The number printed after the word Hold on a ship card is the number of cargo tokens it can carry. A ship can never carry more than its Hold, even briefly. If a card would give you more cargo than your ships can hold, the extra cargo is lost.`],

  ['4.2', 'Docking',
`A ship that has sailed to a harbor may moor there if the harbor has an open berth. Each harbor has a number of berths equal to the number of players minus one. When a ship moors it is said to be docked, and its owner pays the harbor's docking fee to the harbor's owner, or to the bank if nobody owns the harbor.

If more ships arrive than there are berths, the later arrivals wait at sea. A docked ship may load and unload cargo once during the round. A ship that cannot dock stays at sea and may try another harbor next round.

Some ships and Harbors change how docking works. Read the card carefully, and remember that the card wins (rule 1.3).`],

  ['4.3', 'Loading and Unloading Cargo',
`A docked ship may load and unload cargo once per round, at the moment it docks or later in the same round. Loading and unloading do not cost anything except the price of the cargo itself.

To load, take cargo tokens from the supply and place them on the ship, up to its Hold. You pay the wholesale price for each token, which is two coins below the current price on the Price Board, to a minimum of 1 coin. To unload, take any cargo off the ship and place it on your berth board beside the ship, where it waits for the Trade phase.

Cargo that you unload may be sold in the Trade phase for the full current price. The difference between the wholesale price and the full price is how a captain makes a living, and it is why price cards matter so much.

You can load different kinds of cargo on the same ship, up to its Hold. Some ships, such as Lugger Pell, restrict what they can carry; the card will say so.`],

  ['4.4', 'Upkeep and Retiring Ships',
`Most ships cost nothing to keep. A few, such as Fluyt Annelise, charge upkeep every round, which is printed on the card. Upkeep is paid in the Tally phase.

You may retire a ship at any time during your own turn in the Sail phase. Place the ship card at the bottom of the Ship deck. Any cargo on the ship is returned to the supply. You do not receive any coins for a retired ship unless a card says so.

If you cannot pay your upkeep, you must retire one ship for each coin you are short. You choose which ships to retire. Do not retire ships you have just paid for unless you have no choice; it feels worse than it looks.`],

  ['5.1', 'Price Cards',
`Market cards are the main way players change the prices of cargo. Each Market card has a cost, which you pay to the bank when you play it, and an effect that moves one or more price markers on the Price Board. Some cards move prices for every cargo, and some move a single price.

Price changes apply to everyone, including the player who played the card. This is the part that most often surprises new players. If you play Spice Glut to push the price of Spice down, your own Spice cargo is worth less too. The trick is to play it when you are not holding any, or when you plan to buy at the low price and sell after the price has drifted back up.

You may play several Market cards in one turn. Cards are resolved one at a time in the order played. A card that has been played is placed in the Market discard pile face up, so that everyone can see which prices have already been disturbed this round.`],

  ['5.2', 'Price Floor and Ceiling',
`No price can ever fall below 1 or rise above 8. If a card would push a price past either limit, move the marker as far as it can go and ignore the rest.

The wholesale price of any cargo is two coins below its current price, to a minimum of 1 coin. When a price is 3 or less, wholesale cargo costs 1 coin. A very low price is therefore good for buyers and bad for sellers, and a very high price is the reverse.

Prices that sit on the floor or ceiling do not drift in the usual way. At the end of the Market phase, a marker on the floor moves up one step and a marker on the ceiling moves down one step, even if it was not moved by a card this round. This keeps the market from freezing in place, which the early playtests proved can happen.

Some Events fix a price at a single value for the round. A fixed price cannot be changed by any Market card until the Event ends.`],

  ['5.3', 'Drifting',
`At the end of every Market phase, each price marker that was moved this round drifts one step back toward its starting price, as listed in rule 2.1. A marker that is already at its starting price stays put. A marker that was moved by two or more cards still drifts only a single step.`],

  ['6.1', 'Building a Harbor',
`In the Harbor phase, starting with the first player, each player may build one Harbor from the two that are face up beside the Price Board. Pay the cost printed on the card to the bank and place the card face up in front of you. Then draw a replacement from the Harbor deck.

You may own at most three Harbors. If you want to build a fourth, you must first demolish one of your own. Demolished Harbors go to the bottom of the Harbor deck and their owners receive no refund.

A Harbor you own is a harbor that your ships and other players' ships can dock at. The two Harbors on display are the only ones that are in play until somebody builds one, so a player who builds the best Harbor first has a real head start. This is why building comes after the Sail phase and not before it.

Every Harbor card has a special effect printed on it. Unless the card says otherwise, the effect works for as long as you own the Harbor.`],

  ['6.2', 'Harbor Income',
`At the end of the Harbor phase, each player collects income from the Harbors they own. The standard income of a Harbor is one coin for each ship docked there at that moment, whoever the ship belongs to. A Harbor with no ships earns nothing.

Harbor income is capped at 3 coins per round. Any additional income that you would earn is lost. Effects printed on Harbor cards that give you coins at other times, such as the Counting House or Tidewarden's Quay, are not income and are not counted toward the cap.

The cap was introduced after the first four-player game of version 0.7, in which one player collected more than fifteen coins in a single round and ended the game with more than three times as many coins as anyone else. If your group finds the cap too strict, you can try raising it to 4. Please tell us what happened.

Income is collected after all players have built. It is therefore possible to build a Harbor and be paid by it on the same round.`],

  ['6.3', 'Docking Fees',
`Every Harbor you own charges a docking fee. The standard fee is 1 coin per ship per round, paid by the ship's owner when the ship docks. If you dock your own ship at your own Harbor, you pay nothing.

Some Harbor cards change the docking fee. For example, Customs Shed makes opponents pay one extra coin to dock, and Tidewarden's Quay lets its owner's ships dock for free. When two effects change the fee, apply increases first and then reductions. A fee can never be less than zero.

The docking fee is paid to the Harbor's owner at the moment of docking and is not income. It is not counted toward the cap in rule 6.2.`],

  ['7.1', 'Taking Contracts',
`A Contract is a promise to deliver a specific cargo to a specific harbor by a specific round, in return for a payment and some Renown. Each player begins the game with one Contract, which they chose during setup.

At any time during the Sail phase, you may draw the top two cards of the Contract deck, look at them, and take one by paying its cost in coins to the bank. Return the other to the bottom of the deck. You may hold at most three Contracts at a time, counting the one you started with.

Most Contracts require that you deliver cargo by unloading it at a particular kind of harbor. A harbor you own is the easiest place to unload, but any harbor will do unless the card says otherwise.

Contracts that you hold are kept face down in front of you. The contents are secret until you fulfill them or the game ends.`],

  ['7.2', 'Fulfilling Contracts',
`To fulfill a Contract, unload the cargo it names from a docked ship at the harbor it asks for, and then reveal the Contract. Return the cargo to the supply, then take the payment printed on the card from the bank and place the Contract face up in front of you. It scores the Renown shown at the bottom.

A single unloading can fulfill several Contracts if you have enough cargo and each Contract's requirements are met. You cannot use the same cargo token for two Contracts.

Cargo that you deliver to a Contract cannot also be sold in the Trade phase. If you want to do both, you will need two ships, and probably a better plan than the one you had when you sat down.

You may fulfill a Contract on the round you take it, provided that you can still dock and unload. The deadline printed on a Contract is the last round in which it can be fulfilled.`],

  ['7.3', 'Failed Contracts',
`A Contract whose deadline passes without being fulfilled is failed. When a Contract fails, flip it face up and place it in front of you. A failed Contract scores no Renown, and it also counts as a penalty of 1 Renown at the end of the game.

Failing a Contract on purpose is a legal strategy, and a surprisingly common one in the early rounds when the payment on a Contract can be less than the cost of the cargo. Think carefully before you take a Contract in the final round.`],

  ['8.1', 'Drawing Events',
`At the start of every round, in the Tide phase, flip the top card of the Event deck and resolve it before anything else. The Event deck has twenty cards, which is more than you will need in a six-round game, so you will never see all of them in a single game.

An Event card is one of three types, shown by the symbol in its title band:

- **Weather** Events affect ships and last for the round
- **Trade** Events affect prices or cargo and are resolved immediately
- **Lasting** Events remain in play until a condition on the card is met

If an Event asks a question that the rulebook does not answer, the first player decides. The decision stands for the rest of the game and should be written on the margin of the player aid, in pencil, with the date.`],

  ['8.2', 'Storms and Fog',
`Storms are the most dangerous Weather Events. When a Storm is revealed, each ship that is at sea rather than docked is caught in the weather. The owner must choose either to lose half of the ship's cargo, rounded up, or to pay 2 coins to the bank to ride it out. Ships that are docked are not affected.

Carrack Ironbell and Beacon Tower both protect against Storms. See the cards for the details.

Fog Bank is a different kind of Weather Event. When it is in play, no player may sail a ship to a harbor that has no ships docked. The rest of the round proceeds as normal, including the Market phase. Fog Bank does not change prices and does not prevent Market cards from being played.

If two Weather Events are in play at the same time, resolve them one at a time in the order they were revealed. If the Events contradict, the most recent one wins.`],

  ['9.1', 'The Final Round',
`The game ends after the Tally phase of round six. The sixth round is played exactly like the others, including the Tide phase and a freshly revealed Event, but with two differences. First, Contracts that are not fulfilled by the end of the round count as failed, even if the deadline printed on the card has not yet passed. Second, players may not build any Harbors in the Harbor phase, because there will be no time to benefit from them.

[TODO: worked example of the final round, with a short table showing the Tally phase and the final Renown count for a sample four-player game.]

After the Tally phase, players proceed to scoring. Remove all cargo from your ships and return it to the supply. Cargo does not count toward Renown, so sell it before the final Trade phase ends.`],

  ['9.2', 'Scoring Renown',
`Each player adds up their Renown from the following sources:

- 1 Renown for every 5 coins in your purse, rounded down
- The Renown printed on each Contract you have fulfilled
- 2 Renown for each Harbor you own
- The Renown printed on each of your ships, such as Galleon Verity
- Minus 1 Renown for each failed Contract

Coins are the largest part of most scores, but a captain with a strong Contract hand and two Harbors can win with a modest purse. If your table finds that coin always wins, please tell us. If your table finds that coin never wins, please also tell us.`],

  ['9.3', 'Breaking Ties',
`If two or more players are tied for the most Renown, the tied player who has the most fulfilled Contracts wins. If they are still tied, the tied player who owns the most Harbors wins. If they are still tied, the tied player with the most coins wins.

If they are still tied after that, the tied players share the victory and divide the pot of the evening's snacks equally. Nobody is allowed to propose a rematch until the snacks have been counted.

In a two-player game, or in a game with a short deck, ties are more common than you might expect. See rule 10.1 for advice.`],

  ['10.1', 'Two-Player Game',
`With two players, Saltwind Exchange becomes a duel of prices. Use the standard rules with the following changes:

- Each harbor has only one berth. Remember that the number of berths is the number of players minus one.
- Remove four of the Event cards at random before the game begins and do not look at them.
- Each player starts with 12 coins instead of 10.
- Contracts that name two cargo types count for double Renown, because there is nobody else to compete with.

The two-player game is shorter than the standard game, usually about 60 minutes. If it feels too short, play seven rounds instead of six and add one extra Tally phase at the end.`],

  ['10.2', 'Short Game',
`The Short Game is designed for groups that have only an hour, or for those who want to teach the game to a new player without exhausting them. It uses the standard rules with these changes:

- Play five rounds instead of six
- Remove all Lasting Events from the Event deck
- Each player starts with a second ship, drawn from the Ship deck, instead of a second Market card
- Harbors may not be built in the fifth round
- Docking fees are doubled, which makes the game faster and meaner

In the Short Game, the final round follows rule 9.1 with the fifth round standing in for the sixth. All other timings are the same.`],

  ['11.1', 'Round Summary',
`Use this page as a reminder once you know the rules. Each round proceeds in this order:

1. **Tide.** Flip the top Event card and resolve it.
2. **Market.** In turn order, buy and play Market cards. At the end, all moved prices drift one step toward their starting price.
3. **Sail.** In turn order, commission ships, sail, dock, load and unload.
4. **Trade.** Everyone sells cargo from docked ships at the current prices.
5. **Harbor.** In turn order, build one Harbor. Then everyone collects Harbor income, capped at 3 coins.
6. **Tally.** Pay upkeep, pass the Gull marker, and check for the end of the game.

Limits to remember: four ships, three Harbors, three Contracts, six Market cards in hand. Prices stay between 1 and 8. Wholesale cargo costs two coins less than the current price.`],

  ['11.2', 'Glossary',
`**Berth.** A place at a harbor where a ship can be docked. Each harbor has one fewer berth than there are players.

**Bank.** The common supply of coins and cargo tokens.

**Docked.** A ship that has taken a berth at a harbor is docked. Only docked ships can load, unload or sell cargo.

**Drift.** The movement of a price marker back toward its starting price at the end of the Market phase.

**Hold.** The number of cargo tokens a ship can carry.

**Renown.** The score that decides the winner.

**Retire.** To remove a ship from play and put it at the bottom of the Ship deck.

**Wholesale price.** The price paid to load cargo, which is two coins less than the current price and never less than 1 coin.`],

  ['11.3', 'Frequently Asked Questions',
`**Can I play a Market card during another player's turn?** No. Market cards are played only on your own turn in the Market phase.

**What if a Market card tells me to move a price that is already at its limit?** Ignore the move. The marker stays where it is.

**Does the Event card in the final round still get resolved?** Yes. See rule 9.1.

**Can I sell cargo that I unloaded in an earlier round?** Yes, but only if it is on a docked ship when the Trade phase begins. Cargo that sits on the berth board waits for a ship.`],

];
