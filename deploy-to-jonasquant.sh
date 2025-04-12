#!/bin/bash
echo "Deploying to jonasquant.com..."
git checkout -b temp-deploy
git checkout main -- index.html script.js styles.css
git add index.html script.js styles.css
git commit -m "Update website content"
git push jonasquant temp-deploy:main -f
git checkout main
git branch -D temp-deploy
echo "Deployment complete! Changes should be live in a few minutes." 