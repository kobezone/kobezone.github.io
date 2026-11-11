#!/usr/bin/env python3
"""Sum raw uncompressed bytes for each vendored game.

Run from anywhere:

    python3 laotoule/games/vendor/measure.py

Counts every file under the game directory plus its hall wrapper.
Does not gzip, zip, or use the GitHub repository size.
Rewrites PROVENANCE.json next to this script with the measured totals.
"""
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
LAOTOULE = HERE.parents[1]
LIMIT = 500_000

GAMES = [
    {
        "id": "sublevel07",
        "name": "SUBLEVEL 07",
        "role": "named-request",
        "repo": "https://github.com/wquguru/fable52-fps-repro",
        "commit": "a7e1df3ce32eb2bb05e23ae457fe5fe2bffab961",
        "stars": 30,
        "stars_checked": "2026-11-11",
        "license": "MIT",
        "entry": "demos/04-fps/index.html",
        "deployed_entry": "games/vendor/sublevel07/index.html",
        "wrapper": "games/sublevel07.html",
        "roots": ["games/vendor/sublevel07", "games/sublevel07.html"],
        "touch": False,
        "note": "Single-file upstream game. Three.js 0.170.0 modules it imports are vendored. Import map points at those local files. Over 500000 bytes is the named-game exception.",
    },
    {
        "id": "isocity",
        "name": "IsoCity",
        "role": "additional",
        "repo": "https://github.com/victorqribeiro/isocity",
        "commit": "c5772412d3e423318f2cf479ebdd50a2b9029d84",
        "stars": 3264,
        "stars_checked": "2026-11-11",
        "license": "MIT code; texture CC0 (Kenney, OpenGameArt)",
        "entry": "index.html",
        "deployed_entry": "games/vendor/isocity/index.html",
        "wrapper": "games/isocity.html",
        "roots": ["games/vendor/isocity", "games/isocity.html"],
        "touch": True,
        "note": "screenshot.png from the repository is not deployed. Texture file is the one in the pinned commit.",
    },
    {
        "id": "underrun",
        "name": "UNDERRUN",
        "role": "additional",
        "repo": "https://github.com/phoboslab/underrun",
        "commit": "f933e29152d7fc1ca61d4b3eaa8b29551d7d7a62",
        "stars": 1113,
        "stars_checked": "2026-11-11",
        "license": "MIT; Sonant-X zlib notice kept in source/sonantx-reduced.js",
        "entry": "index-debug.html",
        "deployed_entry": "games/vendor/underrun/index-debug.html",
        "wrapper": "games/underrun.html",
        "roots": ["games/vendor/underrun", "games/underrun.html"],
        "touch": False,
        "note": "The minified js13k build is not in the upstream repository (build/dummy.txt only). This deploy is the committed playable page and the scripts it loads. build.sh was not run.",
    },
    {
        "id": "invaderz",
        "name": "InvaderZ",
        "role": "additional",
        "repo": "https://github.com/victorqribeiro/invaderz",
        "commit": "a3ac9574f7a1904fb74d7fdff22b9b2e7c94a310",
        "stars": 711,
        "stars_checked": "2026-11-11",
        "license": "MIT",
        "entry": "index.html",
        "deployed_entry": "games/vendor/invaderz/index.html",
        "wrapper": "games/invaderz.html",
        "roots": ["games/vendor/invaderz", "games/invaderz.html"],
        "touch": True,
        "note": "Removed obsolete appcache manifest and a service worker registration aimed at /invaderz/sw.js. sw.js itself is not deployed.",
    },
    {
        "id": "huejumper",
        "name": "Hue Jumper",
        "role": "additional",
        "repo": "https://github.com/KilledByAPixel/HueJumper2k",
        "commit": "0dc693f92812bf39e24964c83a7a28e03b604a54",
        "stars": 344,
        "stars_checked": "2026-11-11",
        "license": "GPL-3.0",
        "entry": "index.html",
        "deployed_entry": "games/vendor/huejumper/index.html",
        "wrapper": "games/huejumper.html",
        "roots": ["games/vendor/huejumper", "games/huejumper.html"],
        "touch": True,
        "note": "Enhanced single-file game. The 2KB golfed a.htm and screenshot.jpg are not deployed. GPL text is LICENSE.",
    },
    {
        "id": "pong",
        "name": "Pong",
        "role": "additional",
        "repo": "https://github.com/jakesgordon/javascript-pong",
        "commit": "ca3240536e4f79ab7144388e56ed19de715b6662",
        "stars": 222,
        "stars_checked": "2026-11-11",
        "license": "MIT",
        "entry": "index.html",
        "deployed_entry": "games/vendor/pong/index.html",
        "wrapper": "games/pong.html",
        "roots": ["games/vendor/pong", "games/pong.html"],
        "touch": False,
        "note": "Finished root game only. Tutorial folders part1-part5 are not deployed. Site-root tutorial links were pointed at the upstream repository.",
    },
]


def files_for(roots):
    found = []
    for rel in roots:
        path = LAOTOULE / rel
        if path.is_file():
            found.append(path)
        elif path.is_dir():
            for dirpath, dirnames, filenames in os.walk(path):
                dirnames.sort()
                for name in sorted(filenames):
                    found.append(Path(dirpath) / name)
        else:
            raise SystemExit(f"missing {path}")
    return found


def main():
    games = []
    for spec in GAMES:
        paths = files_for(spec["roots"])
        listing = []
        total = 0
        for path in paths:
            size = path.stat().st_size
            total += size
            listing.append({"path": str(path.relative_to(LAOTOULE)), "bytes": size})
        item = {k: spec[k] for k in spec if k != "roots"}
        item["bytes"] = total
        item["under_500000"] = total < LIMIT
        item["files"] = listing
        games.append(item)
        if item["under_500000"]:
            flag = "UNDER-500000"
        elif item["role"] == "named-request":
            flag = "NAMED-EXCEPTION"
        else:
            flag = "OVER"
        print(f"{item['id']:12} {total:10d}  {flag}")
    doc = {
        "checked": "2026-11-11",
        "what_this_is": "Popular eligible shortlist of finished HTML games that fit the rules. Not a worldwide definitive top-N.",
        "method": "Sum of os.stat().st_size for every deployed file of that game, including the hall wrapper, license, notices, HTML, JS, CSS, images, audio, and vendored dependencies. Raw bytes. Not gzip, not zip, not the GitHub repository size, not the HTML file alone.",
        "limit_bytes": LIMIT,
        "command": "python3 laotoule/games/vendor/measure.py",
        "games": games,
        "excluded": [
            {"repo": "https://github.com/nebez/floppybird", "stars": 600, "license": "Apache-2.0 on the repository", "reason": "Page loads analytics from https://yummy.nebez.dev/script.js. Footer credits original art to Dong Nguyen / dotgears, so the sprite rights are not clearly covered by the repository license."},
            {"repo": "https://github.com/dmcinnes/HTML5-Asteroids", "stars": 357, "license": "MIT on the code", "reason": "Runtime audio files use FreeSound-style names and the vector font is marked borrowed, with no license for those assets in the repository."},
            {"repo": "https://github.com/KilledByAPixel/SpaceHuggers", "stars": 289, "license": "GPL-3.0 metadata, README says not for redistribution", "reason": "README says the game is only for learning and is not intended to be redistributed. Permission is conflicting, so it was not copied."},
            {"repo": "https://github.com/Hextris/hextris", "stars": 2445, "license": "GPL-3.0 text in LICENSE.md", "reason": "Playable tree is about 1.5MB. The style directory alone is 1037869 bytes, over the 500000 byte cap."},
            {"repo": "https://github.com/iamkun/tower_game", "stars": 1619, "license": "MIT", "reason": "Assets directory is 1881177 bytes, including music, over the cap."},
            {"repo": "https://github.com/wayou/t-rex-runner", "stars": 2200, "license": "BSD-3-Clause", "reason": "Assets directory is 2429550 bytes, over the cap."},
            {"repo": "https://github.com/ellisonleao/clumsy-bird", "stars": 1634, "license": "GPL-3.0", "reason": "data directory is 3683549 bytes, over the cap."},
            {"repo": "https://github.com/jakesgordon/javascript-racer", "stars": 1179, "license": "MIT", "reason": "Music is 8165760 bytes and images are 642057 bytes, over the cap."},
            {"repo": "https://github.com/BKcore/HexGL", "stars": 1753, "license": "MIT", "reason": "Textures and audio are multiple megabytes, over the cap."},
            {"repo": "https://github.com/doublespeakgames/adarkroom", "stars": 8392, "license": "MPL-2.0", "reason": "Shipped audio and translations are far over the cap."},
            {"repo": "https://github.com/gabrielecirulli/2048", "stars": 13473, "license": "MIT", "reason": "Same 2048 rules as the hall game already named 2048."},
            {"repo": "https://github.com/jakesgordon/javascript-tetris", "stars": 736, "license": "MIT", "reason": "Same falling-block concept as the hall game 俄罗斯方块."},
            {"repo": "https://github.com/mumuy/pacman", "stars": 1645, "license": "MIT", "reason": "Same maze-chase concept as the hall game 吃豆豆."},
        ],
    }
    out = HERE / "PROVENANCE.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
    print("wrote", out)


if __name__ == "__main__":
    main()
