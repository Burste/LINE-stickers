#!/bin/bash

while true; do
	clear
	date
	node . \
		|tee logs/log_`date '+%m-%d_%H-%M-%S'`
	for _ in {1..3}; do
		echo -e "CRASHED\x07"
		sleep 1
	done
	sleep 2
done
