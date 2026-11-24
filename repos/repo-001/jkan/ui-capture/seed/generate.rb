# Seeds a JKAN source tree with City of Westbrook data, the same way the Decap
# CMS editor would: one markdown file with YAML front matter per dataset and
# organization in _datasets/ and _organizations/.
#   usage: ruby generate.rb <jekyll-source-dir>
require "yaml"
require "fileutils"
require_relative "organizations"
require_relative "datasets"

dest = ARGV.fetch(0)
GROUP_EMAILS = {
  "GIS Services Group" => "gis@westbrook.gov", "Accounts Payable Unit" => "ap@westbrook.gov",
  "Procurement Department" => "procurement@westbrook.gov", "WPD Crime Analysis Unit" => "wpd.crimeanalysis@westbrook.gov",
  "Vision Zero Program" => "visionzero@westbrook.gov", "Urban Forestry Unit" => "trees@westbrook.gov",
  "Historical Commission" => "historical.commission@westbrook.gov", "Board of Ethics" => "ethics@westbrook.gov",
  "Westbrook Wheels" => "data@westbrookwheels.com", "Epidemiology Program" => "epi@westbrook.gov",
  "Environmental Health Services" => "ehs@westbrook.gov", "Office of Homeless Services" => "ohs.data@westbrook.gov",
  "WRT Scheduling" => "gtfs@wrtransit.org", "WRT Developer Relations" => "developers@wrtransit.org",
  "Digital Services Team" => "digital@westbrook.gov", "Housing & Community Development" => "dhcd@westbrook.gov",
  "Westbrook Water Department GIS" => "water.gis@westbrook.gov", "Planning Research Unit" => "planning.research@westbrook.gov",
}

# Replace the sample content that ships with a fresh JKAN install.
%w[_datasets _organizations].each do |dir|
  FileUtils.rm_rf(File.join(dest, dir))
  FileUtils.mkdir_p(File.join(dest, dir))
end
FileUtils.mkdir_p(File.join(dest, "img/organizations"))

def write_doc(path, front, body = "")
  File.write(path, front.to_yaml(line_width: -1) + "---\n" + body)
end

ORGANIZATIONS.each do |slug, title, abbr, color, desc|
  svg = <<~SVG
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="28" fill="#{color}"/>
      <circle cx="120" cy="120" r="92" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="6"/>
      <text x="120" y="#{abbr.length > 3 ? 136 : 140}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="#{abbr.length > 3 ? 46 : 58}" fill="#ffffff">#{abbr.gsub("&", "&amp;")}</text>
      <text x="120" y="186" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="15" letter-spacing="3" fill="#ffffff" fill-opacity="0.8">WESTBROOK</text>
    </svg>
  SVG
  File.write(File.join(dest, "img/organizations/#{slug}.svg"), svg)
  write_doc(File.join(dest, "_organizations/#{slug}.md"),
            {"title" => title, "description" => desc, "logo" => "/img/organizations/#{slug}.svg"})
end

DATASETS.each do |d|
  fm = {"schema" => "westbrook", "title" => d[:title], "organization" => d[:org], "notes" => d[:notes]}
  fm["resources"] = d[:res].map do |x|
    h = {"name" => x[:name], "url" => x[:url]}
    h["format"] = x[:fmt] if x[:fmt]
    h["description"] = x[:desc] if x[:desc]
    h
  end
  lic = LIC.fetch(d[:lic])
  fm["license"] = lic unless lic.empty?
  fm["category"] = d[:cats] unless d[:cats].empty?
  if (m = d[:maint])
    fm["maintainer"] = m
    email = GROUP_EMAILS[m] || (m =~ /\A[A-Z][a-z]+( [A-Z][a-z]+)+\z/ ? m.downcase.split.then { |p| "#{p.first}.#{p.last}@westbrook.gov" } : nil)
    fm["maintainer_email"] = email if email
  end
  fm["update_frequency"] = d[:freq] if d[:freq]
  fm["temporal"] = d[:period] if d[:period]
  fm["modified"] = d[:modified] if d[:modified]
  write_doc(File.join(dest, "_datasets/#{d[:slug]}.md"), fm)
end

# Schema customization (docs/schema-customization.md): the default fields plus
# Project Open Data's modified / accrualPeriodicity / temporal.
schema = YAML.load_file(File.join(dest, "_data/schemas/default.yml"))
schema["dataset_fields"] += [
  {"field_name" => "modified", "label" => "Last Updated", "datajson" => "modified"},
  {"field_name" => "update_frequency", "label" => "Update Frequency", "datajson" => "accrualPeriodicity"},
  {"field_name" => "temporal", "label" => "Time Period", "datajson" => "temporal"},
]
schema["resource_fields"].find { |f| f["field_name"] == "format" }["values"] |= %w[pdf xlsx]
File.write(File.join(dest, "_data/schemas/westbrook.yml"),
           "# City of Westbrook schema: default fields + update metadata\n" + schema.to_yaml(line_width: -1).sub(/\A---\n/, ""))

puts "seeded #{ORGANIZATIONS.size} organizations, #{DATASETS.size} datasets, " \
     "#{DATASETS.sum { _1[:res].size }} resources"
