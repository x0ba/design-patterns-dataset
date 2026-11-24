# Runs Jekyll from the GitHub source checkouts in ./vendor (see fetch-gems.sh)
# instead of gems installed by Bundler.
here = __dir__
$LOAD_PATH.unshift File.join(here, "stubs")
Dir[File.join(here, "vendor", "*")].sort.each do |dir|
  lib = File.join(dir, "lib")
  lib = File.join(lib, "concurrent-ruby") if File.basename(dir) == "concurrent-ruby"
  $LOAD_PATH.unshift lib if File.directory?(lib)
end
ENV["JEKYLL_NO_BUNDLER_REQUIRE"] = "true"
require "jekyll"

# Stub for the GitHub API (jekyll-github-metadata): there is no network here, so
# report "offline" and let the plugin derive site.github.* from PAGES_REPO_NWO.
require "jekyll-github-metadata"
Jekyll::GitHubMetadata::Client.class_eval do
  def internet_connected? = false
end
ENV["PAGES_REPO_NWO"] ||= "timwis/jkan"
load File.join(here, "vendor", "jekyll", "exe", "jekyll")
