#!/bin/bash
# Source https://github.com/cadorn/bash.origin
. "$HOME/.bash.origin"
function init {
	eval BO_SELF_BASH_SOURCE="$BO_READ_SELF_BASH_SOURCE"
	BO_deriveSelfDir ___TMP___ "$BO_SELF_BASH_SOURCE"
	local __BO_DIR__="$___TMP___"


	BO_run_node "$__BO_DIR__/pinf.js" $@


	BO_run_npm install --production


	if [ ! -e ".pgs/.provisioned" ]; then
		BO_callPlugin "bash.origin.pinf@0.1.8" ensure genesis $@
	fi

	export PIO_PROFILE_PATH="$__BO_DIR__/empty.profile.json"

	./boot turn $@

}
init $@