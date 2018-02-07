#!/usr/bin/env bash

[ "${TRAVIS_OS}" = "osx" ] && ( npm run build-mac && mv distribution/Multis{,-${TRAVIS_TAG}}.dmg )
[ "${TRAVIS_OS}" = "linux" ] && ( npm run build-linux && mv distribution/Multis{,-${TRAVIS_TAG}}.deb )

exit 0
