#!/bin/bash
git pull
rm cache.sqlite
jupyter nbconvert --to notebook --execute --inplace fetch.ipynb
git commit -am "auto update" --author="woolies-bot <ubuntu@api-proxy.auckland-cer.cloud.edu.au>"
git push