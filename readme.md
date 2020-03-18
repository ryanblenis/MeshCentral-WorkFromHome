# MeshCentral-WorkFromHome

RDP Mapping plugin for the [MeshCentral2](https://github.com/Ylianst/MeshCentral) Project.

## Installation

 Pre-requisite: First, make sure you have plugins enabled for your MeshCentral installation by adding this to the settings section of your './meshcentral/meshcentral-data/config.json' file:
>     "plugins": {
>          "enabled": true
>     },
Restart your MeshCentral server after making this change.

 To install, simply add the plugin configuration URL when prompted:
 `https://raw.githubusercontent.com/ryanblenis/MeshCentral-WorkFromHome/master/config.json`

## Features
- Set a user's "Work" PC as an option in the "Home" PC to create an RDP link via MeshCentral to the "Work" PC.

## Usage Notes
- This was created in a couple hours to help with the "work from home" rush the Coronavirus (COVID-19) is starting. There may be bugs.
- Currently supports Windows clients only (and macOS as the "Home" computer)
- A file is placed on the computer "Work_Computer.rdp" that links to the chosen work computer.
- While a similar outcome can be achieved from the the RoutePlus plugin. This requires no user access to MeshCentral. Administrators control the users RDP endpoint and a file is created for them on their desktop.
