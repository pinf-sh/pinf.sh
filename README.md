**Status: DEV**

pinf.sh
=======

A command-line tool that will read `pinf.json` Semantic Web orchestration files, download and install mapped resources and boot the condensed system with a given profile.


Use Cases
=========

PINF.Genesis
------------

A quick and easy way to boot [PINF.Genesis](https://github.com/pinf/genesis.pinf.org) based systems from a URI or `PINF.json` file.

A `pinf.sh` facilitated startup sequence consists of several phases:

  1) Download `PINF.json` from URI if specified
  2) Install system
  3) Load system config using `PINF.json` and apply optional specified *profile*
  4) Trigger system boot using derived config
  5) Run a deamon process to execute cli and other tooling calls for the system so it does not have to run its own process if it conatins purely abstract code. This process also acts as a gateway to expose the system for discovery by external services.


Usage
-----

	nvm use 0.10
	npm install

	./pinf.sh [URI [URI ...]]


Example
-------

	cd MyGinsengGenesisCore

Boot an instance of [Ginseng Genesis Core](https://github.com/OpenGinseng/GinsengGenesisCore) using a profile from [VirtualCloud.io](http://VirtualCloud.io):

	./pinf.sh \
		https://github.com/OpenGinseng/GinsengGenesisCore \
		http://VirtualCloud.IO

Boot the instance again using the now locally provisioned system and profile file:

	./pinf.sh

Boot the instance one more time using a custom profile file:

	./pinf.sh \
		file://path/to/profile.json


TODO
----

  * Full JSON-schema enforcement
  * JSON LD plugin

