import { serve } from "bun";
import { Database } from "bun:sqlite";
import { seedDatabase } from "./seed";
import index from "./index.html";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { computeBitSlow } from "./bitslow";

// Initialize the database
const db = new Database(":memory:");

// Seed the database with random data
seedDatabase(db, {
	clientCount: 30,
	bitSlowCount: 20,
	transactionCount: 50,
	clearExisting: true,
});

if(!process.env.JWT_SECRET)
	throw new Error("JWT_SECRET is not set, please assign it a value inside .env");

function validateEmail(email: string): boolean {
	return !!email.match(
		/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
	);
}

function validatePassword(password: string): boolean {
	return !!password.match(
		/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/,
	);
}

function validatePhone(number: string): boolean {
	return !!number.match(/^\d{10}$/);
}

const server = serve({
	routes: {
		// Serve index.html for all unmatched routes.
		"/*": index,
		"/api/transactions": {
			GET: (req) => {
				const params = new URL(req.url).searchParams;
				const indexStart = Number(sanitizeHtml(params.get("indexStart")));
				const indexEnd = Number(sanitizeHtml(params.get("indexEnd")));
				const dateStart = sanitizeHtml(String(params.get("dateStart")));
				const dateEnd = sanitizeHtml(String(params.get("dateEnd")));
				const valueStart = Number(sanitizeHtml(params.get("valueStart")));
				const valueEnd = Number(sanitizeHtml(params.get("valueEnd")));
				const buyerName = sanitizeHtml(String(params.get("buyerName")));
				const sellerName = sanitizeHtml(String(params.get("sellerName")));

				if (indexEnd < indexStart || indexEnd - indexStart > 200) {
					return Response.json(
						{ message: "invalid index range" },
						{ status: 400 },
					);
				}

				const query = db.prepare(`
				SELECT 
					t.id, 
					t.coin_id, 
					t.amount, 
					t.transaction_date,
					seller.id as seller_id,
					seller.name as seller_name,
					buyer.id as buyer_id,
					buyer.name as buyer_name,
					c.bit1,
					c.bit2,
					c.bit3,
					c.value,
					c.computed_bit_slow as computedBitSlow
				FROM transactions t
				LEFT JOIN clients seller ON t.seller_id = seller.id
				JOIN clients buyer ON t.buyer_id = buyer.id
				JOIN coins c ON t.coin_id = c.coin_id
				WHERE
					t.transaction_date >= COALESCE(NULLIF(substr(?, 7, 4) || '-' || substr(?, 1, 2) || '-' || substr(?, 4, 2), '--'), t.transaction_date) AND 
					t.transaction_date <= COALESCE(NULLIF(substr(?, 7, 4) || '-' || substr(?, 1, 2) || '-' || substr(?, 4, 2), '--'), t.transaction_date) AND
					t.amount >= COALESCE(NULLIF(?, 0), t.amount) AND
					t.amount <= COALESCE(NULLIF(?, 0), t.amount) AND
					(seller.name IS NULL OR seller.name = COALESCE(NULLIF(?, ''), seller.name)) AND
					(seller.name IS NOT NULL OR 'Original Issuer' = COALESCE(NULLIF(?, ''), 'Original Issuer')) AND
					buyer.name = COALESCE(NULLIF(?, ''), buyer.name) 
				ORDER BY t.transaction_date DESC
				LIMIT ? OFFSET ?
				`);
				let transactions;
				try {
					transactions = query.all(
						dateStart,
						dateStart,
						dateStart,
						dateEnd,
						dateEnd,
						dateEnd,
						valueStart,
						valueEnd,
						sellerName,
						sellerName,
						buyerName,
						indexEnd - indexStart,
						indexStart,
					);
				} catch (error) {
					console.error(error);
					return Response.json({ message: "invalid filters" }, { status: 400 });
				}
				return Response.json(transactions);
			},
		},
		"/api/auth/signup": {
			POST: async (req) => {
				const body = await req.json();
				const name = sanitizeHtml(body.name);
				const email = sanitizeHtml(body.email);
				const phone = sanitizeHtml(body.phone);
				const address = sanitizeHtml(body.address);
				const password = sanitizeHtml(body.password);

				if (!validateEmail(email)) {
					return Response.json({ message: "Invalid email" }, { status: 400 });
				}
				if (!validatePassword(password)) {
					return Response.json(
						{
							message:
								"Password must contain one number one special character and be 6-16 characters long",
						},
						{ status: 400 },
					);
				}
				if (!validatePhone(phone)) {
					return Response.json(
						{ message: "Invalid phone number" },
						{ status: 400 },
					);
				}

				const passwordHash = Bun.password.hashSync(password);

				const query = db.prepare(`
			 	INSERT INTO clients(name, email, phone, address, password_hash)
			 	VALUES(?, ?, ?, ?, ?)
				`);
				let result;
				try {
					result = query.run(name, email, phone, address, passwordHash);
				} catch (error) {
					if (error.code == "SQLITE_CONSTRAINT_UNIQUE") {
						return Response.json(
							{ message: "Email allready used" },
							{ status: 400 },
						);
					}
					console.error("Error signing up:", error);
					return Response.json(
						{ message: "Error please try again later" },
						{ status: 500 },
					);
				}

				// authorization via json web token stored by the client as a cookie
				const token = jwt.sign(
					{ id: result.lastInsertRowid, email: email, pass: passwordHash },
					process.env.JWT_SECRET,
					{ expiresIn: "1h" },
				);
				const cookies = req.cookies;
				cookies.set("token", token, {
					maxage: 60 * 60,
					httponly: true,
					secure: true,
					path: "/",
				});

				return Response.json(
					{ id: result.lastInsertRowid, message: "signed up" },
					{ status: 200 },
				);
			},
		},
		"/api/auth/signin": {
			POST: async (req) => {
				const body = await req.json();
				const email = sanitizeHtml(body.email);
				const password = sanitizeHtml(body.password);

				const query = db.prepare(`
				SELECT
					id,
					email,
					password_hash
				FROM clients
				WHERE email = ?
				`);
				let user: { id: number; email: string; password_hash: string };
				try {
					user = query.get(email) as {
						id: number;
						email: string;
						password_hash: string;
					};
				} catch (error) {
					console.error("Error signing in:", error);
					return Response.json(
						{ message: "Error please try again later" },
						{ status: 500 },
					);
				}

				if (!user) {
					return Response.json(
						{ message: "Wrong password or email" },
						{ status: 400 },
					);
				}
				if (!Bun.password.verifySync(password, user.password_hash)) {
					return Response.json(
						{ message: "Wrong password or email" },
						{ status: 400 },
					);
				}

				// authorization via json web token stored by the client as a cookie
				const token = jwt.sign(
					{ id: user.id, email: email, pass: user.password_hash },
					process.env.JWT_SECRET,
					{ expiresIn: "1h" },
				);
				const cookies = req.cookies;
				cookies.set("token", token, {
					maxage: 60 * 60,
					httponly: true,
					secure: true,
					path: "/",
				});
				console.log(user.id, user.email, user.password_hash);

				return Response.json(
					{ id: user.id, message: "signed in" },
					{ status: 200 },
				);
			},
		},
		"/api/profile/:id/bitslows": {
			GET: (req) => {
				const cookies = req.cookies;
				const token = cookies.get("token");
				let decoded: { id: number; email: string; pass: string };
				try {
					decoded = jwt.verify(token, process.env.JWT_SECRET);
				} catch (error) {
					cookies.delete("token");
					return Response.json({ message: "Please sign in" }, { status: 400 });
				}
				if (decoded.id != Number(req.params.id)) {
					return Response.json({ message: "access denied" }, { status: 400 });
				}

				const query = db.prepare(`
				SELECT
					coin_id,
					bit1,
					bit2,
					bit3,
					value,
					computed_bit_slow as computedBitSlow
				FROM coins
				WHERE client_id = ?
				`);
				let result: {
					coin_id: number;
					bit1: number;
					bit2: number;
					bit3: number;
					value: number;
					computedBitSlow: string;
				}[];
				try {
					result = query.all(Number(req.params.id)) as {
						coin_id: number;
						bit1: number;
						bit2: number;
						bit3: number;
						value: number;
						computedBitSlow: string;
					}[];
				} catch (error) {
					return Response.json(
						{ message: "Error please try again later" },
						{ status: 500 },
					);
				}

				return Response.json(result, { status: 200 });
			},
		},
		"/api/profile/:id/transactions": {
			GET: (req) => {
				const cookies = req.cookies;
				const token = cookies.get("token");
				let decoded: { id: number; email: string; pass: string };
				try {
					decoded = jwt.verify(token, process.env.JWT_SECRET);
				} catch (error) {
					cookies.delete("token");
					return Response.json({ message: "Please sign in" }, { status: 400 });
				}
				if (decoded.id != Number(req.params.id)) {
					return Response.json({ message: "access denied" }, { status: 400 });
				}

				interface QueryResult {
					id: number;
					coin_id: number;
					amount: number;
					transaction_date: string;
					seller_id: number | null;
					seller_name: string | null;
					buyer_id: number;
					buyer_name: string;
					bit1: number;
					bit2: number;
					bit3: number;
					value: number;
					computedBitSlow: string;
				}
				const query = db.prepare(`
         		SELECT 
         		  	t.id, 
         		  	t.coin_id, 
         		  	t.amount, 
         		  	t.transaction_date,
         		  	seller.id as seller_id,
         		  	seller.name as seller_name,
         		  	buyer.id as buyer_id,
         		  	buyer.name as buyer_name,
         		  	c.bit1,
         		  	c.bit2,
         		  	c.bit3,
         		  	c.value,
					c.computed_bit_slow as computedBitSlow
         		FROM transactions t
         		LEFT JOIN clients seller ON t.seller_id = seller.id
         		JOIN clients buyer ON t.buyer_id = buyer.id
         		JOIN coins c ON t.coin_id = c.coin_id
				WHERE seller.id = ? OR buyer.id = ?
         		ORDER BY t.transaction_date DESC
				`);
				let result: QueryResult[];
				try {
					result = query.all(
						Number(req.params.id),
						Number(req.params.id),
					) as QueryResult[];
				} catch (error) {
					console.error("Error getting user transactions", error);
					return Response.json(
						{ message: "Error please try again later" },
						{ status: 500 },
					);
				}

				return Response.json(result, { status: 200 });
			},
		},
		"/api/bitslows": {
			GET: (req) => {
				const params = new URL(req.url).searchParams;
				const indexStart = Number(sanitizeHtml(params.get("indexStart")));
				const indexEnd = Number(sanitizeHtml(params.get("indexEnd")));

				if (indexEnd < indexStart || indexEnd - indexStart > 200) {
					return Response.json(
						{ message: "invalid index range" },
						{ status: 400 },
					);
				}

				const cookies = req.cookies;
				const token = cookies.get("token");
				let decoded: { id: number; email: string; pass: string };
				try {
					decoded = jwt.verify(token, process.env.JWT_SECRET);
				} catch (error) {
					return Response.json({ message: "Pease Sign In" }, { status: 400 });
				}

				const query = db.prepare(`
				SELECT 
					owner.id as owner_id,
					owner.name as owner_name,
					c.coin_id,
					c.bit1,
					c.bit2,
					c.bit3,
					c.value,
					c.computed_bit_slow as computedBitSlow
				FROM coins c
				LEFT JOIN clients owner ON c.client_id = owner.id
				WHERE COALESCE(owner.id, -1) != ?
				LIMIT ? OFFSET ?
				`);
				let bitSlows;
				try {
					bitSlows = query.all(decoded.id, indexEnd - indexStart, indexStart);
				} catch (error) {
					console.error(error);
					return Response.json(
						{ message: "Error getting bitSlow, try again later" },
						{ status: 500 },
					);
				}

				return Response.json(bitSlows);
			},
		},
		"/api/bitslow/:id/buy": {
			PUT: (req) => {
				const cookies = req.cookies;
				const token = cookies.get("token");
				let decoded: { id: number; email: string; pass: string };
				try {
					decoded = jwt.verify(token, process.env.JWT_SECRET);
				} catch (error) {
					cookies.delete("token");
					return Response.json({ message: "Please sign in" }, { status: 400 });
				}

				let oldCoinData;
				try {
					oldCoinData = db
						.prepare(`Select * FROM coins WHERE coin_id = ?`)
						.get(Number(req.params.id));
				} catch (error) {
					return Response.json(
						{ message: "Invalid bitSlow id" },
						{ status: 400 },
					);
				}

				const query = db.prepare(`
				UPDATE coins SET client_id = ? WHERE coin_id = ?
				`);
				try {
					query.run(decoded.id, Number(req.params.id));
				} catch (error) {
					console.log("Error buying bitSlow:", error);
					return Response.json(
						{ message: "Error buying bitSlow please try again later" },
						{ status: 500 },
					);
				}

				const transactionQuery = db.prepare(`
				INSERT INTO transactions(coin_id, seller_id, buyer_id, amount)
				VALUES(?, ?, ?, ?)
				`);
				try {
					transactionQuery.run(
						Number(req.params.id),
						oldCoinData.client_id,
						decoded.id,
						oldCoinData.value,
					);
				} catch (error) {
					try {
						query.run(oldCoinData.client_id, Number(req.params.id));
					} catch (error) {
						console.log("Error buying bitSlow:", error);
						return Response.json(
							{ message: "Error buying bitSlow please try again later" },
							{ status: 500 },
						);
					}
					console.log("Error buying bitSlow:", error);
					return Response.json(
						{ message: "Error buying bitSlow please try again later" },
						{ status: 500 },
					);
				}

				return Response.json({ message: "success" }, { status: 200 });
			},
		},
		"/api/bitslow/generate": {
			POST: async (req) => {
				const cookies = req.cookies;
				const token = cookies.get("token");
				let decoded: { id: number; email: string; pass: string };
				try {
					decoded = jwt.verify(token, process.env.JWT_SECRET);
				} catch (error) {
					console.error("Error getting user transactions", error);
					cookies.delete("token");
					return Response.json({ message: "access denied" }, { status: 400 });
				}

				let bitsUsed;
				try {
					bitsUsed = db.query(`SELECT bit1, bit2, bit3 FROM coins`).all();
				} catch (error) {
					return Response.json(
						{ message: "Error generating bitSlow try again later" },
						{ status: 500 },
					);
				}

				let bit1: number, bit2: number, bit3: number;
				do {
					bit1 = Math.floor(Math.random() * 10 + 1);
					bit2 = Math.floor(Math.random() * 10 + 1);
					bit3 = Math.floor(Math.random() * 10 + 1);
				} while (
					bitsUsed.some(
						(val) => val.bit1 == bit1 && val.bit2 == bit2 && val.bit3 == bit3,
					)
				);

				const computedBitSlow = computeBitSlow(bit1, bit2, bit3);

				const body = await req.json();
				const query = db.prepare(`
				INSERT INTO coins(client_id, bit1, bit2, bit3, value, computed_bit_slow)
				VALUES(?, ?, ?, ?, ?, ?)
				`);
				let lastId;
				try {
					lastId = query.run(
						decoded.id,
						bit1,
						bit2,
						bit3,
						Number(body.value),
						computedBitSlow,
					).lastInsertRowid;
				} catch (error) {
					return Response.json(
						{ message: "Error generating bitSlow try again later" },
						{ status: 500 },
					);
				}

				const transactionQuery = db.prepare(`
				INSERT INTO transactions(coin_id, buyer_id, amount)
				VALUES(?, ?, ?)
				`);
				try {
					transactionQuery.run(lastId, decoded.id, Number(body.value));
				} catch (error) {
					console.log("Error buying bitSlow:", error);
					return Response.json(
						{ message: "Error buying bitSlow please try again later" },
						{ status: 500 },
					);
				}

				return Response.json({ message: "BitSlow generated" }, { status: 200 });
			},
		},
	},
	development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);
