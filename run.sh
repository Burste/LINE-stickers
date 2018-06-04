#!/bin/bash

while true; do
	clear
	date
	log=logs/log_`date '+%m-%d_%H-%M-%S'`
	node . #\
#		> >(tee -a $log) \
#		2> >(tee -a $log.err >&2)
	for _ in {1..3}; do
		echo -e "CRASHED\x07"
		sleep 1
	done
	sleep 2
done
