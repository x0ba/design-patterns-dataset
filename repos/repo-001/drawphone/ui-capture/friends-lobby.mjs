// Opens a live lobby (game code "kiwi") with a few friends already waiting in it,
// using the app's own socket.io API, so "Join Party" -> code kiwi lands in a real lobby.
import { io } from "socket.io-client";

export const FRIENDS_CODE = "kiwi";
const FRIENDS = ["Maya", "Jordan", "Priya", "Dev"];

export function openFriendsLobby(drawphone, port) {
    if (!drawphone.findGame(FRIENDS_CODE)) drawphone.newGame(FRIENDS_CODE);
    FRIENDS.forEach((name, i) => {
        setTimeout(() => {
            const s = io(`http://localhost:${port}`, { transports: ["websocket"], reconnection: true });
            s.on("connect", () => s.emit("joinGame", { code: FRIENDS_CODE, name }));
            // if the user replaces/kicks etc. nothing else is needed; friends just wait in the lobby
        }, 300 * i);
    });
}
