#!/bin/bash
# Source https://github.com/cadorn/bash.origin
. "$HOME/.bash.origin"
function init {
	eval BO_SELF_BASH_SOURCE="$BO_READ_SELF_BASH_SOURCE"
	BO_deriveSelfDir ___TMP___ "$BO_SELF_BASH_SOURCE"
	local __BO_DIR__="$___TMP___"


	if [ -f "$__BO_DIR__/node_modules/bash.origin" ]; then
		# Use OUR Bash.Origin script from now on (even to handle the install if the previously
		# installed version supports delegation).
		export BO_ROOT_SCRIPT_PATH="$__BO_DIR__/node_modules/bash.origin/bash.origin"
		"$BO_ROOT_SCRIPT_PATH" BO install -f > /dev/null
		. "$BO_ROOT_SCRIPT_PATH"
	fi


	function provisionAndInstallHarness {

		BO_format "$VERBOSE" "HEADER" "Provisioning and installing pinf.sh harness"

		export PGS_WORKSPACE_ROOT="$(pwd)"
		export PGS_PACKAGES_DIRPATH="$PGS_WORKSPACE_ROOT/.deps"

		BO_log "$VERBOSE" "Using PGS_WORKSPACE_ROOT: $PGS_WORKSPACE_ROOT"
		BO_log "$VERBOSE" "Using PGS_PACKAGES_DIRPATH: $PGS_PACKAGES_DIRPATH"

		BO_run_node "$__BO_DIR__/pinf.js" $@

		BO_format "$VERBOSE" "FOOTER"
	}

	function ensurePGS {

		BO_format "$VERBOSE" "HEADER" "Ensuring PINF.Genesis is provisioned"

		export BO_PLUGIN_SEARCH_DIRPATHS="$__BO_DIR__/node_modules"

		BO_log "$VERBOSE" "Using BO_PLUGIN_SEARCH_DIRPATHS: $BO_PLUGIN_SEARCH_DIRPATHS"

		if [ ! -e ".pgs/.provisioned" ]; then
			BO_callPlugin "bash.origin.pinf@0.1.8" ensure genesis $@
		fi

		BO_format "$VERBOSE" "FOOTER"
	}

	function turnOnce {

		BO_format "$VERBOSE" "HEADER" "Turning system once"

		export PIO_PROFILE_PATH="$__BO_DIR__/empty.profile.json"

		BO_log "$VERBOSE" "Using PIO_PROFILE_PATH: $PIO_PROFILE_PATH"

		# TODO: Turn to base local setup only.
		./boot turn $@

		BO_format "$VERBOSE" "FOOTER"
	}

	function welcome {

		BO_format "$VERBOSE" "HEADER" "All Done! Welcome."
		BO_log "1" ""
		BO_log "1" "To get started run:"
		BO_log "1" ""
		BO_log "1" "  source bin/activate.sh"
		BO_log "1" ""
		BO_format "$VERBOSE" "FOOTER"

	}

	provisionAndInstallHarness $@
	ensurePGS $@
	turnOnce $@
	welcome $@

}
init $@