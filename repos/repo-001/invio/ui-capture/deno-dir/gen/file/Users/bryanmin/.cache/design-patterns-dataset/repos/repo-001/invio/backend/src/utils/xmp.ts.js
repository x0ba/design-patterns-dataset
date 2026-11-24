export function generateZugferdXMP(fileName, conformanceLevel = "BASIC", version = "1.0") {
  // Minimal XMP template for ZUGFeRD / Factur-X
  // See: https://github.com/zugferd/zugferd-community/blob/master/ZUGFeRD-2.0/XMP%20Sample/ZUGFeRD-2.0-XMP.xml
  return `<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>${fileName}</fx:DocumentFileName>
      <fx:Version>${version}</fx:Version>
      <fx:ConformanceLevel>${conformanceLevel}</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL3V0aWxzL3htcC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVadWdmZXJkWE1QKFxuICBmaWxlTmFtZTogc3RyaW5nLFxuICBjb25mb3JtYW5jZUxldmVsID0gXCJCQVNJQ1wiLFxuICB2ZXJzaW9uID0gXCIxLjBcIixcbik6IHN0cmluZyB7XG4gIC8vIE1pbmltYWwgWE1QIHRlbXBsYXRlIGZvciBaVUdGZVJEIC8gRmFjdHVyLVhcbiAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20venVnZmVyZC96dWdmZXJkLWNvbW11bml0eS9ibG9iL21hc3Rlci9aVUdGZVJELTIuMC9YTVAlMjBTYW1wbGUvWlVHRmVSRC0yLjAtWE1QLnhtbFxuICBcbiAgcmV0dXJuIGA8P3hwYWNrZXQgYmVnaW49XCJcXHVmZWZmXCIgaWQ9XCJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWRcIj8+XG48eDp4bXBtZXRhIHhtbG5zOng9XCJhZG9iZTpuczptZXRhL1wiPlxuICA8cmRmOlJERiB4bWxuczpyZGY9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjXCI+XG4gICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9XCJcIiB4bWxuczpmeD1cInVybjpmYWN0dXIteDpwZGZhOkNyb3NzSW5kdXN0cnlEb2N1bWVudDppbnZvaWNlOjFwMCNcIj5cbiAgICAgIDxmeDpEb2N1bWVudFR5cGU+SU5WT0lDRTwvZng6RG9jdW1lbnRUeXBlPlxuICAgICAgPGZ4OkRvY3VtZW50RmlsZU5hbWU+JHtmaWxlTmFtZX08L2Z4OkRvY3VtZW50RmlsZU5hbWU+XG4gICAgICA8Zng6VmVyc2lvbj4ke3ZlcnNpb259PC9meDpWZXJzaW9uPlxuICAgICAgPGZ4OkNvbmZvcm1hbmNlTGV2ZWw+JHtjb25mb3JtYW5jZUxldmVsfTwvZng6Q29uZm9ybWFuY2VMZXZlbD5cbiAgICA8L3JkZjpEZXNjcmlwdGlvbj5cbiAgPC9yZGY6UkRGPlxuPC94OnhtcG1ldGE+XG48P3hwYWNrZXQgZW5kPVwid1wiPz5gO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sU0FBUyxtQkFDZCxRQUFnQixFQUNoQixtQkFBbUIsT0FBTyxFQUMxQixVQUFVLEtBQUs7RUFFZiw4Q0FBOEM7RUFDOUMsNkdBQTZHO0VBRTdHLE9BQU8sQ0FBQzs7Ozs7MkJBS2lCLEVBQUUsU0FBUztrQkFDcEIsRUFBRSxRQUFROzJCQUNELEVBQUUsaUJBQWlCOzs7O21CQUkzQixDQUFDO0FBQ3BCIn0=
// denoCacheMetadata=12682641963745297952,4729518850697747007