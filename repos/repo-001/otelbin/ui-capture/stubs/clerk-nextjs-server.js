// Local stand-in for `@clerk/nextjs/server` (see clerk-nextjs.js). Every request
// is treated as coming from the signed-in stub user.
const userId = "user_2bX7kQm4RfT9vLpZ1nHc8sWd3Ye";

function authObject() {
	return { userId, sessionId: "sess_2bX8aLq0Zr6TmCw4uYp9EeKj1Dn", orgId: null, getToken: async () => null };
}

export function createRouteMatcher(patterns) {
	const list = (Array.isArray(patterns) ? patterns : [patterns]).map(
		(p) => new RegExp("^" + p.replace(/\(\.\*\)/g, ".*") + "$")
	);
	return (req) => list.some((re) => re.test(req.nextUrl.pathname));
}

export function clerkMiddleware(handler) {
	return async (request, event) => {
		const auth = Object.assign(async () => authObject(), { protect: async () => authObject() });
		return handler ? handler(auth, request, event) : undefined;
	};
}

export async function auth() {
	return authObject();
}
export async function currentUser() {
	return { id: userId, firstName: "Priya", lastName: "Raman" };
}
