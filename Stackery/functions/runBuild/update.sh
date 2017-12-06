#!/bin/bash
set -x
set -e 

token=$1
cdnUrl=$2
postUrl=$3

curl --user "stack-bot:$token" -H "Content-Type: application/json" --request POST --data '{"body": "Build preview: \n '"$cdnUrl"'"}' $postUrl