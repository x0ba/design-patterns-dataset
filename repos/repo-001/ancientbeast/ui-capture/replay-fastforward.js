// Capture helper (not app code): the build seeds an in-progress match through the
// game's DEBUG_GAME_LOG replay. Replays start at normal speed by design; this presses
// the game's own "Fast Forward" replay control (same as the F hotkey / skip button)
// once, so the board reaches the saved mid-match state within seconds.
(function () {
	var tries = 0;
	var timer = setInterval(function () {
		var g = window.AB && window.AB.currentGame;
		tries++;
		if (g && g.isReplayInProgress && g.UI && g.replayMode === 'play' && g.gameState === 'playing') {
			g.toggleReplayFastForward();
			clearInterval(timer);
		} else if (tries > 600) {
			clearInterval(timer);
		}
	}, 100);
})();
