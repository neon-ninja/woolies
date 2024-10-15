#!/bin/bash
git pull
jupyter nbconvert --to notebook --execute --inplace fetch.ipynb
git commit -am "auto update" --author="woolies-bot"
git push