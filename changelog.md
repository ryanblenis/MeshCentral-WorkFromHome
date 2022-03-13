# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Known Issues]
- None. Please feel free to submit an issue via [GitHub](https://github.com/ryanblenis/MeshCentral-WorkFromHome) if you find anything.

## [0.1.2] - 2022-03-12
### Fixed
- Compatibility with MeshCentral => 0.9.98 (promise requirement removed from MeshCentral, nedb moved to @yetzt/nedb)

## [0.1.1] - 2021-10-07
### Fixed
- Compatibility with MeshCentral > 0.9.7

## [0.1.0] - 2020-05-19
### Added
- Ability to rename RDP file
- Ability to add multiple work computers
- AzureAD connection compatibility (for computers with MS ID's used for login)
### Changed
- Default RDP file name from "Work_Computer" to "WFH-CompName"
### Fixed
- Missing icons for RasPi and VM device types

## [0.0.5] - 2020-03-24
### Fixed
- Better checking of existing connection before tearing down and rebuilding a tunnel

## [0.0.4] - 2020-03-22
### Fixed
- Fix re-instantiating tunnel multiple times on agent checkin / clear core actions causing tunnel to rebuild itself and change ports more than required (Issue #2)

## [0.0.3] - 2020-03-19
### Fixed
- Display of larger amount of meshes / nodes selection overrunning the text area. (Issue #1)

## [0.0.2] - 2020-03-18
### Added
- Support for macOS as the "home" system. RDP Shortcut is placed on the currently active users desktop.

## [0.0.1] - 2020-03-16
### Added
- Released initial version
