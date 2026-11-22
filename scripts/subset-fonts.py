"""Builds the site's Fraunces files from the full variable font.

Usage (needs fonttools and brotli: pip install fonttools brotli):
    python scripts/subset-fonts.py path/to/Fraunces.ttf public/fonts/fraunces

The source is Fraunces[SOFT,WONK,opsz,wght] (Cadence/Shared/Fonts/Fraunces.ttf).
"""
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

src, out_dir = sys.argv[1], sys.argv[2]

# Google Fonts' "latin" range: covers everything the site's text uses.
LATIN = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
    "U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
)


def save_subset(font, unicodes, flavor, path):
    options = subset.Options()
    options.flavor = flavor
    options.name_IDs = ["*"]  # keep the copyright and licence records (OFL)
    options.name_languages = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(unicodes))
    subsetter.subset(font)
    font.flavor = flavor
    font.save(path)


# 1) The page font (CSS), Latin only, WOFF2. The site always uses SOFT 100 and
#    WONK 1, so those are fixed; optical size and weight stay variable.
font = instancer.instantiateVariableFont(TTFont(src), {"SOFT": 100, "WONK": 1})
save_subset(font, LATIN, "woff2", f"{out_dir}/fraunces-latin.woff2")

# 2) Text drawn in the 3D scenes (diagram labels, the goniometer's degree
#    pill). troika can't read WOFF2 or variations, so this is a WOFF of the
#    font's default instance, which is what troika drew from the full file.
font = TTFont(src)
static = instancer.instantiateVariableFont(font, {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes})
save_subset(static, LATIN, "woff", f"{out_dir}/fraunces-3d.woff")
