(function(global) {
	var currentReplay = null;

	function filename_from_path(path) {
		var parts = String(path || '').split(/[\\/]/);
		var filename = parts[parts.length - 1] || 'replay.rep';
		return /\.rep$/i.test(filename) ? filename : 'replay.rep';
	}

	function filename_from_url(url) {
		try {
			var parsed = new global.URL(url, global.location.href);
			return filename_from_path(decodeURIComponent(parsed.pathname));
		} catch (error) {
			return filename_from_path(String(url || '').split(/[?#]/)[0]);
		}
	}

	function set_source(data, filename) {
		currentReplay = data == null ? null : {
			data: data,
			filename: filename_from_path(filename)
		};
	}

	function download_current() {
		if (!currentReplay) return false;
		var url = global.URL.createObjectURL(new global.Blob([currentReplay.data], {
			type: 'application/octet-stream'
		}));
		var link = global.document.createElement('a');
		link.href = url;
		link.download = currentReplay.filename;
		link.style.display = 'none';
		global.document.body.appendChild(link);
		link.click();
		link.remove();
		global.setTimeout(function() {
			global.URL.revokeObjectURL(url);
		}, 0);
		return true;
	}

	global.ReplayDownload = {
		downloadCurrent: download_current,
		filenameFromPath: filename_from_path,
		filenameFromUrl: filename_from_url,
		setSource: set_source
	};
})(window);
