window.OPENBW_MPQ_BASE_URL = window.OPENBW_MPQ_BASE_URL || (
	(window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost")
		? "/bw"
		: "/mpqs"
);
