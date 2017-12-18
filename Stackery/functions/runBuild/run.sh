#!/bin/bash
set -x
set -e 

repo=$1
branch=$2
prNumber=$3
localRepoDir=$4

echo 'localRepoDir: ' $localRepoDir ', repo: ' $repo ', branch: ' $branch ', pr: ' $prNumber 

cd $localRepoDir

git 'init'

git remote add origin $repo

git fetch origin $branch

git reset --hard FETCH_HEAD 

npm install --no-progress --loglevel=error --cache '/tmp/npm' --userconfig '/tmp/npmrc'

npm run build
