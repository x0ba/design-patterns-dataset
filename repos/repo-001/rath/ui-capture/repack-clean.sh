#!/bin/sh
# Re-pack the sanitized mirror tarballs as plain ustar (no macOS xattrs/pax headers),
# which yarn 1's tar extractor needs, then refresh their yarn.lock hash + integrity.
set -e
cd "$(dirname "$0")/.."
for f in serialize-javascript-4.0.0.tgz concurrently-4.1.2.tgz iconv-lite-0.6.3.tgz; do
  t=$(mktemp -d "${TMPDIR:-/tmp}/rp.XXXX")
  tar xzf .ui-capture/vendor/$f -C "$t"
  ( cd "$t" && COPYFILE_DISABLE=1 tar --format ustar --no-xattrs --no-mac-metadata --no-acls --uid 0 --gid 0 -czf "$OLDPWD/.ui-capture/vendor/$f" package )
  rm -rf "$t"
  sha1=$(shasum -a 1 .ui-capture/vendor/$f | cut -d' ' -f1)
  sri="sha512-$(openssl dgst -sha512 -binary .ui-capture/vendor/$f | base64)"
  F="$f" SHA1="$sha1" SRI="$sri" perl -0pi -e 's#(/\Q$ENV{F}\E)\#[0-9a-f]+"\n(\s+)integrity \S+#$1\#$ENV{SHA1}"\n$2integrity $ENV{SRI}#g' yarn.lock
  echo "$f $sha1"
done
