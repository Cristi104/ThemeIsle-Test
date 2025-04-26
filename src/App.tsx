import "./index.css";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Link,
	Outlet,
	Navigate,
	useNavigate,
	data,
} from "react-router-dom";
import { URLSearchParams } from "url";

// Define the Transaction interface based on the API response
interface Transaction {
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

interface BitSlowCoin {
	coin_id: number;
	bit1: number;
	bit2: number;
	bit3: number;
	value: number;
	computedBitSlow: string;
}

const ENDPOINT_URL = "http://localhost:3000/"; // NOTE: change this based on your environment.

function cookieExists(name: string): boolean {
	return document.cookie.includes(name);
}

function Dashboard() {
	interface data {
		indexStart: number;
		indexEnd: number;
		dateStart: string;
		dateEnd: string;
		valueStart: string;
		valueEnd: string;
		buyerName: string;
		sellerName: string;
	}

	const [formData, setFormData] = useState<data>({
		indexStart: 0,
		indexEnd: 50,
		dateStart: "",
		dateEnd: "",
		valueStart: "",
		valueEnd: "",
		buyerName: "",
		sellerName: "",
	});
	const [submitData, setSubmitData] = useState<data>({ ...formData });

	function handleSubmit(e) {
		e.preventDefault();
		setSubmitData({ ...formData });
	}

	function handleChange(e) {
		e.preventDefault();
		const { name, value } = e.target;
		setFormData((prevData) => ({
			...prevData,
			[name]: value,
		}));
	}

	function Transactions(props) {
		const [transactions, setTransactions] = useState<Transaction[]>([]);
		const [loading, setLoading] = useState(true);
		const [error, setError] = useState("");
		const [loadingTime, setLoadingTime] = useState(0);
		const [pageNumber, setPageNumber] = useState(1);
		const [transactionsPerPage, setTransactionsPerPage] = useState(50);

		console.log(props.filters);

		useEffect(() => {
			async function fetchTransactions() {
				try {
					const params = new URLSearchParams({
						indexStart: String((pageNumber - 1) * transactionsPerPage),
						indexEnd: String(pageNumber * transactionsPerPage),
						dateStart: props.filters.dateStart,
						dateEnd: props.filters.dateEnd,
						valueStart: props.filters.valueStart,
						valueEnd: props.filters.valueEnd,
						buyerName: props.filters.buyerName,
						sellerName: props.filters.sellerName,
					});
					const response = await fetch(
						ENDPOINT_URL + `api/transactions?${params.toString()}`,
					);
					const data = await response.json();

					if (response.status != 200) {
						setError(data.message);
						setLoading(false);
					} else {
						setTransactions(data);
						setLoading(false);
					}
				} catch (error) {
					setError(error.message);
					setLoading(false);
				}
			}
			fetchTransactions();
		}, [pageNumber, transactionsPerPage, props.filters]);

		useEffect(() => {
			let timerId: number | undefined;

			if (loading) {
				timerId = window.setInterval(() => {
					setLoadingTime((prevTime) => prevTime + 1);
				}, 1000);
			}

			return () => {
				if (timerId) clearInterval(timerId);
			};
		}, [loading]);

		if (loading) {
			return (
				<div className="flex flex-col justify-center items-center h-screen bg-gray-50">
					<div className="w-16 h-16 mb-4 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
					<div className="animate-pulse flex flex-col items-center">
						<h2 className="text-xl font-semibold text-gray-700 mb-2">
							Loading Transactions
						</h2>
						<p className="text-sm text-gray-600 mb-2">
							Time elapsed: {loadingTime} seconds
						</p>
						<div className="flex space-x-1">
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: "0ms" }}
							></div>
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: "150ms" }}
							></div>
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: "300ms" }}
							></div>
						</div>
					</div>
				</div>
			);
		}

		if (error) {
			return <div className="text-red-500 p-4 text-center">{error}</div>;
		}

		return (
			<div className="w-full mx-auto p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
				<div className="mb-8 flex">
					<h1 className="text-3xl font-bold text-gray-800 max-w-fit">
						BitSlow Transactions
					</h1>
					<span className="grid grid-cols-3 ml-auto gap-2">
						<p className="col-span-3">No. of transactions</p>
						<button
							className={`${transactionsPerPage == 15 ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-lg`}
							onClick={(e) => {
								e.preventDefault();
								setTransactionsPerPage(15);
							}}
						>
							15
						</button>
						<button
							className={`${transactionsPerPage == 30 ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-lg`}
							onClick={(e) => {
								e.preventDefault();
								setTransactionsPerPage(30);
							}}
						>
							30
						</button>
						<button
							className={`${transactionsPerPage == 50 ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-lg`}
							onClick={(e) => {
								e.preventDefault();
								setTransactionsPerPage(50);
							}}
						>
							50
						</button>
					</span>
				</div>

				{transactions.length === 0 ? (
					<p className="text-gray-500">No transactions found</p>
				) : (
					<div className="overflow-x-auto rounded-lg shadow-md">
						<table className="w-full border-collapse bg-white">
							<thead>
								<tr className="bg-gray-800 text-white">
									<th className="p-4 text-left">ID</th>
									<th className="p-4 text-left">BitSlow</th>
									<th className="p-4 text-left">Seller</th>
									<th className="p-4 text-left">Buyer</th>
									<th className="p-4 text-right">Amount</th>
									<th className="p-4 text-left">Date</th>
								</tr>
							</thead>
							<tbody>
								{transactions.map((transaction, index) => (
									<tr
										key={transaction.id}
										className={`hover:bg-gray-50 transition-colors ${index === transactions.length - 1 ? "" : "border-b border-gray-200"}`}
									>
										<td className="p-4 text-gray-600">{transaction.id}</td>
										<td className="p-4">
											<div>
												<div className="font-bold font-small text-gray-800">
													{transaction.computedBitSlow}
												</div>
												<div className="text-xs text-gray-500 mt-1">
													Bits: {transaction.bit1}, {transaction.bit2},{" "}
													{transaction.bit3}
												</div>
												<div className="text-xs text-gray-500">
													Value: ${transaction.value.toLocaleString()}
												</div>
											</div>
										</td>
										<td className="p-4 text-gray-700">
											{transaction.seller_name
												? transaction.seller_name
												: "Original Issuer"}
										</td>
										<td className="p-4 text-gray-700">
											{transaction.buyer_name}
										</td>
										<td className="p-4 text-right font-semibold font-small text-gray-800">
											${transaction.amount.toLocaleString()}
										</td>
										<td className="p-4 text-sm text-gray-600">
											{new Date(transaction.transaction_date).toLocaleString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
				<div className="flex">
					<button
						className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-12 text-center ml-auto p-1"
						onClick={(e) => {
							e.preventDefault();
							if (pageNumber > 1) setPageNumber(pageNumber - 1);
						}}
					>
						prev
					</button>
					<p className="bg-blue-600 text-white rounded-lg w-8 text-center mx-1 p-1">
						{pageNumber}
					</p>
					<button
						className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-12 text-center mr-auto p-1"
						onClick={(e) => {
							e.preventDefault();
							if (transactions.length != 0) setPageNumber(pageNumber + 1);
						}}
					>
						next
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex">
			<div className="bg-white p-1 rounded-2xl w-48">
				<h3 className="text-2xl font-bold mb-1 text-center">Filters</h3>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-gray-700 mb-1">Date</label>
						<div>
							<input
								type="text"
								name="dateStart"
								placeholder="mm/dd/yyyy"
								value={formData.dateStart}
								onChange={handleChange}
								className="w-full border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
							/>
							<p className="text-center mx-1">-</p>
							<input
								type="text"
								name="dateEnd"
								placeholder="mm/dd/yyyy"
								value={formData.dateEnd}
								onChange={handleChange}
								className="w-full border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
							/>
						</div>
					</div>
					<div>
						<label className="block text-gray-700 mb-1">Value</label>
						<div>
							<input
								type="text"
								name="valueStart"
								value={formData.valueStart}
								onChange={handleChange}
								className="w-full border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
							/>
							<p className="text-center mx-1">-</p>
							<input
								type="text"
								name="valueEnd"
								value={formData.valueEnd}
								onChange={handleChange}
								className="w-full border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
							/>
						</div>
					</div>
					<div>
						<label className="block text-gray-700 mb-1">Buyer name</label>
						<input
							type="text"
							name="buyerName"
							value={formData.buyerName}
							onChange={handleChange}
							className="w-full border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
						/>
					</div>
					<div>
						<label className="block text-gray-700 mb-1">Seller name</label>
						<input
							type="text"
							name="sellerName"
							value={formData.sellerName}
							onChange={handleChange}
							className="w-full border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
						/>
					</div>
					<button
						type="submit"
						className="w-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Filter
					</button>
				</form>
			</div>
			<Transactions filters={submitData} />
		</div>
	);
}

function SignUp() {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		phone: "",
		address: "",
		password: "",
	});
	const [error, setError] = useState("");

	if (cookieExists("token")) {
		return <Navigate to="/profile" />;
	}

	const navigate = useNavigate();
	function handleSubmit(e) {
		e.preventDefault();
		fetch(ENDPOINT_URL + "api/auth/signup", {
			method: "POST",
			headers: {
				"Content-type": "text/json",
			},
			body: JSON.stringify(formData),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.id != undefined) {
					localStorage.setItem("id", data.id);
					navigate("/profile");
				} else {
					setError(data.message);
				}
			})
			.catch((error) => console.error("Error signing up:", error));
	}

	function handleChange(e) {
		e.preventDefault();
		const { name, value } = e.target;
		setFormData((prevData) => ({
			...prevData,
			[name]: value,
		}));
	}

	return (
		<div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md mx-auto">
			<h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-gray-700 font-medium mb-1">Name</label>
					<input
						type="text"
						name="name"
						value={formData.name}
						onChange={handleChange}
						className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label className="block text-gray-700 font-medium mb-1">Email</label>
					<input
						type="text"
						name="email"
						value={formData.email}
						onChange={handleChange}
						className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label className="block text-gray-700 font-medium mb-1">Phone</label>
					<input
						type="text"
						name="phone"
						value={formData.phone}
						onChange={handleChange}
						className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label className="block text-gray-700 font-medium mb-1">
						Address
					</label>
					<input
						type="text"
						name="address"
						value={formData.address}
						onChange={handleChange}
						className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label className="block text-gray-700 font-medium mb-1">
						Password
					</label>
					<input
						type="password"
						name="password"
						value={formData.password}
						onChange={handleChange}
						className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<p className="text-1xl text-red-600 mb-3">{error}</p>
				<button
					type="submit"
					className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
				>
					Sign Up
				</button>
			</form>
			<button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors my-3">
				<Link className="mb-3" to="/auth/signin">
					Allready have an account?
				</Link>
			</button>
		</div>
	);
}

function SignIn() {
	const [formData, setFormData] = useState({ email: "", password: "" });
	const [error, setError] = useState("");

	if (cookieExists("token")) {
		return <Navigate to="/profile" />;
	}

	const navigate = useNavigate();
	async function handleSubmit(e) {
		e.preventDefault();
		fetch(ENDPOINT_URL + "api/auth/signin", {
			method: "POST",
			headers: {
				"Content-type": "text/json",
			},
			body: JSON.stringify(formData),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.id != undefined) {
					localStorage.setItem("id", data.id);
					navigate("/profile");
				} else {
					setError(data.message);
				}
			})
			.catch((error) => console.error("Error signing in:", error));
	}

	function handleChange(e) {
		e.preventDefault();
		const { name, value } = e.target;
		setFormData((prevData) => ({
			...prevData,
			[name]: value,
		}));
	}

	return (
		<div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md mx-auto h-screen">
			<h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-gray-700 font-medium mb-1">Email</label>
					<input
						type="text"
						name="email"
						value={formData.email}
						onChange={handleChange}
						className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label className="block text-gray-700 font-medium mb-1">
						Password
					</label>
					<input
						type="password"
						name="password"
						value={formData.password}
						onChange={handleChange}
						className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<p className="text-1xl text-red-600 mb-3">{error}</p>
				<button
					type="submit"
					className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
				>
					Sign In
				</button>
			</form>
			<button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors my-3">
				<Link className="mb-3" to="/auth/signup">
					Don't have an account?
				</Link>
			</button>
		</div>
	);
}

function Profile() {
	const navigate = useNavigate();

	if (!cookieExists("token")) {
		return <Navigate to="/auth/signin" />;
	}

	function BitSlow() {
		const [bitSlows, setBitSlows] = useState<BitSlowCoin[]>([]);
		const [loading, setLoading] = useState(true);
		const [error, setError] = useState("");
		const [loadingTime, setLoadingTime] = useState(0);

		useEffect(() => {
			async function fetchUserBitSlow() {
				try {
					const response = await fetch(
						ENDPOINT_URL +
							`api/profile/${Number(localStorage.getItem("id"))}/bitslows`,
					);
					const data = await response.json();
					if (response.status != 200) {
						setError(data.message);
						setLoading(false);
					} else {
						setBitSlows(data);
						setLoading(false);
					}
				} catch (error) {
					setError(error.message);
					setLoading(false);
				}
				if (!cookieExists("token")) navigate("/auth/signin");
			}
			fetchUserBitSlow();
		}, []);

		useEffect(() => {
			let timerId: number | undefined;

			if (loading) {
				timerId = window.setInterval(() => {
					setLoadingTime((prevTime) => prevTime + 1);
				}, 1000);
			}

			return () => {
				if (timerId) clearInterval(timerId);
			};
		}, [loading]);

		if (loading) {
			return (
				<div className="flex flex-col justify-center items-center h-screen bg-gray-50">
					<div className="w-16 h-16 mb-4 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
					<div className="animate-pulse flex flex-col items-center">
						<h2 className="text-xl font-semibold text-gray-700 mb-2">
							Loading BitSlow
						</h2>
						<p className="text-sm text-gray-600 mb-2">
							Time elapsed: {loadingTime} seconds
						</p>
						<div className="flex space-x-1">
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: "0ms" }}
							></div>
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: "150ms" }}
							></div>
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: "300ms" }}
							></div>
						</div>
					</div>
				</div>
			);
		}

		if (error) {
			return <div className="text-red-500 p-4 text-center">{error}</div>;
		}
		return (
			<div className="max-w-7xl mx-auto p-4">
				<h1 className="text-3xl font-bold mb-8 text-gray-800">BitSlow</h1>

				{bitSlows.length === 0 ? (
					<p className="text-gray-500">No BitSlow found</p>
				) : (
					<div className="overflow-x-auto rounded-lg shadow-md">
						<table className="w-full border-collapse bg-white">
							<thead>
								<tr className="bg-gray-800 text-white">
									<th className="p-4 text-left">BitSlow</th>
									<th className="p-4 text-left">Bits</th>
									<th className="p-4 text-center">Value</th>
								</tr>
							</thead>
							<tbody>
								{bitSlows.map((bitSlow, index) => (
									<tr
										key={bitSlow.computedBitSlow}
										className={`hover:bg-gray-50 transition-colors`}
									>
										<td className="p-4">
											<div className="font-medium text-gray-800">
												{bitSlow.computedBitSlow}
											</div>
										</td>
										<td className="p-4 text-gray-700">
											<div className="text-xs text-gray-500 mt-1">
												{bitSlow.bit1}, {bitSlow.bit2}, {bitSlow.bit3}
											</div>
										</td>
										<td className="p-4 text-gray-700">
											<div className="text-xs text-gray-500 text-center">
												${bitSlow.value.toLocaleString()}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<p className="mx-3 text2xl my-1 text-gray-800">
							Total bitSlow value: $
							{bitSlows
								.reduce((sum, item) => sum + item.value, 0)
								.toLocaleString()}{" "}
							in{" "}
							{bitSlows.length == 1 ? "one coin" : `${bitSlows.length} coins`}
						</p>
					</div>
				)}
			</div>
		);
	}

	function Transactions() {
		const [transactions, setTransactions] = useState<Transaction[]>([]);
		const [loading, setLoading] = useState(true);
		const [error, setError] = useState("");
		const [loadingTime, setLoadingTime] = useState(0);

		useEffect(() => {
			async function fetchUserTransactions() {
				try {
					const response = await fetch(
						ENDPOINT_URL +
							`api/profile/${Number(localStorage.getItem("id"))}/transactions`,
					);
					const data = await response.json();
					if (response.status != 200) {
						setError(data.message);
						setLoading(false);
					} else {
						setTransactions(data);
						setLoading(false);
					}
				} catch (error) {
					setError(error.message);
					setLoading(false);
				}
				if (!cookieExists("token")) navigate("/auth/signin");
			}
			fetchUserTransactions();
		}, []);

		useEffect(() => {
			let timerId: number | undefined;

			if (loading) {
				timerId = window.setInterval(() => {
					setLoadingTime((prevTime) => prevTime + 1);
				}, 1000);
			}

			return () => {
				if (timerId) clearInterval(timerId);
			};
		}, [loading]);

		if (loading) {
			return (
				<div className="flex flex-col justify-center items-center h-screen bg-gray-50">
					<div className="w-16 h-16 mb-4 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
					<div className="animate-pulse flex flex-col items-center">
						<h2 className="text-xl font-semibold text-gray-700 mb-2">
							Loading Transactions
						</h2>
						<p className="text-sm text-gray-600 mb-2">
							Time elapsed: {loadingTime} seconds
						</p>
						<div className="flex space-x-1">
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: "0ms" }}
							></div>
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: "150ms" }}
							></div>
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: "300ms" }}
							></div>
						</div>
					</div>
				</div>
			);
		}

		if (error) {
			return (
				<div className="text-red-500 p-4 text-center">
					Error loading Transactions: {error}
				</div>
			);
		}

		return (
			<div className="max-w-7xl mx-auto p-4">
				<h1 className="text-3xl font-bold mb-8 text-gray-800">
					BitSlow Transactions
				</h1>

				{transactions.length === 0 ? (
					<p className="text-gray-500">No transactions found</p>
				) : (
					<div className="overflow-x-auto rounded-lg shadow-md">
						<table className="w-full border-collapse bg-white">
							<thead>
								<tr className="bg-gray-800 text-white">
									<th className="p-4 text-left">ID</th>
									<th className="p-4 text-left">BitSlow</th>
									<th className="p-4 text-left">Seller</th>
									<th className="p-4 text-left">Buyer</th>
									<th className="p-4 text-right">Amount</th>
									<th className="p-4 text-left">Date</th>
								</tr>
							</thead>
							<tbody>
								{transactions.map((transaction, index) => (
									<tr
										key={transaction.id}
										className={`hover:bg-gray-50 transition-colors ${index === transactions.length - 1 ? "" : "border-b border-gray-200"}`}
									>
										<td className="p-4 text-gray-600">{transaction.id}</td>
										<td className="p-4">
											<div>
												<div className="font-medium text-gray-800">
													{transaction.computedBitSlow}
												</div>
												<div className="text-xs text-gray-500 mt-1">
													Bits: {transaction.bit1}, {transaction.bit2},{" "}
													{transaction.bit3}
												</div>
												<div className="text-xs text-gray-500">
													Value: ${transaction.value.toLocaleString()}
												</div>
											</div>
										</td>
										<td className="p-4 text-gray-700">
											{transaction.seller_name
												? transaction.seller_name
												: "Original Issuer"}
										</td>
										<td className="p-4 text-gray-700">
											{transaction.buyer_name}
										</td>
										<td className="p-4 text-right font-semibold text-gray-800">
											${transaction.amount.toLocaleString()}
										</td>
										<td className="p-4 text-sm text-gray-600">
											{new Date(transaction.transaction_date).toLocaleString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<p className="mx-3 text2xl my-1 text-gray-800">
							Total number of transactions: {transactions.length}
						</p>
					</div>
				)}
			</div>
		);
	}

	return (
		<div>
			<BitSlow />
			<Transactions />
		</div>
	);
}

function GenerateBitSlow() {
	const [value, setValue] = useState("");
	const [error, setError] = useState("");

	const navigate = useNavigate();

	if (!cookieExists("token")) {
		return <Navigate to="/auth/signin" />;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		const response = await fetch(ENDPOINT_URL + `api/bitslow/generate`, {
			method: "POST",
			body: JSON.stringify({ value: value }),
		});
		const body = await response.json();
		if (response.status != 200) {
			setError(body.message);
		} else {
			navigate("/profile");
		}
	}

	return (
		<div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md mx-auto">
			<h2 className="text-2xl font-bold mb-6 text-center">Generate BitSlow</h2>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-gray-700 font-medium mb-1">Value</label>
					<input
						type="text"
						name="email"
						value={value}
						onChange={(e) => {
							e.preventDefault();
							const { name, value } = e.target;
							setValue(value);
						}}
						className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<p className="text-1xl text-red-600 mb-3">{error}</p>
				<button
					type="submit"
					className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
				>
					Generate
				</button>
			</form>
		</div>
	);
}

function BitSlow() {
	const [bitSlows, setBitSlows] = useState<BitSlowCoin[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [loadingTime, setLoadingTime] = useState(0);
	const [pageNumber, setPageNumber] = useState(1);
	const [coinsPerPage, setCoinsPerPage] = useState(30);
	const navigate = useNavigate();

	if (!cookieExists("token")) {
		return <Navigate to="/auth/signin" />;
	}

	function BuyButton(props) {
		const [buyMessage, setBuyMessage] = useState("buy");
		async function buyBitSlow(id) {
			const response = await fetch(ENDPOINT_URL + `api/bitslow/${id}/buy`, {
				method: "PUT",
			});
			const body = await response.json();
			if (response.status != 200) {
				setError(body.message);
			} else {
				setBuyMessage(body.message);
			}
		}
		return (
			<button
				className="font-bold w-32 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
				onClick={(e) => {
					e.preventDefault();
					buyBitSlow(Number(props.id));
				}}
			>
				{buyMessage}
			</button>
		);
	}

	useEffect(() => {
		async function fetchUserBitSlow() {
			try {
				const response = await fetch(
					ENDPOINT_URL +
						`api/bitslows?${new URLSearchParams({
							indexStart: String((pageNumber - 1) * coinsPerPage),
							indexEnd: String(pageNumber * coinsPerPage),
						}).toString()}`,
				);
				const data = await response.json();
				if (response.status != 200) {
					setError(data.message);
					setLoading(false);
				} else {
					setBitSlows(data);
					setLoading(false);
				}
			} catch (error) {
				setError(error.message);
				setLoading(false);
			}
			if (!cookieExists("token")) navigate("/auth/signin");
		}
		fetchUserBitSlow();
	}, [pageNumber, coinsPerPage]);

	useEffect(() => {
		let timerId: number | undefined;

		if (loading) {
			timerId = window.setInterval(() => {
				setLoadingTime((prevTime) => prevTime + 1);
			}, 1000);
		}

		return () => {
			if (timerId) clearInterval(timerId);
		};
	}, [loading]);

	if (loading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-gray-50">
				<div className="w-16 h-16 mb-4 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
				<div className="animate-pulse flex flex-col items-center">
					<h2 className="text-xl font-semibold text-gray-700 mb-2">
						Loading BitSlow
					</h2>
					<p className="text-sm text-gray-600 mb-2">
						Time elapsed: {loadingTime} seconds
					</p>
					<div className="flex space-x-1">
						<div
							className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
							style={{ animationDelay: "0ms" }}
						></div>
						<div
							className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
							style={{ animationDelay: "150ms" }}
						></div>
						<div
							className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
							style={{ animationDelay: "300ms" }}
						></div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return <div className="text-red-500 p-4 text-center">{error}</div>;
	}
	return (
		<div className="max-w-7xl mx-auto p-4">
			<div className="mb-8 flex">
				<h1 className="text-3xl font-bold text-gray-800 max-w-fit">BitSlow</h1>
				<button className="mb-4 mx-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-32 text-center mr-auto p-1">
					<Link to="/generate">Generate coin</Link>
				</button>
				<span className="grid grid-cols-3 ml-auto gap-2">
					<p className="col-span-3">No. of BitSlow</p>
					<button
						className={`${coinsPerPage == 15 ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-lg`}
						onClick={(e) => {
							e.preventDefault();
							setCoinsPerPage(15);
						}}
					>
						15
					</button>
					<button
						className={`${coinsPerPage == 30 ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-lg`}
						onClick={(e) => {
							e.preventDefault();
							setCoinsPerPage(30);
						}}
					>
						30
					</button>
					<button
						className={`${coinsPerPage == 50 ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-lg`}
						onClick={(e) => {
							e.preventDefault();
							setCoinsPerPage(50);
						}}
					>
						50
					</button>
				</span>
			</div>

			{bitSlows.length === 0 ? (
				<p className="text-gray-500">No BitSlow found</p>
			) : (
				<div className="overflow-x-auto rounded-lg shadow-md">
					<table className="w-full border-collapse bg-white">
						<thead>
							<tr className="bg-gray-800 text-white">
								<th className="p-4 text-left">BitSlow</th>
								<th className="p-4 text-left">Bits</th>
								<th className="p-4 text-center">Value</th>
								<th className="p-4 text-center"></th>
							</tr>
						</thead>
						<tbody>
							{bitSlows.map((bitSlow, index) => (
								<tr
									key={bitSlow.coin_id}
									className={`hover:bg-gray-50 transition-colors`}
								>
									<td className="p-4">
										<div className="font-medium text-gray-800">
											{bitSlow.computedBitSlow}
										</div>
									</td>
									<td className="p-4 text-gray-700">
										<div className="text-xs text-gray-500 mt-1">
											{bitSlow.bit1}, {bitSlow.bit2}, {bitSlow.bit3}
										</div>
									</td>
									<td className="p-4 text-gray-700">
										<div className="text-xs text-gray-500 text-center">
											${bitSlow.value.toLocaleString()}
										</div>
									</td>
									<td className="p-4 text-gray-700">
										<div className="text-xs text-gray-500 text-center">
											<BuyButton id={bitSlow.coin_id.toString()} />
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			<div className="flex">
				<button
					className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-12 text-center ml-auto p-1"
					onClick={(e) => {
						e.preventDefault();
						if (pageNumber > 1) setPageNumber(pageNumber - 1);
					}}
				>
					prev
				</button>
				<p className="bg-blue-600 text-white rounded-lg w-8 text-center mx-1 p-1">
					{pageNumber}
				</p>
				<button
					className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-12 text-center mr-auto p-1"
					onClick={(e) => {
						e.preventDefault();
						if (bitSlows.length != 0) setPageNumber(pageNumber + 1);
					}}
				>
					next
				</button>
			</div>
		</div>
	);
}

function Layout() {
	function ProfileButton() {
		if (cookieExists("token")) {
			return <Link to="/profile">Profile</Link>;
		}
		return <Link to="/auth/signin">Sign In</Link>;
	}

	return (
		<>
			<nav className="bg-white w-screen flex p-2 h-16">
				<button className="mx-2 my-2 w-16 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
					<Link to="/">BitSlow</Link>
				</button>
				<button className="mx-2 my-2 w-16 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
					<Link to="/bitslow">Buy</Link>
				</button>
				<button className="ml-auto mr-4 my-2 w-16 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
					<ProfileButton />
				</button>
			</nav>

			<Outlet />
		</>
	);
}

export function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Layout />}>
					<Route index element={<Navigate to="dashboard" />} />
					<Route path="profile" element={<Profile />} />
					<Route path="dashboard" element={<Dashboard />} />
					<Route path="bitslow" element={<BitSlow />} />
				</Route>
				<Route path="/generate" element={<GenerateBitSlow />} />
				<Route path="/auth/signin" element={<SignIn />} />
				<Route path="/auth/signup" element={<SignUp />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
