#!/bin/sh

env=$1

version="1.0.9"
buildName=stealth-${version}
buildDir=Build/${buildName}

cd ../

mkdir -p Build

if [ "$env" = release ]; then

    echo "Update filters"
    curl -s -o 'Extension/filters/groups.xml' 'https://adtidy.org/get-groups.html'
    curl -s -o 'Extension/filters/filters.xml' 'https://adtidy.org/get-filters.html'
    curl -s -o 'Extension/filters/filter_3.txt' 'https://chrome.adtidy.org/getfilter.html?filterid=3&key=4DDBE80A3DA94D819A00523252FB6380'
    curl -s -o 'Extension/filters/filter_4.txt' 'https://chrome.adtidy.org/getfilter.html?filterid=4&key=4DDBE80A3DA94D819A00523252FB6380'

fi

echo "Delete previous build"
rm -rf ${buildDir}

echo "Create build directory"
mkdir -p ${buildDir}

echo "Copy build files"
rsync -a --exclude 'pages/less' --exclude 'pages/node_modules' --exclude 'pages/Gruntfile.js' --exclude 'pages/package.json' --exclude 'tests' Extension/ ${buildDir}/

echo "Update manifest.json"
sed -i '' "s/STEALTH_VERSION/$version/" ${buildDir}/manifest.json

if [ "$env" = release ]; then

    #zip build
    zip -r Build/$buildName.zip  ${buildDir}

    #pack crx
    source Scripts/crxmake.sh ${buildDir} Scripts/certificate.pem
    mv $buildDir/$buildName.crx Build
    rm -rf $buildDir

fi

