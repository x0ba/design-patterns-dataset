# Stub for the native sass-embedded gem (needs google-protobuf + dart-sass from rubygems,
# which is unreachable here). JKAN ships plain CSS, so no .scss/.sass file is ever converted.
module Sass
  class CompileError < StandardError; end
  def self.compile_string(*) = raise(NotImplementedError, "sass-embedded is stubbed in this setup")
end
