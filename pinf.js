
const SPAWN = require("child_process").spawn;


require('org.pinf.genesis.lib').forModule(require, module, function (API, exports) {

	const RESOLVE = API.RESOLVE.for(module);


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
				"mappings": {
					 "{{env.PGS_PACKAGES_DIRPATH}}/github.com~pinf~genesis.pinf.org~0/source/installed/master": {
			            "location": "git@github.com:pinf/genesis.pinf.org.git",
			            "install": false
			        }
				},
				"dependencies": {},
			    "config": {
			    	"smi.cli": {
				        "latestOnly": false,
			            "packagesDirectory": "{{env.PGS_WORKSPACE_ROOT}}/node_modules",
			            "binDirectory": "{{env.PGS_WORKSPACE_ROOT}}/node_modules/.bin"
				    }
			    }
			};

			var repos = {};
			function checkUri (uri) {
				if (typeof uri !== "string") {
					return null;
//					return callback(new Error("Got object instead of uri: " + JSON.stringify(uri)));
				}
				var uriParts = API.URL.parse(uri);
				if (
					uriParts.protocol === "http:" ||
					uriParts.protocol === "https:"
				) {
					if (uriParts.host !== "github.com") {
						throw new Error("Only github URIs are currently supported!");
					}
					var pathParts = uriParts.path.split("/");
					if (!pathParts[3]) {
						throw new Error("Only 'blob' URIs are currently supported! e.g. https://github.com/OpenGinseng/GinsengGenesisCore/blob/master/smi.json");
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
					repo.localUri = "{{env.PGS_PACKAGES_DIRPATH}}/github.com~" + pathParts.slice(1,3).join("~") + "~0/source/installed/" + pathParts[4] + "/" + pathParts.slice(5).join("/");
					repo.rawurl = "https://raw.githubusercontent.com/" + pathParts.slice(1,3).join("/") + "/master/" + pathParts.slice(5).join("/");
					return repo;
				}
			}
			if (pinfDescriptor["@extends"]) {
				Object.keys(pinfDescriptor["@extends"]).forEach(function (alias) {
					var repo = null;
					if (typeof pinfDescriptor["@extends"][alias].location === "string") {
						repo = checkUri(pinfDescriptor["@extends"][alias].location);
						if (repo) {
							repo.install = false;
							pinfOverrideDescriptor["@extends"][alias] = {
								location: repo.localUri
							};
						}
					} else
					if (typeof pinfDescriptor["@extends"][alias] === "string") {
						repo = checkUri(pinfDescriptor["@extends"][alias]);
						if (repo) {
							repo.install = false;
							pinfOverrideDescriptor["@extends"][alias] = repo.localUri;
						}
					}
				});
			}

			if (!API.FS.existsSync(API.PATH.join(workspacePath, "node_modules"))) {
				API.FS.mkdirSync(API.PATH.join(workspacePath, "node_modules"));
			}

			function processUriArgs (callback) {
				var waitfor = API.WAITFOR.serial(callback);
				process.argv.slice(2).forEach(function (uri) {
					waitfor(uri, function (uri, callback) {
						var m = uri.match(/^(!)?(\/.+)$/);
						if (m) {
							if (API.FS.existsSync(m[2])) {
								var path = API.FS.realpathSync(m[2]);
								pinfOverrideDescriptor["@extends"][path] = path;
								var descriptor = require(path);
								if (descriptor.dependencies) {
									for (var name in descriptor.dependencies) {
										if (!packageOverrideDescriptor.mappings[name]) {
											packageOverrideDescriptor.mappings[name] = {
												"location": "http://registry.npmjs.org/" + name + "/-/" + name + "-" + descriptor.dependencies[name] + ".tgz"
											};
										}
									}
								}
							} else {
								if (m[1] !== "!") {
									throw new Error("Path '" + m[2] + "' not found (prefix with '!' to make it optional)");
								}
							}
						} else {
							var repo = checkUri(uri);
							if (repo) {
								pinfOverrideDescriptor["@extends"][repo.localAlias] = repo.localUri;
								API.console.verbose("Fetch:", repo.rawurl);
								return API.REQUEST(repo.rawurl, function (err, response, body) {
									if (err) return callback(null);
									var descriptor = JSON.parse(body);
									if (descriptor.dependencies) {
										for (var name in descriptor.dependencies) {
											packageOverrideDescriptor.dependencies[name] = descriptor.dependencies[name];
										}
									}
									if (descriptor.mappings) {
										for (var name in descriptor.mappings) {
											if (descriptor.mappings[name].alias) {

												if (!API.FS.existsSync(API.PATH.join(workspacePath, "node_modules", descriptor.mappings[name].alias))) {

													API.FS.symlinkSync(
														name.replace(/^\{\{env\.PGS_PACKAGES_DIRPATH\}\}/, "../.deps"),
														API.PATH.join(workspacePath, "node_modules", descriptor.mappings[name].alias)
													);
												}
											}
										}
									}
									return callback(null);
								});
							}
						}
						return callback(null);
					});
				});
				return waitfor();
			}


			// POLICY: Terminology: 'override' -> deep updates existing properties only
			// POLICY: Terminology: 'overlay' -> deep merges all new properties on top
			function overrideGlobalPackages () {

				var matches = API.JSONPATH({
					json: pinfOverrideDescriptor,
					path: "$..location",
					resultType: 'all'
				});
				if (matches.length > 0) {
					matches.forEach(function (match) {
						var resolvedPath = RESOLVE.uri(match.value, {
							scope: RESOLVE.SCOPE.SYSTEMS
						}).toPath();
						if (!resolvedPath) return;
						API.console.verbose("Found mapping location '" + match.value + "' at local path '" + resolvedPath + "'");
						match.parent[match.parentProperty] = resolvedPath;
					});
				}

				Object.keys(packageOverrideDescriptor.mappings).forEach(function (alias) {
					var resolvedPath = RESOLVE.uri(alias, {
						scope: RESOLVE.SCOPE.SYSTEMS
					}).toPath();
					if (!resolvedPath) return;
					API.console.verbose("Found mapping location '" + alias + "' at local path '" + resolvedPath + "'");
					packageOverrideDescriptor.mappings[alias].location = resolvedPath
				});

				return API.Q.resolve();
			}

			return processUriArgs(function (err) {
				if (err) return callback(err);

				Object.keys(repos).forEach(function (repoId) {
					packageOverrideDescriptor.mappings["{{__DIRNAME__}}/" + repos[repoId].path] = {
						"location": repos[repoId].giturl,
						"install": (repos[repoId].install === false)? false : true
					};
				});

				return overrideGlobalPackages().then(function () {

					var pinfOverrideDescriptorPath = API.PATH.join(workspacePath, "PINF.local.json");
					API.FS.writeFileSync(pinfOverrideDescriptorPath, JSON.stringify(pinfOverrideDescriptor, null, 4), "utf8");

					var packageOverrideDescriptorPath = API.PATH.join(workspacePath, "package.local.json");
					API.FS.writeFileSync(packageOverrideDescriptorPath, JSON.stringify(packageOverrideDescriptor, null, 4), "utf8");

console.log("pinfOverrideDescriptor", pinfOverrideDescriptorPath, pinfOverrideDescriptor);
console.log("packageOverrideDescriptor", packageOverrideDescriptorPath, packageOverrideDescriptor);

process.exit(1);

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
				});
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

