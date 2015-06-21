#!/bin/bash
# Source https://github.com/cadorn/bash.origin
. "$HOME/.bash.origin"
function init {
	eval BO_SELF_BASH_SOURCE="$BO_READ_SELF_BASH_SOURCE"
	BO_deriveSelfDir ___TMP___ "$BO_SELF_BASH_SOURCE"
	local __BO_DIR__="$___TMP___"


	function provisionAndInstallHarness {

		BO_format "$VERBOSE" "HEADER" "Provisioning and installing pinf.sh harness"

		BO_run_node "$__BO_DIR__/pinf.js" $@

		BO_format "$VERBOSE" "FOOTER"
	}

	function ensurePGS {

		BO_format "$VERBOSE" "HEADER" "Ensuring PINF.Genesis is provisioned"

		export BO_PLUGIN_SEARCH_DIRPATHS="$__BO_DIR__/node_modules"

		if [ ! -e ".pgs/.provisioned" ]; then
			BO_callPlugin "bash.origin.pinf@0.1.8" ensure genesis $@
		fi

		BO_format "$VERBOSE" "FOOTER"
	}

	function turnOnce {

		BO_format "$VERBOSE" "HEADER" "Turning system once"

		export PIO_PROFILE_PATH="$__BO_DIR__/empty.profile.json"

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