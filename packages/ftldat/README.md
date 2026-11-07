# @stl/ftldat

This package reads and writes FTL's two archive containers:

- **`.dat`**: the PKG archive FTL 1.6 ships as `ftl.dat`.
- **`.ftl` / `.zip`**: a Slipstream mod.

Both read into the same path map (`FtlExtract`): XML documents, other text, and binary assets.

## PKG format (`src/pkg.ts`)

All numbers are big-endian.

| Offset | Size | Field               |
| ------ | ---- | ------------------- |
| 0      | 4    | Signature `PKG\n`   |
| 4      | 2    | Header size (16)    |
| 6      | 2    | Index row size (20) |
| 8      | 4    | Row count           |
| 12     | 4    | Path table size     |

Each 20-byte index row holds:

| Offset | Size | Field                                              |
| ------ | ---- | -------------------------------------------------- |
| 0      | 4    | Path hash                                          |
| 4      | 4    | Path offset in the table; bit 24 marks a zlib body |
| 8      | 4    | Body offset                                        |
| 12     | 4    | Stored size                                        |
| 16     | 4    | Unpacked size                                      |

The NUL-terminated path table follows the index, then the bodies.

FTL opens a file by binary-searching the index for the path hash, so the rows must be sorted by it. The hash
is SIL's:

1. Fold `A`–`Z` to lower case.
2. For each character, rotate the hash right by 5 bits and XOR in the character.

Every row of ftl.dat 1.6.13 matches this hash. `pkgPathHash` computes it, and `writePkg` writes it and sorts the
rows. A dat with wrong hashes still reads here, but the real game cannot find any of its files. `readPkg`
ignores the hash.

`writePkg` stores every body uncompressed. `readPkg` also inflates zlib bodies.
