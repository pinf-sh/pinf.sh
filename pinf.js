
const SPAWN = require("child_process").spawn;


require('org.pinf.genesis.lib').forModule(require, module, function (API, exports) {

	var workspacePath = process.cwd();

	API.console.verbose("Running 'pinf.sh' for workspace:", workspacePath);


	function setupConfigFiles (callback) {

		var pinfDescriptor = JSON.parse(API.FS.readFileSync(API.PATH.join(workspacePath, "PINF.json"), "utf8"));

		if (pinfDescriptor["@schema"] !== "http://schema.pinf.sh/PINF.json/0") {
			return callback(new Error("'\"@schema\": \"http://schema.pinf.sh/PINF.json/0\"' not declared in descriptor: " + API.PATH.join(workspacePath, "PINF.json")));
		}

		function downloadRepos (callback) {

			var pinfOverrideDescriptor = {
				"@extends": {}
			};
			var packageOverrideDescriptor = {
				"mappings": {}
			};

			var repos = {};
			function checkUri (uri) {
				if (typeof uri !== "string") {
					return callback(new Error("Got object instead of uri: " + JSON.stringify(uri)));
				}
				var uriParts = API.URL.parse(uri);
				if (
					uriParts.protocol === "http:" ||
					uriParts.protocol === "https:"
				) {
					if (uriParts.host !== "github.com") {
						return callback(new Error("Only github URIs are currently supported!"));
					}
					var pathParts = uriParts.path.split("/");
					if (!pathParts[3]) {
						return callback(new Error("Only 'blob' URIs are currently supported! e.g. https://github.com/OpenGinseng/GinsengGenesisCore/blob/master/smi.json"));
					}
					var repoKey = uriParts.host + "~" + pathParts.slice(1,3).join("~") + "~" + pathParts[4];
					var repo = repos[repoKey];
					if (!repo) {
						repo = repos[repoKey] = {
							giturl: "git@github.com:" + pathParts.slice(1,3).join("/") + ".git",
							branch: pathParts[4],
							path: ".deps/" + uriParts.host + "~" + pathParts.slice(1,3).join("~") + "~0/source/installed/" + pathParts[4],
							uriPrefixes: {}
						};
						repo.uriPrefixes[uriParts.protocol + "//" + uriParts.host + "/" + pathParts.slice(1,5).join("/")] = true;
					}
					repo.localAlias = pathParts.slice(5).join("/");
					repo.localUri = "{{__DIRNAME__}}/.deps/github.com~" + pathParts.slice(1,3).join("~") + "~0/source/installed/" + pathParts[4] + "/" + pathParts.slice(5).join("/");
					return repo;
				}
			}
			if (pinfDescriptor["@extends"]) {
				Object.keys(pinfDescriptor["@extends"]).forEach(function (alias) {
					var repo = checkUri(pinfDescriptor["@extends"][alias]);
					if (repo) {
						pinfOverrideDescriptor["@extends"][alias] = repo.localUri;
					}
				});
			}
			process.argv.slice(2).forEach(function (uri) {
				var m = uri.match(/^(!)?(\/.+)$/);
				if (m) {
					if (API.FS.existsSync(m[2])) {
						pinfOverrideDescriptor["@extends"][m[2]] = m[2];
					} else {
						if (m[1] !== "!") {
							throw new Error("Path '" + m[2] + "' not found (prefix with '!' to make it optional)");
						}
					}
				} else {
					var repo = checkUri(uri);
					if (repo) {
						pinfOverrideDescriptor["@extends"][repo.localAlias] = repo.localUri;
					}
				}
			});

			Object.keys(repos).forEach(function (repoId) {
				packageOverrideDescriptor.mappings["{{__DIRNAME__}}/" + repos[repoId].path] = {
					"location": repos[repoId].giturl
				};
			});

			var pinfOverrideDescriptorPath = API.PATH.join(workspacePath, "PINF.local.json");
			API.FS.writeFileSync(pinfOverrideDescriptorPath, JSON.stringify(pinfOverrideDescriptor, null, 4), "utf8");

			var packageOverrideDescriptorPath = API.PATH.join(workspacePath, "package.local.json");
			API.FS.writeFileSync(packageOverrideDescriptorPath, JSON.stringify(packageOverrideDescriptor, null, 4), "utf8");


			var proc = SPAWN(API.PATH.join(__dirname, "node_modules/smi.cli/bin/smi"), [
		        "install",
		        "-vd"
		    ], {
		    	cwd: workspacePath
		    });
		    proc.on("error", function(err) {
		    	return callback(err);
		    });

		    proc.stdout.on('data', function (data) {
				if (API.VERBOSE) {
					process.stdout.write(data);
				}
		    });
		    proc.stderr.on('data', function (data) {
				if (API.VERBOSE) {
					process.stderr.write(data);
				}
		    });
		    proc.on('close', function (code) {
		    	if (code) {
		    		var err = new Error("Commands exited with code: " + code);
		    		err.code = code;
		    		return callback(err);
		    	}
		        return callback(null);
		    });
		}

		return downloadRepos(function (err) {
			if (err) return callback(err);

			return callback(null);
		});
	}


	return API.Q.denodeify(function (callback) {

		return setupConfigFiles(callback);
	})();

});

