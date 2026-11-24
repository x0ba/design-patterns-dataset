#!/usr/bin/env bash
# rubygems.org is unreachable in this sandbox, so the pure-Ruby gems from
# Gemfile.lock are fetched as source tarballs from GitHub at the locked versions.
set -u
cd "$(dirname "$0")/vendor"
while read -r name repo tag; do
  [ -z "$name" ] && continue
  [ -d "$name" ] && continue
  mkdir -p "$name"
  tgz="../cache/$name.tgz"; mkdir -p ../cache
  if curl -sfL --retry 3 -o "$tgz" "https://codeload.github.com/$repo/tar.gz/refs/tags/$tag" \
     && tar xzf "$tgz" -C "$name" --strip-components=1 && [ -n "$(ls "$name")" ]; then
    echo "ok   $name $tag"
  else
    echo "FAIL $name $repo $tag"; rm -rf "$name"
  fi
  rm -f "$tgz"
done <<'LIST'
addressable sporkmonger/addressable addressable-2.9.0
public_suffix weppos/publicsuffix-ruby v7.0.5
colorator octopress/colorator v1.1.0
concurrent-ruby ruby-concurrency/concurrent-ruby v1.3.8
i18n ruby-i18n/i18n v1.15.2
jekyll jekyll/jekyll v4.4.1
jekyll-sass-converter jekyll/jekyll-sass-converter v3.1.0
kramdown gettalong/kramdown REL_2_5_2
kramdown-parser-gfm kramdown/parser-gfm REL_1_1_0
liquid Shopify/liquid v4.0.4
mercenary jekyll/mercenary v0.4.0
pathutil envygeeks/pathutil v0.16.2
forwardable-extended envygeeks/forwardable-extended v2.6.0
rouge rouge-ruby/rouge v4.7.0
safe_yaml dtao/safe_yaml 1.0.5
terminal-table tj/terminal-table v3.0.2
unicode-display_width janlelis/unicode-display_width v2.6.0
webrick ruby/webrick v1.9.2
jekyll-github-metadata jekyll/github-metadata v2.16.1
octokit octokit/octokit.rb v6.1.1
sawyer lostisland/sawyer v0.9.3
faraday lostisland/faraday v2.14.3
faraday-net_http lostisland/faraday-net_http v3.4.4
jekyll-paginate-v2 sverrirs/jekyll-paginate-v2 v3.0.0
jekyll-relative-links benbalter/jekyll-relative-links v0.8.0
jekyll-titles-from-headings benbalter/jekyll-titles-from-headings v0.5.4
jekyll-sitemap jekyll/jekyll-sitemap v1.4.0
LIST
