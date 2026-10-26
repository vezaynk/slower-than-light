# LTA: Lighter Than Air

Lighter Than Air is a runtime and mod loader implementing the [FTL: Hyperspace](https://ftl-hyperspace.github.io/FTL-Hyperspace/en/) API on the web as a universal platform.

This is a fundementally different approach to all the other clean-room implementations as its primarily goal is mod compatibility rather than gameplay fidelity.

# Why?

The primary objective of LTA is to bring [FTL: Multiverse](https://www.subsetgames.com/forum/viewtopic.php?t=35332) to all platforms with a focus on mobile.

# What Works?

- [x] Runtime fully implemented

The runtime is fully functional. All event types, stores, weapons, enemies, ships, systems, crew quirks, etc, are fully supported.

- [x] Complete play-through of original FTL campaign

The gameplay loop is fully proven. The base game works today.

# What's in Progress?

- [ ] Development of TotallyNotFTL

`totallynotftl.dat` is a module developed as part of this project which produces a file similar to the real `ftl.dat` but without any copyrighted materials. It is meant to be a technically functional drop-in replacement for `ftl.dat`.

Ideally, its implementation will become compliant enough that the real FTL game will be able to run it.

- [ ] Full Hyperspace Compatibility

Hyperspace is almost there. We're missing the Lua API coverage for the moment.

# What's next?

- [ ] LTA: Lighter Than Air

Currently, the project is on track to ship with two modes of play: via `ftl.dat` (real FTL campaign, requiring uploading a game file) and `totallynoftl.dat` (which is entirely devoid of polish).

I would like to ship a new campaign as part of this project with a real story, fresh assets, new mechanics and so on, so that LTA has something to offer out of the box.

My vision is a steampunk re-imagination of FTL with airships. TBD!

- [ ] FTL: Multiverse

FTL: Multiverse has not yet been tested or played on the LTA engine.

- [ ] Publishing Android and iOS builds

I'm having issues with my iOS developer account and it's blocking me from publishing. I have an Google Play account but no Android device test on.

Until I resolve either, it's going to be the web build only.

- [ ] Rich controller support

In addition to lacking mobile support, FTL also lacks controller support. LTA will implement both, and more!
