"use client";
// Local stand-in for the `@clerk/nextjs` client SDK (hosted Clerk auth is not
// reachable offline). It is wired in via a webpack alias in next.config.mjs only
// when OTELBIN_STUB_CLERK=1, and behaves like Clerk with a signed-in GitHub user.
import { createElement as h, Fragment, useEffect, useRef, useState } from "react";

export const stubUser = {
	id: "user_2bX7kQm4RfT9vLpZ1nHc8sWd3Ye",
	firstName: "Priya",
	lastName: "Raman",
	fullName: "Priya Raman",
	username: "praman-sre",
	primaryEmailAddress: { emailAddress: "priya.raman@northwind-freight.io" },
	imageUrl:
		"data:image/svg+xml;utf8," +
		encodeURIComponent(
			'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#db2777"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><text x="32" y="41" font-family="Helvetica,Arial,sans-serif" font-size="26" font-weight="600" fill="#fff" text-anchor="middle">PR</text></svg>'
		),
};

const clerk = { loaded: true, user: stubUser, session: { id: "sess_2bX8aLq0Zr6TmCw4uYp9EeKj1Dn" } };

export function ClerkProvider({ children }) {
	return h(Fragment, null, children);
}
export function useClerk() {
	return Object.assign({}, clerk, {
		openSignIn() {},
		signOut() {
			return Promise.resolve();
		},
	});
}
export function useAuth() {
	return { isLoaded: true, isSignedIn: true, userId: stubUser.id, sessionId: clerk.session.id };
}
export function useUser() {
	return { isLoaded: true, isSignedIn: true, user: stubUser };
}
export function SignedIn({ children }) {
	return h(Fragment, null, children);
}
export function SignedOut() {
	return null;
}
export function SignInButton({ children }) {
	return h(Fragment, null, children);
}

export function UserButton() {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useEffect(() => {
		if (!open) return;
		const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [open]);

	const item = (label) =>
		h(
			"button",
			{
				key: label,
				type: "button",
				onClick: () => setOpen(false),
				style: {
					display: "block",
					width: "100%",
					textAlign: "left",
					padding: "10px 20px",
					fontSize: 13,
					color: "#d4d4d8",
					background: "transparent",
					border: 0,
					cursor: "pointer",
				},
			},
			label
		);

	return h(
		"div",
		{ ref, style: { position: "relative", display: "flex", alignItems: "center" } },
		h(
			"button",
			{
				type: "button",
				"aria-label": "Open user button",
				onClick: () => setOpen((o) => !o),
				style: { padding: 0, border: 0, background: "transparent", borderRadius: "9999px", cursor: "pointer" },
			},
			h("img", {
				src: stubUser.imageUrl,
				alt: "Priya Raman",
				className: "w-6 h-6",
				style: { borderRadius: "9999px", display: "block" },
			})
		),
		open &&
			h(
				"div",
				{
					role: "dialog",
					style: {
						position: "absolute",
						top: 34,
						right: 0,
						width: 336,
						zIndex: 50,
						background: "#212126",
						border: "1px solid #2f2f37",
						borderRadius: 12,
						boxShadow: "0 24px 48px rgba(0,0,0,.45)",
						overflow: "hidden",
					},
				},
				h(
					"div",
					{ style: { display: "flex", gap: 12, alignItems: "center", padding: "16px 20px" } },
					h("img", { src: stubUser.imageUrl, alt: "", style: { width: 44, height: 44, borderRadius: "9999px" } }),
					h(
						"div",
						null,
						h("div", { style: { fontSize: 14, fontWeight: 600, color: "#fafafa" } }, stubUser.fullName),
						h("div", { style: { fontSize: 13, color: "#a1a1aa" } }, stubUser.primaryEmailAddress.emailAddress)
					)
				),
				h("div", { style: { borderTop: "1px solid #2f2f37" } }, item("Manage account"), item("Sign out"))
			)
	);
}
