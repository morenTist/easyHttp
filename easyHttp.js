class EasyHttp {
	constructor(options = {}) {
		this.init(options);
	}

	init(options) {
		this.baseURL = null;
		this.baseHeaders = {};
		this.defAsync = true;
		this.validRequests = ["get", "post", "put", "delete"];
		this.baseHeaders = {
			"Content-type": "application/w-xxx-form-urlencoded",
		};

		this.initOptions(options);
	}
	isValidMethod(method) {
		method = method?.trim?.()?.toLowerCase?.();
		const isContains = this.validRequests.includes(method);
		return { status: isContains, data: method };
	}
	initOptions({ defAsync, baseURL, baseHeaders } = {}) {
		// check if it's url or no

		// setting base url if passed
		if (this.isURL(baseURL)) {
			this.baseURL = new URL(baseURL).toString();
		}

		// check if income headers are object

		if (
			baseHeaders &&
			typeof baseHeaders === "object" &&
			!Array.isArray(baseHeaders)&&({}).constructor ===
				baseHeaders.constructor
		) {
			Object.assign(this.baseHeaders, baseHeaders);
		}

		if (defAsync != null) {
			this.defAsync = !!defAsync;
		}
	}
	isURL(url) {
		let isValidURL;
		try {
			isValidURL = new URL(url)?.host;
			isValidURL = !!isValidURL;
		} catch (e) {
			isValidURL = !1;
		}
		return isValidURL;
	}
	convertStrHeaders(strHeaders = "") {
		// Convert the header string into an array
		// of individual headers
		const arr = strHeaders.trim().split(/[\r\n]+/);

		// Create a map of header names to values
		const headerMap = {};
		arr.forEach(function (line) {
			const parts = line.split(": ");
			const header = parts.shift();
			const value = parts.join(": ");
			headerMap[header] = value;
		});
		return headerMap;
	}

	urlHandler(url) {
		// validate url
		if (this.isURL(url)) {
			url = url;
		} else if (this.baseURL) {
			url = url ? this.baseURL.replace(/\/+$/gi,"") + "/"+ url.replace(/^\/+/gi,"") : this.baseURL;
		} else {
			return {
				status: false,
				data: "the url is not valid for get reqeust",
			};
		}
		return { status: true, data: url };
	}
	headerHandler(headers) {
		// assign the headers
		if (
			headers &&
			typeof headers === "object" &&
			!Array.isArray(headers) &&
			{}.constructor === headers.constructor
		) {
			Object.assign(this.baseHeaders, headers);
		} else {
			headers = this.baseHeaders;
		}
		return { status: true, data: headers };
	}

	headerAdder(req, headers) {
		const handledHeaders = this.headerHandler(headers);

		// assign the headers
		if (!handledHeaders.status || !req) {
			return handledHeaders;
		}
		headers = handledHeaders.data;
		// headerAdder
		// set the headers
		Object.keys(headers).forEach(function (key) {
			const val = headers[key];
			if (!val?.trim?.()) return;
			req?.setRequestHeader?.(key, val);
		});
		return { status: true, data: "headers added on success" };
	}
	convertIfJSON(data) {
		let lastRes ;
		try {
			lastRes = JSON.parse(data);
		} catch {
			lastRes = data;
		}
		return lastRes;
	}
	onrequestEnd(error, req) {
		error = error;
		const isError = !!error;

		// convert to JSON if convertable
		const data = this.convertIfJSON(req.responseText);

		const headers = this.convertStrHeaders(req.getAllResponseHeaders());

		return {
			status: !error,
			data: {
				error,
				data,
				headers,
				statusCode: req.status,
				req,
			},
		};
	}

	request(
		method = "GET",
		url,
		{ data = {}, headers, timeout = 0, isAsync, query = {} },
		handler
	) {
		return new Promise((res, rej) => {
			const handledURL = this.urlHandler(url);

			if (!handledURL.status) {
				return rej(handledURL);
			}

			// it means url is valid
			url = handledURL.data;

			const handledHeaders = this.headerHandler(headers);

			// assign the headers
			if (!handledHeaders.status) {
				return rej(handledHeaders);
			}
			headers = handledHeaders.data;

			// create request
			const req = new XMLHttpRequest();

			isAsync = !!(isAsync ?? this.defAsync);

			// check if valid method

			const isValidMethod = this.isValidMethod(method);
			if (!isValidMethod.status) {
				return rej(isValidMethod);
			}
			method = isValidMethod.data;

			// handle query

			// handler Data
			const handledQuery = this.getRequestDataHandler(url, query);

			if (!handledQuery.status) {
				handledQuery.data += " in getting query";
				return rej(handledQuery);
			}
			url = handledQuery.data;

			// handler Data
			const handledData = handler(url, data, headers);

			if (!handledData.status) {
				return rej(handledData);
			}

			// it means data is valid and attached to url
			if (method == "get") {
				url = handledData.data;
			} else {
				data = handledData.data;
			}

			// open the request
			req.open(method.toUpperCase(), url, isAsync);

			// set timout
			if (timeout && Number.isSafeInteger(timeout)) {
				xhr.timeout = +timeout * 1000;
			}

			// add headers
			this.headerAdder(req, headers);

			req.onload = () => {
				// send succes
				res(this.onrequestEnd(null, req));
			};

			req.error = (e) => {
				// send error

				res(this.onrequestEnd(e, req));
			};

			// send Reqeuest
			req.send(method != "get" && data ? data : null);

			// validate data to send
		});
	}
	get commonParsers() {
		const parsers = {
			xform: (data) => {
				if (
					!(
						data &&
						typeof data === "object" &&
						!Array.isArray(data) &&
						{}.constructor === data.constructor
					)
				) {
					return { status: false, data: "bad data type sent xform" };
				}
				const lastRes = { status: true, data: null };

				if (!Object.keys(data).length) {
					return lastRes;
				}
				lastRes.data = [];
				Object.keys(data).forEach((key) => {
					let val = data[key];
					if (
						!(
							val &&
							typeof val === "object" &&
							!Array.isArray(val) &&
							{}.constructor === val.constructor
						)
					) {
						val = JSON.stringify(val);
					} else {
						val = String(val);
					}
					data = encodeURIComponent(val);
					lastRes.data.push(`${key}=${val}`);
				});

				lastRes.data = lastRes.data.join("&");

				return lastRes;
			},
			formData: (data) => {
				if (
					!(
						data &&
						typeof data === "object" &&
						!Array.isArray(data) &&
						{}.constructor === data.constructor
					)
				) {
					return {
						status: false,
						data: "bad data type sent formData",
					};
				}
				const lastRes = { status: true, data: null };
				if (!Object.keys(data).length) {
					return lastRes;
				}
				const formData = new FormData();
				Object.keys(data).forEach((key) => {
					const val = data[key];
					if (
						!(
							val &&
							typeof val === "object" &&
							!Array.isArray(val) &&
							{}.constructor === val.constructor
						)
					) {
						val = JSON.stringify(val);
					} else {
						val = String(val);
					}
					formData.set(key, value);
				});

				lastRes.data = formData;
				return lastRes;
			},
			json: (data) => {
				if (
					!(
						data &&
						typeof data === "object" &&
						!Array.isArray(data) &&
						{}.constructor === data.constructor
					)
				) {
					return { status: false, data: "bad data type sent json" };
				}
				const lastRes = { status: true, data: null };

				lastRes.data = JSON.stringify(data);

				return lastRes;
			},
		};
		return parsers;
	}

	getRequestDataHandler(url, data) {
		const handledURL = this.urlHandler(url);
		if (!handledURL.status) {
			return handledURL;
		}
		url = handledURL.data;

		// get data to Send
		const parsedURl = new URL(url);
		// assign the data

		if (
			data &&
			typeof data === "object" &&
			!Array.isArray(data) &&
			{}.constructor === data.constructor
		) {
			Object.keys(data).forEach(function (key) {
				const val = data[key];
				parsedURl.searchParams.append(key, val);
			});
		} else {
			data = {};
		}
		url = parsedURl.toString();
		return {status:true,data:url}
	}
	postRequestDataHandler(url, data, headers) {
		const headerContentType = headers["Content-type"]
			?.trim?.()
			?.toLowerCase?.();
		const parser = this.commonParsers;
		let lastRes = { status: false, data: null };
		switch (true) {
			case headerContentType.includes("x-www-form-urlencoded"):
				lastRes = parser.xform(data);
				break;
			case headerContentType.includes("form-data"):
				lastRes = parser.formData(data);
				break;
			case headerContentType.includes("json"):
				lastRes = parser.json(data);
				break;
			default:
				lastRes = parser.xform(data);
				break;
		}

		return lastRes;
	}
	putRequestDataHandler(url, data, headers) {
		const headerContentType = headers["Content-type"]
			?.trim?.()
			?.toLowerCase?.();
		const parser = this.commonParsers;

		let lastRes = { status: false, data: null };
		switch (true) {
			case headerContentType.includes("x-www-form-urlencoded"):
				lastRes = parser.xform(data);
				break;
			case headerContentType.includes("form-data"):
				lastRes = parser.formData(data);
				break;
			case headerContentType.includes("json"):
				lastRes = parser.json(data);
				break;
			default:
				lastRes = parser.xform(data);
				break;
		}
		return lastRes;
	}
	deleteRequestDataHandler(url, data, headers) {
		const headerContentType = headers["Content-type"]
			?.trim?.()
			?.toLowerCase?.();
		const parser = this.commonParsers;

		let lastRes = { status: false, data: null };
		switch (true) {
			case headerContentType.includes("x-www-form-urlencoded"):
				lastRes = parser.xform(data);
				break;
			case headerContentType.includes("form-data"):
				lastRes = parser.formData(data);
				break;
			case headerContentType.includes("json"):
				lastRes = parser.json(data);
				break;
			default:
				lastRes = parser.xform(data);
				break;
		}
		return lastRes;
	}
	// if the syntac propble or opiton proble will send rejct otherwise will send resolve
	get(url, options = {}) {
		return new Promise(async (res, rej) => {
			try {
				res(
					await this.request(
						"GET",
						url,
						options,
						this.getRequestDataHandler.bind(this)
					)
				);
			} catch (e) {
				rej(e);
			}
		});
	}
	post(url, options = {}) {
		return new Promise(async (res, rej) => {
			try {
				res(
					await this.request(
						"POST",
						url,
						options,
						this.postRequestDataHandler.bind(this)
					)
				);
			} catch (e) {
				rej(e);
			}
		});
	}
	put(url, options = {}) {
		return new Promise(async (res, rej) => {
			try {
				res(
					await this.request(
						"PUT",
						url,
						options,
						this.putRequestDataHandler.bind(this)
					)
				);
			} catch (e) {
				rej(e);
			}
		});
	}
	delete(url, options = {}) {
		return new Promise(async (res, rej) => {
			try {
				res(
					await this.request(
						"DELETE",
						url,
						options,
						this.deleteRequestDataHandler.bind(this)
					)
				);
			} catch (e) {
				console.error(e);
				rej(e);
			}
		});
	}
}
