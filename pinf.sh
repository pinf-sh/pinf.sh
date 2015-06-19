#!/bin/bash
# Source https://github.com/cadorn/bash.origin
. "$HOME/.bash.origin"
function init {
	eval BO_SELF_BASH_SOURCE="$BO_READ_SELF_BASH_SOURCE"
	BO_deriveSelfDir ___TMP___ "$BO_SELF_BASH_SOURCE"
	local __BO_DIR__="$___TMP___"


	BO_run_node "$__BO_DIR__/pinf.js" $@

	if [ ! -e ".pgs/.provisioned" ]; then
		BO_callPlugin "bash.origin.pinf@0.1.7" ensure genesis $@
	fi

}
init $@